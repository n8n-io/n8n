import { INodeProperties } from 'n8n-workflow';
export const resource = ['timeEntry'];
export const timeEntryOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource,
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all time entries',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const timeEntryFields = [
	/* -------------------------------------------------------------------------- */
	/*                                timeEntry:getAll                            */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource,
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'Returns a list of your time entries.',
	},
	{
		displayName: 'Only Billable',
		name: 'billable',
		type: 'boolean',
		displayOptions: {
			show: {
				resource,
				operation: [
					'getAll',
				],
			},
		},
		default: true,
		description: 'Returns only billable time entries.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource,
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 100,
		description: 'How many results to return.',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource,
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'From',
				name: 'start',
				type: 'dateTime',
				default: '',
				description: 'Only return time entries with a date on or after the given date.',
			},
			{
				displayName: 'To',
				name: 'end',
				type: 'dateTime',
				default: '',
				description: 'Only return time entries with a date on or before the given date.',
			},
		],
	},




] as INodeProperties[];
