import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { returnAllOrLimit } from '@utils/descriptions';
import { updateDisplayOptions } from '@utils/utilities';

import {
	fetchPaginatedResults,
	optionalSpaceRLC,
	pageRLC,
	parsePositiveInt,
	resolvePageId,
} from '../common';
import type { ConfluenceOperation } from '../router';

const properties: INodeProperties[] = [
	optionalSpaceRLC,
	{
		...pageRLC,
		description: 'The page whose labels to list',
	},
	...returnAllOrLimit,
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				// The v2 endpoint types `prefix` as a single enum value, so no multi-select
				displayName: 'Prefix',
				name: 'prefix',
				type: 'options',
				default: 'global',
				description: 'Filter the results to labels with this prefix',
				options: [
					{ name: 'Global', value: 'global' },
					{ name: 'My', value: 'my' },
					{ name: 'System', value: 'system' },
					{ name: 'Team', value: 'team' },
				],
			},
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'options',
				default: 'name',
				description: 'The order to return the labels in',
				options: [
					{ name: 'Created Date (Ascending)', value: 'created-date' },
					{ name: 'Created Date (Descending)', value: '-created-date' },
					{ name: 'ID (Ascending)', value: 'id' },
					{ name: 'ID (Descending)', value: '-id' },
					{ name: 'Name (Ascending)', value: 'name' },
					{ name: 'Name (Descending)', value: '-name' },
				],
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['page'],
		operation: ['getLabels'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export const execute: ConfluenceOperation = async function (
	this: IExecuteFunctions,
	itemIndex: number,
) {
	const returnAll = this.getNodeParameter('returnAll', itemIndex, false);
	const total = returnAll
		? Infinity
		: parsePositiveInt.call(
				this,
				this.getNodeParameter('limit', itemIndex, 100),
				'Limit',
				itemIndex,
			);
	const options = this.getNodeParameter('options', itemIndex, {});

	// An expression can deliver an array here even though the UI is single-select
	const rawPrefix = options.prefix;
	const prefixes = (Array.isArray(rawPrefix) ? rawPrefix : [rawPrefix]).filter(
		(value): value is string => typeof value === 'string' && value !== '',
	);

	const pageId = await resolvePageId.call(this, itemIndex);

	const qs: IDataObject = {};
	if (prefixes.length > 0) qs.prefix = prefixes.join(',');
	if (typeof options.sort === 'string' && options.sort !== '') qs.sort = options.sort;

	return await fetchPaginatedResults.call(
		this,
		`/wiki/api/v2/pages/${encodeURIComponent(pageId)}/labels`,
		total,
		qs,
	);
};
