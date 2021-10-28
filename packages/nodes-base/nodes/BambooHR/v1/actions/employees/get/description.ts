import {
  EmployeesProperties,
} from '../../Interfaces';

export const employeesGetDescription: EmployeesProperties = [
  {
    displayName: 'Company Name',
    name: 'companyName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'get'
        ],
        resource: [
          'employees',
        ],
      },
    },
    default: '',
    description: 'Company name',
  },
  {
    displayName: 'Id',
    name: 'id',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'get',
        ],
        resource: [
          'employees',
        ],
      },
    },
    default: '',
    description: 'Id of the employee',
  },
  {
    displayName: 'Fields',
    name: 'fields',
    type: 'string',
    required: false,
    displayOptions: {
      show: {
        operation: [
          'get',
        ],
        resource: [
          'employees',
        ],
      },
    },
    default: 'displayName,firstName,lastName,preferredName,jobTitle,workPhone,mobilePhone,workEmail,department,location,division,facebook,linkedIn,twitterFeed,pronouns,workPhoneExtension,supervisor,photoUrl',
    description: 'Set of fields to get from employee data, separated by coma',
  },
];
