import {
  EmployeesProperties,
} from '../../Interfaces';

export const employeesUpdateDescription: EmployeesProperties = [
  {
    displayName: 'Company Name',
    name: 'companyName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'update'
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
          'update',
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
    displayName: 'First Name',
    name: 'firstName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'update'
        ],
        resource: [
          'employees',
        ],
      },
    },
    default: '',
    description: 'First name of the employee',
  },
  {
    displayName: 'Last Name',
    name: 'lastName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'update'
        ],
        resource: [
          'employees',
        ],
      },
    },
    default: '',
    description: 'Last name of the employee',
  },
];
