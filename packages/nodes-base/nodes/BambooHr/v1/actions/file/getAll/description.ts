import {
	FileProperties,
} from '../../Interfaces';

export const fileGetAllDescription: FileProperties = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'file',
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 5,
		description: 'The number of results to return',
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'file',
				],
				returnAll: [
					false,
				],
			},
		},
	},
	{
		displayName: 'Simplify Output',
		name: 'simplifyOutput',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'file',
				],
			},
		},
		description: 'Whether to simplify the output or not',
	},
];
