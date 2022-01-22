import * as get from './get';

import { 
	INodeProperties,
} from 'n8n-workflow';

export {
	get,
};

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'companyReport',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a company report',
			},
		],
		default: 'get',
		description: '',
	},
	...get.description,
];
