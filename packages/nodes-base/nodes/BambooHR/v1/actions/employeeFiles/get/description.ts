import {
  EmployeeFilesProperties,
} from '../../Interfaces';

export const employeeFilesGetDescription: EmployeeFilesProperties = [
  {
    displayName: 'Employee ID',
    name: 'id',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'get',
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
          'get'
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
