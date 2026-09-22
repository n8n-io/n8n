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

// The batched `/pages` hydration has no `draft` value in its `status` filter, so a
// draft descendant would spend a Max Pages slot and then be dropped
const HYDRATABLE_STATUSES = new Set(['current', 'archived']);

function isHydratable(record: IDataObject): boolean {
	return typeof record.status !== 'string' || HYDRATABLE_STATUSES.has(record.status);
}

function asId(value: unknown): string {
	return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

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
		description:
			'Whether to also fetch every descendant page of the page, one item per page. Unpublished drafts are skipped.',
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
					const id = asId(record.id);
					if (id === '' || seen.has(id)) continue;
					seen.add(id);
					// Folders nest pages too; whiteboards/databases have nothing to fetch
					if ((record.type === 'page' || record.type === 'folder') && record.depth === MAX_DEPTH) {
						nextFrontier.push(id);
					}
					if (record.type === 'page' && isHydratable(record)) {
						pageIds.push(id);
						if (pageIds.length >= maxCount) return pageIds;
					}
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
 * storage/atlas_doc_format), re-keyed to `ids` because Confluence answers each batch
 * in its own order. May return fewer pages than requested — IDs the caller can't read
 * or that were deleted since discovery are dropped silently, which is intended.
 */
async function fetchPagesByIds(
	this: IExecuteFunctions,
	ids: string[],
	requestedFormat: Exclude<ConfluenceBodyFormat, 'plainText'>,
): Promise<IDataObject[]> {
	const byId = new Map<string, IDataObject>();
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
		for (const page of results) byId.set(asId(page.id), page);
	}
	return ids.map((id) => byId.get(id)).filter((page): page is IDataObject => page !== undefined);
}

async function fetchPage(
	this: IExecuteFunctions,
	pageId: string,
	requestedFormat: Exclude<ConfluenceBodyFormat, 'plainText'>,
): Promise<IDataObject> {
	return await confluenceApiRequest.call(
		this,
		'GET',
		`/wiki/api/v2/pages/${encodeURIComponent(pageId)}`,
		{},
		{ 'body-format': requestedFormat },
	);
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
		return shapeBody(await fetchPage.call(this, pageId, requestedFormat), bodyFormat);
	}

	const maxPages = parsePositiveInt.call(
		this,
		this.getNodeParameter('maxPages', itemIndex, 100),
		'Max Pages',
		itemIndex,
	);
	// Not a seat in the batch below: the root must lead the output even when it is a draft
	const root = await fetchPage.call(this, pageId, requestedFormat);
	const descendantIds = await collectDescendantPageIds.call(this, pageId, maxPages - 1);
	const descendants = await fetchPagesByIds.call(this, descendantIds, requestedFormat);
	return [root, ...descendants].map((page) => shapeBody(page, bodyFormat));
};
