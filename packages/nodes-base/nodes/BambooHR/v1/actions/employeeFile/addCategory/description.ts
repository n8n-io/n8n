import {
	EmployeeFileProperties,
} from '../../Interfaces';

export const employeeFileAddCategoryDescription: EmployeeFileProperties = [
	{
		displayName: 'Category Name',
		name: 'categoryName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'addCategory',
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
