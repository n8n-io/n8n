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
		noDataExpression: true,
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
				action: 'Get all lists',
			},
		],
		default: 'getAll',
	},
];

export const listFields: INodeProperties[] = [
	// ----------------------------------
	//         list:getAll
	// ----------------------------------
	...activeCampaignDefaultGetAllProperties('list', 'getAll'),
];
