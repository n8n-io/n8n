import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { bodyProperties, readBodyEnvelope } from './bodyEnvelope';
import { fetchPageForWrite, putPage } from './pageWrite';
import { optionalSpaceRLC, pageRLC, resolvePageId } from '../common';
import type { ConfluenceOperation } from '../router';

const showOnUpdate = { resource: ['page'], operation: ['update'] };

export const description: INodeProperties[] = [
	{
		...optionalSpaceRLC,
		description:
			'Limits page selection and By Title lookups to one space. Leave empty or pick "All Spaces" to search across all spaces.',
		displayOptions: { show: showOnUpdate },
	},
	{
		...pageRLC,
		description: 'The page to update',
		displayOptions: { show: showOnUpdate },
	},
	{
		displayName: 'New Title',
		name: 'title',
		type: 'string',
		default: '',
		placeholder: 'e.g. Weekly Report',
		description: 'The new title of the page. Leave empty to keep the current title.',
		displayOptions: { show: showOnUpdate },
	},
	...bodyProperties(['update']),
];

export const execute: ConfluenceOperation = async function (
	this: IExecuteFunctions,
	itemIndex: number,
) {
	const body = readBodyEnvelope(this, itemIndex);

	const rawTitle: unknown = this.getNodeParameter('title', itemIndex, '');
	// An empty title means "keep the current one", so an object from an
	// expression must fail loudly instead of silently keeping the old title
	if (rawTitle !== null && typeof rawTitle === 'object') {
		throw new NodeOperationError(this.getNode(), 'New Title must be text', { itemIndex });
	}
	const title = rawTitle === null || rawTitle === undefined ? '' : String(rawTitle).trim();

	const pageId = await resolvePageId.call(this, itemIndex);
	const page = await fetchPageForWrite.call(this, itemIndex, pageId);

	// Confluence requires a title on every PUT, so keeping it means resending it
	return await putPage.call(this, itemIndex, pageId, page, title === '' ? page.title : title, body);
};
