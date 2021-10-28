import {
  EmployeeFilesProperties,
} from '../../Interfaces';

export const employeeFilesCreateDescription: EmployeeFilesProperties = [
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
          'employeeFiles',
        ],
      },
    },
    default: '',
    description: 'Company name',
  },
  
  {
    displayName: 'Category Name',
    name: 'categoryName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'create'
        ],
        resource: [
          'employeeFiles',
        ],
      },
    },
    default: '',
    description: 'Name of the new employee file category',
  },
];
