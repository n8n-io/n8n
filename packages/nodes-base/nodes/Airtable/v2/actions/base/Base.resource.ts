import type { INodeProperties } from 'n8n-workflow';

import * as getMany from './getMany.operation';
import * as getSchema from './getSchema.operation';

export { getMany, getSchema };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Get many bases',
				action: 'List all the bases',
			},
			{
				name: 'Get Schema',
				value: 'getSchema',
				description: 'Get base schema',
				action: 'Get the schema of the tables in a base',
			},
		],
		default: 'getMany',
		displayOptions: {
			show: {
				resource: ['base'],
			},
		},
	},
	...getMany.description,
	...getSchema.description,
];
