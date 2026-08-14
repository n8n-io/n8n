import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeProperties,
} from 'n8n-workflow';

import { CONFLUENCE_CREDENTIAL_NAME, confluenceApiRequest } from '../transport';

/**
 * Shared page-selection fields: operations spread `spaceRLC`/`pageRLC` and add
 * their own displayOptions. An empty space leaves page lookups site-wide.
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

export function extractNextCursor(response: IDataObject): string | undefined {
	const next = (response._links as IDataObject | undefined)?.next;
	if (typeof next !== 'string' || next === '') return undefined;
	try {
		return new URL(next, 'https://api.atlassian.com').searchParams.get('cursor') ?? undefined;
	} catch {
		return undefined;
	}
}
