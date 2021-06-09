import {
	INodeProperties,
} from 'n8n-workflow';

export const contactJourneyOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'contactJourney',
				],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add contact to list',
			},
		],
		default: 'add',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const contactJourneyFields = [

	/* -------------------------------------------------------------------------- */
	/*                                 contactJourney:add                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Trigger ID',
		name: 'triggerId',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getTriggers',
		},
		type: 'options',
		displayOptions: {
			show: {
				operation: [
					'add',
				],
				resource: [
					'contactJourney',
				],
			},
		},
		default: '',
		description: 'List ID.',
	},
	{
		displayName: 'Contact ID',
		name: 'contactId',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'add',
				],
				resource: [
					'contactJourney',
				],
			},
		},
		default: '',
		description: 'Can be ID or email.',
	},
] as INodeProperties[];
