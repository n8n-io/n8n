import type { EmployeeDocumentProperties } from '../../Interfaces';

export const employeeDocumentUploadDescription: EmployeeDocumentProperties = [
	{
		displayName: 'Employee ID',
		name: 'employeeId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['upload'],
				resource: ['employeeDocument'],
			},
		},
		default: '',
		description: 'ID of the employee',
	},
	{
		displayName: 'Employee Document Category ID',
		name: 'categoryId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['upload'],
				resource: ['employeeDocument'],
			},
		},
		default: '',
	},
	{
		displayName: 'Input Data Field Name',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		displayOptions: {
			show: {
				operation: ['upload'],
				resource: ['employeeDocument'],
			},
		},
		required: true,
		description:
			'The name of the input field containing the binary file data to be uploaded. Supported file types: PNG, JPEG.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['upload'],
				resource: ['employeeDocument'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Share with Employee',
				name: 'share',
				type: 'boolean',
				default: true,
				description: 'Whether this file is shared or not',
			},
		],
	},
];
