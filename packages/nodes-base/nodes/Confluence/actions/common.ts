import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeParameterResourceLocator,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { CONFLUENCE_CREDENTIAL_NAME, confluenceApiRequest } from '../transport';

export const PAGE_LIMIT = 250;

/**
 * Shared page-selection fields: operations spread `spaceRLC`/`pageRLC`/
 * `bodyFormatOption`, add their own displayOptions, and resolve the selection
 * with `resolvePageId`. An empty space leaves page lookups site-wide.
 */
export const pageRLC: INodeProperties = {
	displayName: 'Page',
	name: 'page',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	description: 'The page to operate on',
	typeOptions: {
		loadOptionsDependsOn: ['space.value'],
	},
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
						regex: '.*/pages/(?:edit-v2/)?[0-9]+.*',
						errorMessage: 'The URL must contain /pages/<numeric page ID>',
					},
				},
			],
			extractValue: {
				type: 'regex',
				regex: '/pages/(?:edit-v2/)?([0-9]+)',
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
};

export type ConfluenceBodyFormat = 'storage' | 'atlas_doc_format' | 'plainText';

export const bodyFormatOption: INodeProperties = {
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
};

export const spaceRLC: INodeProperties = {
	displayName: 'Space',
	name: 'space',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	description: 'The Confluence space',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'searchSpaces',
				searchable: true,
			},
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 98432',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '^[0-9]+$',
						errorMessage: 'The space ID must be numeric',
					},
				},
			],
		},
	],
};

/** `spaceRLC` for operations where the space is optional: the list gets an
 * "All Spaces" reset entry and By ID accepts an empty value. */
export const optionalSpaceRLC: INodeProperties = {
	...spaceRLC,
	modes: (spaceRLC.modes ?? []).map((mode) => {
		if (mode.name === 'list') {
			return {
				...mode,
				typeOptions: { ...mode.typeOptions, searchListMethod: 'searchSpacesWithAll' },
			};
		}
		if (mode.name === 'id') {
			return {
				...mode,
				validation: [
					{
						type: 'regex' as const,
						properties: {
							regex: '^[0-9]*$',
							errorMessage: 'The space ID must be numeric (leave empty for all spaces)',
						},
					},
				],
			};
		}
		return mode;
	}),
};

const spaceKeyCache = new Map<string, string>();

export function clearSpaceKeyCache(): void {
	spaceKeyCache.clear();
}

export async function resolveSpaceKey(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	spaceId: string,
): Promise<string | undefined> {
	// Space IDs are only unique per site, so the cache is keyed per credential
	const rawCredentialId = this.getNode().credentials?.[CONFLUENCE_CREDENTIAL_NAME]?.id;
	const credentialId = typeof rawCredentialId === 'string' ? rawCredentialId : '';
	const cacheKey = `${credentialId}:${spaceId}`;

	const cached = spaceKeyCache.get(cacheKey);
	if (cached !== undefined) return cached;

	const space = await confluenceApiRequest.call(
		this,
		'GET',
		`/wiki/api/v2/spaces/${encodeURIComponent(spaceId)}`,
	);
	if (typeof space.key !== 'string' || space.key === '') return undefined;
	spaceKeyCache.set(cacheKey, space.key);
	return space.key;
}

export type NextPageParam = { key: 'cursor' | 'start'; value: string };

export function extractNextPageParam(response: IDataObject): NextPageParam | undefined {
	const next = (response._links as IDataObject | undefined)?.next;
	if (typeof next !== 'string' || next === '') return undefined;

	let params: URLSearchParams;
	try {
		params = new URL(next, 'https://api.atlassian.com').searchParams;
	} catch {
		return undefined;
	}
	const cursor = params.get('cursor');
	if (cursor !== null && cursor !== '') return { key: 'cursor', value: cursor };
	// Older responses page by start offset instead of cursor
	const start = params.get('start');
	return start === null || start === '' ? undefined : { key: 'start', value: start };
}

export function extractNextCursor(response: IDataObject): string | undefined {
	const next = extractNextPageParam(response);
	return next?.key === 'cursor' ? next.value : undefined;
}

/** Validates a count parameter that an expression may hand back as a numeric string. */
export function parsePositiveInt(
	this: IExecuteFunctions,
	raw: unknown,
	label: string,
	itemIndex: number,
): number {
	const value = Number(raw);
	if (!Number.isFinite(value) || value < 1) {
		throw new NodeOperationError(this.getNode(), `${label} must be a number of at least 1`, {
			itemIndex,
		});
	}
	return Math.floor(value);
}

function asString(value: unknown): string {
	return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

async function resolvePageIdByTitle(
	this: IExecuteFunctions,
	itemIndex: number,
	title: string,
	spaceId: string,
	spaceLabel: string,
): Promise<string> {
	const qs: IDataObject = { title, limit: PAGE_LIMIT };
	if (spaceId !== '') qs['space-id'] = spaceId;

	const response = await confluenceApiRequest.call(this, 'GET', '/wiki/api/v2/pages', {}, qs);
	const results = Array.isArray(response.results) ? (response.results as IDataObject[]) : [];

	if (results.length === 0) {
		throw new NodeOperationError(
			this.getNode(),
			`No page titled "${title}" found${spaceId === '' ? '' : ` in space "${spaceLabel}"`}`,
			{ itemIndex },
		);
	}
	if (results.length > 1) {
		const candidates = results
			.slice(0, 5)
			.map(
				(page) =>
					`"${asString(page.title)}" (space ${asString(page.spaceId)}, ID ${asString(page.id)})`,
			)
			.join(', ');
		throw new NodeOperationError(
			this.getNode(),
			`Found ${results.length} pages titled "${title}": ${candidates}${results.length > 5 ? ', …' : ''}. Scope the lookup with the Space field, or use the page ID.`,
			{ itemIndex },
		);
	}
	return asString(results[0].id);
}

/** Resolves the shared Page parameter to a page ID, whatever the selected mode. */
export async function resolvePageId(this: IExecuteFunctions, itemIndex: number): Promise<string> {
	const pageRef = this.getNodeParameter('page', itemIndex) as INodeParameterResourceLocator;

	if (pageRef.mode === 'title') {
		const title = String(pageRef.value ?? '').trim();
		if (title === '') {
			throw new NodeOperationError(this.getNode(), 'The page title must not be empty', {
				itemIndex,
			});
		}
		const spaceRef = this.getNodeParameter(
			'space',
			itemIndex,
			null,
		) as INodeParameterResourceLocator | null;
		const spaceId = spaceRef ? String(spaceRef.value ?? '').trim() : '';
		const spaceLabel =
			typeof spaceRef?.cachedResultName === 'string' && spaceRef.cachedResultName !== ''
				? spaceRef.cachedResultName
				: spaceId;
		return await resolvePageIdByTitle.call(this, itemIndex, title, spaceId, spaceLabel);
	}

	// From List / By ID pass the value through; By URL extracts the ID via the mode's regex
	const pageId = String(
		this.getNodeParameter('page', itemIndex, '', { extractValue: true }) as string,
	).trim();
	if (pageId === '') {
		throw new NodeOperationError(this.getNode(), "The 'Page' parameter is empty", { itemIndex });
	}
	return pageId;
}
