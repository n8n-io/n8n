import type { INodeProperties } from 'n8n-workflow';

import * as getPaginated from './getPaginated.operation';
import * as query from './query.operation';
import * as scrape from './scrape.operation';
import { getSessionModeFields } from '../common/fields';

export { getPaginated, query, scrape };

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
				name: 'Query Page',
				value: 'query',
				description: 'Query a page to extract data or ask a question given the data on the page',
				action: 'Query page',
			},
			{
				name: 'Query Page with Pagination',
				value: 'getPaginated',
				description: 'Extract content from paginated or dynamically loaded pages',
				action: 'Query page with pagination',
			},
			{
				name: 'Smart Scrape',
				value: 'scrape',
				description: 'Scrape a page and return the data as markdown',
				action: 'Smart scrape page',
			},
		],
		default: 'getPaginated',
	},
	...getSessionModeFields('extraction', ['getPaginated', 'query', 'scrape']),
	...getPaginated.description,
	...query.description,
];
