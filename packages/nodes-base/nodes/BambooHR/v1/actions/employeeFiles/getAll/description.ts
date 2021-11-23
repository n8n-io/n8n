import {
  EmployeeFilesProperties,
} from '../../Interfaces';

export const employeeFilesGetAllDescription: EmployeeFilesProperties = [
  {
    displayName: 'Employee ID',
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
    description: 'ID of the employee',
  },
];
