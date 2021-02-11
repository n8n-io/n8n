import { INodeProperties } from 'n8n-workflow';

export const reportOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'report',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get an event report',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const reportFields = [

/* -------------------------------------------------------------------------- */
/*                                   report:get                               */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Event Date ID',
		name: 'eventDateId',
		type: 'string',
		default: '',
		required: true,
		description: 'Event Date ID',
		displayOptions: {
			show: {
				resource: [
					'report',
				],
				operation: [
					'get',
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'report',
				],
				operation: [
					'get',
				],
			},
		},
		options: [
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Attended',
						value: 'attended',
					},
					{
						name: 'Did Not Attend',
						value: 'did-not-attend',
					},
					{
						name: 'Completed',
						value: 'completed',
					},
					{
						name: 'Left Early',
						value: 'left-early',
					},
					{
						name: 'Banned',
						value: 'banned',
					},
				],
				default: '',
				description: 'Filter results by participation status',
			},
		],
	},
] as INodeProperties[];
