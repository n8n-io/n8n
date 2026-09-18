import type { INodeProperties } from 'n8n-workflow';

import * as get from './get.operation';
import * as getMany from './getMany.operation';
import { siteRLC } from '../common';

export { get, getMany };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['space'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a space',
				action: 'Get a space',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Retrieve many spaces',
				action: 'Get many spaces',
			},
		],
		default: 'getMany',
	},
	{
		...siteRLC,
		displayOptions: {
			show: {
				resource: ['space'],
			},
		},
	},
	...get.description,
	...getMany.description,
];
