import {
	INodeProperties,
} from 'n8n-workflow';

import {
	activeCampaignDefaultGetAllProperties,
} from './GenericFunctions';

export const listOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'list',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all lists',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
];

export const listFields: INodeProperties[] = [
	// ----------------------------------
	//         list:getAll
	// ----------------------------------
	...activeCampaignDefaultGetAllProperties('list', 'getAll'),
];
