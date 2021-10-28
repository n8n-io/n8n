import {
  EmployeeFilesProperties,
} from '../../Interfaces';

export const employeeFilesGetAllDescription: EmployeeFilesProperties = [
  {
    displayName: 'Company Name',
    name: 'companyName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'getAll'
        ],
        resource: [
          'employeeFiles',
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
          'getAll',
        ],
        resource: [
          'employeeFiles',
        ],
      },
    },
    default: '',
    description: 'Id of the employee',
  },
];
