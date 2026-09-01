import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { returnAllOrLimit } from '@utils/descriptions';
import { updateDisplayOptions } from '@utils/utilities';

import { confluenceApiRequestBinary } from '../../transport';
import {
	fetchPaginatedResults,
	optionalSpaceRLC,
	pageRLC,
	parsePositiveInt,
	resolvePageId,
} from '../common';
import type { ConfluenceBinaryOperation } from '../router';

const properties: INodeProperties[] = [
	optionalSpaceRLC,
	{
		...pageRLC,
		description: 'The page whose attachments to fetch',
	},
	...returnAllOrLimit,
	{
		displayName: 'Download',
		name: 'download',
		type: 'boolean',
		default: false,
		description:
			"Whether to also download each attachment's file and attach it to the item's binary output",
	},
	{
		displayName: 'Put Output File in Field',
		name: 'binaryPropertyName',
		type: 'string',
		placeholder: 'e.g. data',
		default: 'data',
		required: true,
		description: 'Use this field name in the following nodes, to use the binary file data',
		hint: 'The name of the output binary field to put the file in',
		displayOptions: { show: { download: [true] } },
	},
];

const displayOptions = {
	show: {
		resource: ['attachment'],
		operation: ['getMany'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

function asOptionalString(value: unknown): string | undefined {
	return typeof value === 'string' && value !== '' ? value : undefined;
}

export const execute: ConfluenceBinaryOperation = async function (
	this: IExecuteFunctions,
	itemIndex: number,
) {
	const pageId = await resolvePageId.call(this, itemIndex);
	const returnAll = this.getNodeParameter('returnAll', itemIndex, false);
	const limit = returnAll
		? Infinity
		: parsePositiveInt.call(
				this,
				this.getNodeParameter('limit', itemIndex, 100),
				'Limit',
				itemIndex,
			);
	const download = this.getNodeParameter('download', itemIndex, false);
	const endpoint = `/wiki/api/v2/pages/${encodeURIComponent(pageId)}/attachments`;

	const attachments = await fetchPaginatedResults.call(this, endpoint, limit);
	const items: INodeExecutionData[] = attachments.map((attachment) => ({ json: attachment }));

	if (download) {
		const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex, 'data');
		for (const item of items) {
			const downloadLink = item.json.downloadLink;
			if (typeof downloadLink !== 'string' || !downloadLink.startsWith('/')) {
				throw new NodeOperationError(
					this.getNode(),
					`Attachment "${asOptionalString(item.json.title) ?? asOptionalString(item.json.id) ?? 'unknown'}" has no usable download link`,
					{ itemIndex },
				);
			}
			// downloadLink is server-relative to /wiki with a raw, unencoded filename in the
			// path; encode the segments and keep the query string (version/cache params) intact
			const querySplit = downloadLink.lastIndexOf('?');
			const path = (querySplit === -1 ? downloadLink : downloadLink.slice(0, querySplit))
				.split('/')
				.map(encodeURIComponent)
				.join('/');
			const query = querySplit === -1 ? '' : downloadLink.slice(querySplit);
			const buffer = await confluenceApiRequestBinary.call(this, `/wiki${path}${query}`);
			item.binary = {
				[binaryPropertyName]: await this.helpers.prepareBinaryData(
					buffer,
					asOptionalString(item.json.title),
					asOptionalString(item.json.mediaType),
				),
			};
		}
	}

	return items;
};
