import {
  EmployeeFilesProperties,
} from '../../Interfaces';

export const employeeFilesDelDescription: EmployeeFilesProperties = [
  {
    displayName: 'Company Name',
    name: 'companyName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'del'
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
          'del'
        ],
        resource: [
          'employeeFiles',
        ],
      },
    },
    default: '',
    description: 'Id of the employee',
  },
  {
    displayName: 'File Id',
    name: 'fileId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'del'
        ],
        resource: [
          'employeeFiles',
        ],
      },
    },
    default: '',
    description: 'ID of the employee file',
  },
];
