import {
  EmployeeFilesProperties,
} from '../../Interfaces';

export const employeeFilesDelDescription: EmployeeFilesProperties = [
  {
    displayName: 'Employee ID',
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
    description: 'ID of the employee',
  },
  {
    displayName: 'File ID',
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
