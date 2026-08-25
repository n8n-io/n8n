import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { returnAllOrLimit } from '@utils/descriptions';
import { updateDisplayOptions } from '@utils/utilities';

import { confluenceApiRequest, confluenceApiRequestBinary } from '../../transport';
import {
	PAGE_LIMIT,
	extractNextCursor,
	optionalSpaceRLC,
	pageRLC,
	parsePositiveInt,
	resolvePageId,
} from '../common';
import type { ConfluenceBinaryOperation } from '../router';

const properties: INodeProperties[] = [
	{
		...optionalSpaceRLC,
		description:
			'Limits page selection and By Title lookups to one space. Leave empty or pick "All Spaces" to search across all spaces.',
	},
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

	const attachments: IDataObject[] = [];
	let cursor: string | undefined;
	const seenCursors = new Set<string>();
	do {
		const qs: IDataObject = { limit: Math.min(limit - attachments.length, PAGE_LIMIT) };
		if (cursor !== undefined) qs.cursor = cursor;

		const response = await confluenceApiRequest.call(this, 'GET', endpoint, {}, qs);
		const records = Array.isArray(response.results) ? (response.results as IDataObject[]) : [];
		attachments.push.apply(attachments, records);

		const next = extractNextCursor(response);
		// A next link revisiting any earlier page would loop forever under Return All
		if (next === undefined || seenCursors.has(next)) break;
		seenCursors.add(next);
		cursor = next;
	} while (attachments.length < limit);

	const items: INodeExecutionData[] = (returnAll ? attachments : attachments.slice(0, limit)).map(
		(attachment) => ({ json: attachment }),
	);

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
