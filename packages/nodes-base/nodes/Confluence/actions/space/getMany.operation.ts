import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { returnAllOrLimit } from '@utils/descriptions';
import { updateDisplayOptions } from '@utils/utilities';

import {
	fetchPaginatedResults,
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

	return await fetchPaginatedResults.call(this, '/wiki/api/v2/spaces', limit, descriptionFormatQs);
};
