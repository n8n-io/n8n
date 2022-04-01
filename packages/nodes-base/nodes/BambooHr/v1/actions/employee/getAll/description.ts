import { INodeProperties } from 'n8n-workflow';

export const employeeGetAllDescription: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: [
					'employee',
				],
				operation: [
					'getAll',
				],
			},
		},
		description: 'Whether to return all results',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 5,
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		displayOptions: {
			show: {
				resource: [
					'employee',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		description: 'The number of results to return',
	},
];
