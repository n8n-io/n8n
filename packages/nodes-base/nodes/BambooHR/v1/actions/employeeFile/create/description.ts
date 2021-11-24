import {
  EmployeeFileProperties,
} from '../../Interfaces';

export const employeeFileCreateDescription: EmployeeFileProperties = [
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
          'employeeFile',
        ],
      },
    },
    default: '',
    description: 'Name of the new employee file category',
  },
];
