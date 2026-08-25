import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { returnAllOrLimit } from '@utils/descriptions';
import { updateDisplayOptions } from '@utils/utilities';

import { confluenceApiRequest } from '../../transport';
import {
	PAGE_LIMIT,
	extractNextCursor,
	parsePositiveInt,
	spaceDescriptionFormatQs,
	spaceOptionsCollection,
} from '../common';
import type { ConfluenceOperation } from '../router';

const properties: INodeProperties[] = [...returnAllOrLimit, spaceOptionsCollection];

const displayOptions = {
	show: {
		resource: ['space'],
		operation: ['getMany'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export const execute: ConfluenceOperation = async function (
	this: IExecuteFunctions,
	itemIndex: number,
) {
	const returnAll = this.getNodeParameter('returnAll', itemIndex, false);
	const limit = returnAll
		? Infinity
		: parsePositiveInt.call(
				this,
				this.getNodeParameter('limit', itemIndex, 100),
				'Limit',
				itemIndex,
			);

	const options = this.getNodeParameter('options', itemIndex, {});
	const descriptionFormatQs = spaceDescriptionFormatQs(options);

	const spaces: IDataObject[] = [];
	let cursor: string | undefined;
	const seenCursors = new Set<string>();
	do {
		const qs: IDataObject = {
			...descriptionFormatQs,
			limit: Math.min(limit - spaces.length, PAGE_LIMIT),
		};
		if (cursor !== undefined) qs.cursor = cursor;

		const response = await confluenceApiRequest.call(this, 'GET', '/wiki/api/v2/spaces', {}, qs);
		const results = Array.isArray(response.results) ? (response.results as IDataObject[]) : [];
		spaces.push.apply(spaces, results);

		const next = extractNextCursor(response);
		// A next link revisiting any earlier page would loop forever under Return All
		if (next === undefined || seenCursors.has(next)) break;
		seenCursors.add(next);
		cursor = next;
	} while (spaces.length < limit);

	return spaces.slice(0, limit);
};
