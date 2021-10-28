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
];
