import type { INodeProperties } from 'n8n-workflow';

import * as close from './close.operation';
import * as create from './create.operation';
import * as getScreenshot from './getScreenshot.operation';
import * as query from './query.operation';

export { create, close, getScreenshot, query };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['window'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new window',
				action: 'Create a window',
			},
			{
				name: 'Get Screenshot',
				value: 'getScreenshot',
				description: 'Get a screenshot of the current window',
				action: 'Get screenshot',
			},
			{
				name: 'Query Page',
				value: 'query',
				description: 'Query the current page content',
				action: 'Query page',
			},
			{
				name: 'Close',
				value: 'close',
				description: 'Close a window',
				action: 'Close a window',
			},
		],
		default: 'create',
	},
	{
		displayName: 'Session ID',
		name: 'sessionId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['window'],
			},
		},
		default: '={{ $json["sessionId"] }}',
		description: 'The ID of the session',
	},
	...create.description,
	...getScreenshot.description,
	...query.description,
	...close.description,
];
