import { EmployeeDocumentProperties } from '../../Interfaces';

export const employeeDocumentGetAllDescription: EmployeeDocumentProperties = [
	{
		displayName: 'Employee ID',
		name: 'employeeId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['employeeDocument'],
			},
		},
		default: '',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['employeeDocument'],
			},
		},
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 5,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['employeeDocument'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Simplify',
		name: 'simplifyOutput',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['employeeDocument'],
			},
		},
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
];
