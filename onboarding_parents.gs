// Settings
var domainName = 'hammarotassen.se'
var personellGroupName = 'personal'
var childNamedValues = {
  name: 'Barnets namn'
}
var parentOneNamedValues = {
  name: 'Första förälderns namn',
  email: 'Första förälderns e-post',
  address: 'Första förälderns adress',
  phone: 'Första förälderns telefonnummer'
}
var parentTwoNamedValues = {
  name: 'Andra förälderns namn',
  email: 'Andra förälderns e-post',
  address: 'Andra förälderns adress',
  phone: 'Andra förälderns telefonnummer'
}

// Globals
var emailExtension = '@' + domainName
var personellGroupEmail = 'personal' + emailExtension
var parentsGroupEmail = 'foraldrar' + emailExtension

// Entrypoint
function onFormSubmit(e) {
  var child ={
    name: e.namedValues[childNamedValues.name][0].toString()
  };
  drive = createChildDrive_(child.name);
  addChildCalendar_(child.name);
  
  var parents = [getParentFromForm_(e, parentOneNamedValues), getParentFromForm_(e, parentTwoNamedValues)];
  parents.forEach(function (parent){
    createUser_(parent);
    createUserContact_(parent, child.name);
    addUserToParentGroup_(parent.primaryEmail);
    setChildTeamDrivePermissions_(drive.id, parent.primaryEmail);
  });
}

function getParentFromForm_(e, parentNamedValues) {
  var parent = {
    fullName: e.namedValues[parentNamedValues.name][0],
    slugName: e.namedValues[parentNamedValues.name][0].toString().toLowerCase().replace(/\b\s\b/g, '.'),
    primaryEmail: e.namedValues[parentNamedValues.name][0].toString().toLowerCase().replace(/\b\s\b/g, '.') + emailExtension,
    givenName: e.namedValues[parentNamedValues.name][0].toString().split(" ")[0],
    familyName: e.namedValues[parentNamedValues.name][0].toString().split(" ")[1],
    email: e.namedValues[parentNamedValues.email][0].toString(),
    address: e.namedValues[parentNamedValues.address][0].toString(),
    phone: e.namedValues[parentNamedValues.phone][0].toString()
  }
  return parent;
}
    
function createUser_(user) {
  var newUser = {
    primaryEmail: user.primaryEmail,
    name: {
      givenName: user.givenName,
      familyName: user.familyName
    },
    // Generate a random password string.
    password: Math.random().toString(36)
  };
  var createdUser = AdminDirectory.Users.insert(newUser);
  Logger.log('User %s created with ID %s.', createdUser.primaryEmail, createdUser.id);
}

function createUserContact_(user, childsName) {
  var contact = ContactsApp.createContact(user.givenName, user.familyName, user.primaryEmail);
  contact.addEmail(ContactsApp.Field.WORK_EMAIL, user.email)
  contact.addAddress(ContactsApp.Field.HOME_ADDRESS, user.address)
  contact.addPhone(ContactsApp.Field.HOME_PHONE, user.phone)
  contact.addCustomField(ContactsApp.ExtendedField.OTHER, 'Förälder till ' + childsName);
  Logger.log('Contact %s created with ID %s.', contact.getFullName(), contact.getId());
}

function addUserToParentGroup_(userEmail) {
  var member = {
    email: userEmail,
    role: 'MEMBER'
  };
  member = AdminDirectory.Members.insert(member, parentsGroupEmail);
  Logger.log('User %s added as a member of group %s.', userEmail, parentsGroupEmail);
}

function createChildDrive_(childsName, user) {
  var pageToken;
  var drives;
  var childDrive;
  do{
    drives = Drive.Drives.list({pageToken:pageToken,maxResults:50,useDomainAdminAccess:true})
    for (var i = 0; i < drives.items.length; i++) {
      if (drives.items[i].name == childsName) {
        childDrive = drives.items[i];
        Logger.log('Found existing drive %s (ID : %s)', childDrive.name, childDrive.id);
      }
    }
    pageToken = drives.nextPageToken
  }while(pageToken)

  if (!childDrive) {
    childDrive = Drive.Drives.insert({name: childsName}, Utilities.getUuid())
    Logger.log('Created new drive %s (ID : %s)', childDrive.name, childDrive.id);
  }
  return childDrive;
}

function setChildTeamDrivePermissions_(id, userPrimaryEmail){
  var resources = [
    {
      role: "organizer",
      type: "user",
      value: userPrimaryEmail
    },
    {
      role: "organizer",
      type: "group",
      value: personellGroupEmail
    }
  ];
  
  resources.forEach(function (resource){
  Drive.Permissions.insert(resource, 
                           id, 
                           {sendNotificationEmails:false,
                            supportsAllDrives:true,
                            useDomainAdminAccess:false });
  });
}


function addChildCalendar_(childsName) {
  var calendars = CalendarApp.getCalendarsByName('US Holidays');
  if (calendars.length > 0) {
    Logger.log('Found %s matching calendars.', calendars.length);
  } else {
    var calendar = CalendarApp.createCalendar(childsName, {
      summary: 'Planeringskalender för ' + childsName,
      color: CalendarApp.Color.TURQOISE
    });
    Logger.log('Created the calendar "%s", with the ID "%s".', calendar.getName(), calendar.getId());
  }
}

function test() {
  var e = {
    namedValues: {
      'Barnets namn': ['Testbarn Testefternamn'],
      'Första förälderns namn': ['Testpappa Testefternamn'],
      'Första förälderns e-post': ['testpappa.testefternamn@example.com'],
      'Första förälderns adress': ['Testvägen 1, 123456 Teststad'],
      'Första förälderns telefonnummer': ['0123456789'],
      'Andra förälderns namn': ['Testmamma Testefternamn'],
      'Andra förälderns e-post': ['testmamma.testefternamn@example.com'],
      'Andra förälderns adress': ['Testvägen 2, 123456 Teststad'],
      'Andra förälderns telefonnummer': ['0123456798']
    }
  };
  onFormSubmit(e);
}

