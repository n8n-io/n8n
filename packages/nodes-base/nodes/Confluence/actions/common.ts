import type {
	IDataObject,
	IExecuteFunctions,
	INodeParameterResourceLocator,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { confluenceApiRequest } from '../transport';

export const PAGE_LIMIT = 250;

/**
 * Shared page-selection fields: operations spread `pageRLC`/`bodyFormatOption`
 * (and `spaceOption` into their Options collection), add their own
 * displayOptions, and resolve the selection with `resolvePageId`.
 */
export const pageRLC: INodeProperties = {
	displayName: 'Page',
	name: 'page',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	description: 'The page to operate on',
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
};

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

export const spaceOption: INodeProperties = {
	displayName: 'Space',
	name: 'space',
	type: 'string',
	default: '',
	placeholder: 'e.g. DOCS',
	description:
		'Space key or numeric space ID that scopes a By Title lookup. Without it, a unique site-wide match is required and multiple matches produce an error listing the candidates. Ignored for the other page modes.',
};

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
		const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;
		const space = typeof options.space === 'string' ? options.space.trim() : '';
		return await resolvePageIdByTitle.call(this, itemIndex, title, space);
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
