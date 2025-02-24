import { INodeProperties } from 'n8n-workflow';

export const valuationsOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: {
		show: {
			resource: ['valuations'],
		},
	},
	options: [
		{
			name: 'Valuations Lookup',
			value: 'valuationsLookup',
			action: 'Valuations lookup',
		},
		{
			name: 'Get Instant Offer',
			value: 'getInstantOffer',
			action: 'Get instant offer',
		},
		{
			name: 'List Existing Offers',
			value: 'listExistingOffers',
			action: 'List existing offers',
		},
	],
	default: 'valuationsLookup',
};

export const valuationsProperties: INodeProperties[] = [
	{
		displayName: 'Token ID',
		name: 'tokenId',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['valuations'],
			},
		},
		default: 0,
		description: 'The Token ID of the vehicle for Valuations actions',
		required: true,
	},
];

export const valuationsDescription = {
	operations: valuationsOperations,
	properties: valuationsProperties,
};
