import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { confluenceApiRequest } from '../../transport';
import type { ConfluenceBodyFormat } from '../common';
import {
	PAGE_LIMIT,
	bodyFormatOption,
	nextUnseenCursor,
	optionalSpaceRLC,
	pageRLC,
	parsePositiveInt,
	resolvePageId,
	shapeBody,
} from '../common';
import type { ConfluenceOperation } from '../router';

// The descendants endpoint's documented maximum; `depth` is an upper bound
// ("maximum depth of descendants to return"), not an exact-depth filter
const MAX_DEPTH = 10;

export const description: INodeProperties[] = [
	{
		...optionalSpaceRLC,
		displayOptions: {
			show: {
				resource: ['page'],
				operation: ['get'],
			},
		},
	},
	{
		...pageRLC,
		description: 'The page to fetch',
		displayOptions: {
			show: {
				resource: ['page'],
				operation: ['get'],
			},
		},
	},
	{
		...bodyFormatOption,
		displayOptions: {
			show: {
				resource: ['page'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'Include Descendants',
		name: 'includeDescendants',
		type: 'boolean',
		default: false,
		description: 'Whether to also fetch every descendant page of the page, one item per page',
		displayOptions: {
			show: {
				resource: ['page'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'Max Pages',
		name: 'maxPages',
		type: 'number',
		default: 100,
		typeOptions: {
			minValue: 1,
		},
		description: 'Safeguard that stops the sub-tree walk after this many pages, root included',
		displayOptions: {
			show: {
				resource: ['page'],
				operation: ['get'],
				includeDescendants: [true],
			},
		},
	},
];

/**
 * Discovery phase: flattened tree records from `/pages/{id}/descendants` (no bodies).
 * Records at the endpoint's max depth may have unreached children, so the walk
 * re-roots from them until the tree is exhausted or maxCount is hit.
 */
async function collectDescendantPageIds(
	this: IExecuteFunctions,
	rootId: string,
	maxCount: number,
): Promise<string[]> {
	const pageIds: string[] = [];
	const seen = new Set<string>([rootId]);
	let frontier = [rootId];

	while (frontier.length > 0 && pageIds.length < maxCount) {
		const nextFrontier: string[] = [];
		for (const nodeId of frontier) {
			let cursor: string | undefined;
			const seenCursors = new Set<string>();
			do {
				const qs: IDataObject = { depth: MAX_DEPTH, limit: PAGE_LIMIT };
				if (cursor !== undefined) qs.cursor = cursor;
				const response = await confluenceApiRequest.call(
					this,
					'GET',
					`/wiki/api/v2/pages/${encodeURIComponent(nodeId)}/descendants`,
					{},
					qs,
				);
				const records = Array.isArray(response.results) ? (response.results as IDataObject[]) : [];
				for (const record of records) {
					const id =
						typeof record.id === 'string' || typeof record.id === 'number' ? String(record.id) : '';
					if (id === '' || seen.has(id)) continue;
					seen.add(id);
					if (record.type === 'page') pageIds.push(id);
					// Folders nest pages too; whiteboards/databases have nothing to fetch
					if ((record.type === 'page' || record.type === 'folder') && record.depth === MAX_DEPTH) {
						nextFrontier.push(id);
					}
					if (pageIds.length >= maxCount) return pageIds;
				}
				cursor = nextUnseenCursor(response, seenCursors);
			} while (cursor !== undefined);
		}
		frontier = nextFrontier;
	}
	return pageIds;
}

/**
 * Hydration phase: batched `GET /pages?id=a,b,c` (this endpoint only accepts
 * storage/atlas_doc_format). May return fewer pages than requested — IDs the
 * caller can't read or that were deleted since discovery are dropped silently,
 * which is intended.
 */
async function fetchPagesByIds(
	this: IExecuteFunctions,
	ids: string[],
	requestedFormat: Exclude<ConfluenceBodyFormat, 'plainText'>,
): Promise<IDataObject[]> {
	const pages: IDataObject[] = [];
	for (let start = 0; start < ids.length; start += PAGE_LIMIT) {
		const chunk = ids.slice(start, start + PAGE_LIMIT);
		const response = await confluenceApiRequest.call(
			this,
			'GET',
			'/wiki/api/v2/pages',
			{},
			{ id: chunk.join(','), 'body-format': requestedFormat, limit: PAGE_LIMIT },
		);
		const results = Array.isArray(response.results) ? (response.results as IDataObject[]) : [];
		for (const page of results) pages.push(page);
	}
	return pages;
}

export const execute: ConfluenceOperation = async function (
	this: IExecuteFunctions,
	itemIndex: number,
) {
	const bodyFormat = this.getNodeParameter(
		'bodyFormat',
		itemIndex,
		'storage',
	) as ConfluenceBodyFormat;
	const includeDescendants = this.getNodeParameter(
		'includeDescendants',
		itemIndex,
		false,
	) as boolean;
	// No server-side plain-text format exists; it is derived from ADF in shapeBody
	const requestedFormat = bodyFormat === 'plainText' ? 'atlas_doc_format' : bodyFormat;

	const pageId = await resolvePageId.call(this, itemIndex);

	if (!includeDescendants) {
		const page = await confluenceApiRequest.call(
			this,
			'GET',
			`/wiki/api/v2/pages/${encodeURIComponent(pageId)}`,
			{},
			{ 'body-format': requestedFormat },
		);
		return shapeBody(page, bodyFormat);
	}

	const maxPages = parsePositiveInt.call(
		this,
		this.getNodeParameter('maxPages', itemIndex, 100),
		'Max Pages',
		itemIndex,
	);
	const descendantIds = await collectDescendantPageIds.call(
		this,
		pageId,
		Math.max(maxPages - 1, 0),
	);
	const pages = await fetchPagesByIds.call(this, [pageId, ...descendantIds], requestedFormat);
	return pages.map((page) => shapeBody(page, bodyFormat));
};
