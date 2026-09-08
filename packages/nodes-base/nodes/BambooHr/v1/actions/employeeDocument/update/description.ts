import type { EmployeeDocumentProperties } from '../../Interfaces';

export const employeeDocumentUpdateDescription: EmployeeDocumentProperties = [
	{
		displayName: 'Employee ID',
		name: 'employeeId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['employeeDocument'],
			},
		},
		default: '',
	},
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['employeeDocument'],
			},
		},
		default: '',
	},
	{
		displayName: 'Update fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['employeeDocument'],
			},
		},
		options: [
			{
				displayName: 'Employee document category name or ID',
				name: 'categoryId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getEmployeeDocumentCategories',
					loadOptionsDependsOn: ['employeeId'],
				},
				default: '',
				description:
					'ID of the new category of the file. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'New name of the file',
			},
			{
				displayName: 'Share with employee',
				name: 'shareWithEmployee',
				type: 'boolean',
				default: true,
				description: 'Whether this file is shared or not',
			},
		],
	},
];
