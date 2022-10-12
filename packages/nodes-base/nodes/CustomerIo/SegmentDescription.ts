import { INodeProperties } from 'n8n-workflow';

export const segmentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['segment'],
			},
		},
		options: [
			{
				name: 'Add Customer',
				value: 'add',
				action: 'Add a customer to a segment',
			},
			{
				name: 'Remove Customer',
				value: 'remove',
				action: 'Remove a customer from a segment',
			},
		],
		default: 'add',
	},
];

export const segmentFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                   segment:add                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Segment ID',
		name: 'segmentId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: ['segment'],
				operation: ['add', 'remove'],
			},
		},
		description: 'The unique identifier of the segment',
	},
	{
		displayName: 'Customer IDs',
		name: 'customerIds',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['segment'],
				operation: ['add', 'remove'],
			},
		},
		description: 'A list of customer IDs to add to the segment',
	},
];
