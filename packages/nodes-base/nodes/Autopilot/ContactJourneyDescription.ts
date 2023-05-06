import type { INodeProperties } from 'n8n-workflow';

export const contactJourneyOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['contactJourney'],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add contact to list',
				action: 'Add a contact journey',
			},
		],
		default: 'add',
	},
];

export const contactJourneyFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 contactJourney:add                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Trigger Name or ID',
		name: 'triggerId',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getTriggers',
		},
		type: 'options',
		displayOptions: {
			show: {
				operation: ['add'],
				resource: ['contactJourney'],
			},
		},
		default: '',
		description:
			'List ID. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Contact ID',
		name: 'contactId',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				operation: ['add'],
				resource: ['contactJourney'],
			},
		},
		default: '',
		description: 'Can be ID or email',
	},
];
