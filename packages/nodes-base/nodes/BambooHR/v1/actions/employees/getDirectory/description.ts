import {
  EmployeesProperties,
} from '../../Interfaces';

export const employeesGetDirectoryDescription: EmployeesProperties = [
  {
    displayName: 'Company Name',
    name: 'companyName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'getDirectory'
        ],
        resource: [
          'employees',
        ],
      },
    },
    default: '',
    description: 'Company name',
  },
];
