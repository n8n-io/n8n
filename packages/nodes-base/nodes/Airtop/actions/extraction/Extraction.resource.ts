import type { INodeProperties } from 'n8n-workflow';

import * as getPaginated from './getPaginated.operation';
import * as scrape from './scrape.operation';

export { getPaginated, scrape };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['extraction'],
			},
		},
		options: [
			{
				name: 'Get Paginated',
				value: 'getPaginated',
				description: 'Get data from a paginated source',
				action: 'Get paginated data',
			},
			{
				name: 'Scrape',
				value: 'scrape',
				description: 'Scrape a window and return the content as markdown',
				action: 'Scrape window',
			},
		],
		default: 'getPaginated',
	},
	...getPaginated.description,
	...scrape.description,
];
