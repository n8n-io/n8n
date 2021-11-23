import {
  EmployeesProperties,
} from '../../Interfaces';

export const employeesUpdateDescription: EmployeesProperties = [
  {
    displayName: 'Employee ID',
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
  {
    displayName: 'Additional Fields',
    name: 'additionalFields',
    type: 'collection',
    placeholder: 'Add Field',
    default: {},
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
    options: [
      {
        displayName: 'Display Name',
        name: 'displayName',
        type: 'string',
        default: '',
        description: 'Display Name',
      },
      {
        displayName: 'Preferred Name',
        name: 'preferredName',
        type: 'string',
        default: '',
        description: 'Preferred Name',
      },
      {
        displayName: 'Work Phone',
        name: 'workPhone',
        type: 'string',
        default: '',
        description: 'Work Phone',
      },
      {
        displayName: 'Mobile Phone',
        name: 'mobilePhone',
        type: 'string',
        default: '',
        description: 'Mobile Phone',
      }
    ],
  },
];
