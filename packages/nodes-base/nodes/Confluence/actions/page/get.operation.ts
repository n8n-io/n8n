import type {
	IDataObject,
	IExecuteFunctions,
	INodeParameterResourceLocator,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { confluenceApiRequest } from '../../transport';
import type { ConfluenceOperation } from '../router';

const MAX_DEPTH = 10;
const PAGE_LIMIT = 250;

export const description: INodeProperties[] = [
	{
		displayName: 'Page',
		name: 'page',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description: 'The page to fetch',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getPages',
					searchable: true,
				},
			},
			{
				displayName: 'By URL',
				name: 'url',
				type: 'string',
				placeholder: 'e.g. https://your-site.atlassian.net/wiki/spaces/DOCS/pages/123456/My+Page',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '.*/pages/[0-9]+.*',
							errorMessage: 'The URL must contain /pages/<numeric page ID>',
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex: '/pages/([0-9]+)',
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. 123456',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[0-9]+$',
							errorMessage: 'The page ID must be numeric',
						},
					},
				],
			},
			{
				displayName: 'By Title',
				name: 'title',
				type: 'string',
				placeholder: 'e.g. Project plan',
			},
		],
		displayOptions: {
			show: {
				resource: ['page'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'Body Format',
		name: 'bodyFormat',
		type: 'options',
		options: [
			{
				name: 'Atlas Doc Format',
				value: 'atlas_doc_format',
				description: 'The ADF JSON representation',
			},
			{
				name: 'Plain Text',
				value: 'plainText',
				description: 'Text extracted from the ADF body (dynamic macros carry no text)',
			},
			{
				name: 'Storage',
				value: 'storage',
				description: 'The raw storage-format XHTML',
			},
		],
		default: 'storage',
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
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['page'],
				operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'Space',
				name: 'space',
				type: 'string',
				default: '',
				placeholder: 'e.g. DOCS',
				description:
					'Space key or numeric space ID that scopes a By Title lookup. Without it, a unique site-wide match is required and multiple matches produce an error listing the candidates. Ignored for the other page modes.',
			},
		],
	},
];

function extractNextCursor(response: IDataObject): string | undefined {
	const next = (response._links as IDataObject | undefined)?.next;
	if (typeof next !== 'string' || next === '') return undefined;
	try {
		return new URL(next, 'https://api.atlassian.com').searchParams.get('cursor') ?? undefined;
	} catch {
		return undefined;
	}
}

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

function shapeBody(page: IDataObject, bodyFormat: string): IDataObject {
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

async function resolveSpaceId(
	this: IExecuteFunctions,
	itemIndex: number,
	space: string,
): Promise<string> {
	if (/^\d+$/.test(space)) return space;
	const response = await confluenceApiRequest.call(
		this,
		'GET',
		'/wiki/api/v2/spaces',
		{},
		{ keys: space, limit: 1 },
	);
	const results = Array.isArray(response.results) ? (response.results as IDataObject[]) : [];
	if (results.length === 0) {
		throw new NodeOperationError(this.getNode(), `No space with key "${space}" found`, {
			itemIndex,
		});
	}
	return String(results[0].id);
}

async function resolvePageIdByTitle(
	this: IExecuteFunctions,
	itemIndex: number,
	title: string,
	space: string,
): Promise<string> {
	const qs: IDataObject = { title, limit: PAGE_LIMIT };
	if (space !== '') qs['space-id'] = await resolveSpaceId.call(this, itemIndex, space);

	const response = await confluenceApiRequest.call(this, 'GET', '/wiki/api/v2/pages', {}, qs);
	const results = Array.isArray(response.results) ? (response.results as IDataObject[]) : [];

	if (results.length === 0) {
		throw new NodeOperationError(
			this.getNode(),
			`No page titled "${title}" found${space === '' ? '' : ` in space "${space}"`}`,
			{ itemIndex },
		);
	}
	if (results.length > 1) {
		const candidates = results
			.slice(0, 5)
			.map(
				(page) => `"${String(page.title)}" (space ${String(page.spaceId)}, ID ${String(page.id)})`,
			)
			.join(', ');
		throw new NodeOperationError(
			this.getNode(),
			`Found ${results.length} pages titled "${title}": ${candidates}${results.length > 5 ? ', …' : ''}. Scope the lookup with the Space field, or use the page ID.`,
			{ itemIndex },
		);
	}
	return String(results[0].id);
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
					const id = record.id === undefined ? '' : String(record.id);
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

/** Hydration phase: batched `GET /pages?id=a,b,c` (this endpoint only accepts storage/atlas_doc_format). */
async function fetchPagesByIds(
	this: IExecuteFunctions,
	ids: string[],
	requestedFormat: string,
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
	const bodyFormat = this.getNodeParameter('bodyFormat', itemIndex, 'storage') as string;
	const includeDescendants = this.getNodeParameter(
		'includeDescendants',
		itemIndex,
		false,
	) as boolean;
	// No server-side plain-text format exists; it is derived from ADF in shapeBody
	const requestedFormat = bodyFormat === 'plainText' ? 'atlas_doc_format' : bodyFormat;

	const pageRef = this.getNodeParameter('page', itemIndex) as INodeParameterResourceLocator;

	let pageId: string;
	if (pageRef.mode === 'title') {
		const title = String(pageRef.value ?? '').trim();
		if (title === '') {
			throw new NodeOperationError(this.getNode(), 'The page title must not be empty', {
				itemIndex,
			});
		}
		const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;
		const space = typeof options.space === 'string' ? options.space.trim() : '';
		pageId = await resolvePageIdByTitle.call(this, itemIndex, title, space);
	} else {
		// From List / By ID pass the value through; By URL extracts the ID via the mode's regex
		pageId = String(
			this.getNodeParameter('page', itemIndex, '', { extractValue: true }) as string,
		).trim();
		if (pageId === '') {
			throw new NodeOperationError(this.getNode(), "The 'Page' parameter is empty", { itemIndex });
		}
	}

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

	const maxPages = this.getNodeParameter('maxPages', itemIndex, 100) as number;
	const descendantIds = await collectDescendantPageIds.call(
		this,
		pageId,
		Math.max(maxPages - 1, 0),
	);
	const pages = await fetchPagesByIds.call(this, [pageId, ...descendantIds], requestedFormat);
	return pages.map((page) => shapeBody(page, bodyFormat));
};
