import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { confluenceApiRequest } from '../../transport';
import type { ConfluenceBodyFormat } from '../common';
import {
	PAGE_LIMIT,
	bodyFormatOption,
	extractNextCursor,
	optionalSpaceRLC,
	pageRLC,
	resolvePageId,
} from '../common';
import type { ConfluenceOperation } from '../router';

// The descendants endpoint's documented maximum; `depth` is an upper bound
// ("maximum depth of descendants to return"), not an exact-depth filter
const MAX_DEPTH = 10;

export const description: INodeProperties[] = [
	{
		...optionalSpaceRLC,
		description:
			'Limits page selection and By Title lookups to one space. Leave empty or pick "All Spaces" to search across all spaces.',
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

// Text extraction, not rendering: concatenate ADF text nodes, newline at block boundaries
const ADF_BLOCK_TYPES = new Set([
	'blockquote',
	'bulletList',
	'codeBlock',
	'heading',
	'listItem',
	'orderedList',
	'panel',
	'paragraph',
	'rule',
	'table',
	'tableRow',
	'taskItem',
	'taskList',
]);

function adfToPlainText(node: IDataObject): string {
	if (node.type === 'text') return typeof node.text === 'string' ? node.text : '';
	if (node.type === 'hardBreak') return '\n';
	const content = Array.isArray(node.content) ? (node.content as IDataObject[]) : [];
	let inner = '';
	for (const child of content) {
		inner += adfToPlainText(child);
		if (node.type === 'tableRow') inner += ' ';
	}
	return ADF_BLOCK_TYPES.has(node.type as string) ? `${inner}\n` : inner;
}

function shapeBody(page: IDataObject, bodyFormat: ConfluenceBodyFormat): IDataObject {
	if (bodyFormat !== 'plainText') return page;
	const adf = (page.body as IDataObject | undefined)?.atlas_doc_format as IDataObject | undefined;
	let value = '';
	if (typeof adf?.value === 'string' && adf.value !== '') {
		try {
			const doc = JSON.parse(adf.value) as IDataObject;
			value = adfToPlainText(doc)
				.replace(/[ \t]+\n/g, '\n')
				.replace(/\n{3,}/g, '\n\n')
				.trim();
		} catch {
			value = '';
		}
	}
	return { ...page, body: { plainText: { representation: 'plain_text', value } } };
}

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
				cursor = extractNextCursor(response);
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

	const rawMaxPages = this.getNodeParameter('maxPages', itemIndex, 100) as number;
	if (!Number.isFinite(rawMaxPages) || rawMaxPages < 1) {
		throw new NodeOperationError(this.getNode(), 'Max Pages must be a number of at least 1', {
			itemIndex,
		});
	}
	const maxPages = Math.floor(rawMaxPages);
	const descendantIds = await collectDescendantPageIds.call(
		this,
		pageId,
		Math.max(maxPages - 1, 0),
	);
	const pages = await fetchPagesByIds.call(this, [pageId, ...descendantIds], requestedFormat);
	return pages.map((page) => shapeBody(page, bodyFormat));
};
