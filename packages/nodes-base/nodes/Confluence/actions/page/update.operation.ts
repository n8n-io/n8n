import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { bodyProperties, readBodyEnvelopeIfProvided } from './bodyEnvelope';
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
	...bodyProperties(['update'], 'Leave empty to keep the current page content'),
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		default: 'keep',
		description: 'Whether the page is published or a draft after the update',
		options: [
			{
				name: 'Draft',
				value: 'draft',
				description: 'Save the update as a draft. Replaces any existing draft of the page.',
			},
			{
				name: 'Keep Current Status',
				value: 'keep',
				description: 'A published page stays published, a draft stays a draft',
			},
			{
				name: 'Published',
				value: 'current',
				description: 'Publish the page; use this to publish a page created as a draft',
			},
		],
		displayOptions: { show: showOnUpdate },
	},
];

export const execute: ConfluenceOperation = async function (
	this: IExecuteFunctions,
	itemIndex: number,
) {
	const body = readBodyEnvelopeIfProvided(this, itemIndex);

	const rawTitle: unknown = this.getNodeParameter('title', itemIndex, '');
	// An empty title means "keep the current one", so an object from an
	// expression must fail loudly instead of silently keeping the old title
	if (rawTitle !== null && typeof rawTitle === 'object') {
		throw new NodeOperationError(this.getNode(), 'New Title must be text', { itemIndex });
	}
	const title = rawTitle === null || rawTitle === undefined ? '' : String(rawTitle).trim();

	const pageId = await resolvePageId.call(this, itemIndex);
	const page = await fetchPageForWrite.call(
		this,
		itemIndex,
		pageId,
		body === undefined ? 'storage' : undefined,
	);

	const statusChoice = this.getNodeParameter('status', itemIndex, 'keep');
	const status =
		statusChoice === 'current' || statusChoice === 'draft' ? statusChoice : page.status;

	return await putPage.call(
		this,
		itemIndex,
		pageId,
		page,
		title === '' ? page.title : title,
		body ?? { representation: 'storage', value: page.bodyValue },
		status,
	);
};
