import { EmployeeProperties } from '../../Interfaces';

export const employeeGetDescription: EmployeeProperties = [
	{
		displayName: 'Employee ID',
		name: 'employeeId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['employee'],
			},
		},
		default: '',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['employee'],
			},
		},
		options: [
			{
				displayName: 'Field Names or IDs',
				name: 'fields',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getEmployeeFields',
				},
				default: ['all'],
				description:
					'Set of fields to get from employee data. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
		],
	},
];
