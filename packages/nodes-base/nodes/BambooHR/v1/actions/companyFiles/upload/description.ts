import {
  EmployeesProperties,
} from '../../Interfaces';

export const employeesCreateDescription: EmployeesProperties = [
  {
    displayName: 'Company Name',
    name: 'companyName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'create'
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
    displayName: 'First Name',
    name: 'firstName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'create'
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
          'create'
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
