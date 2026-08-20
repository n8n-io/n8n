import type {
	IDataObject,
	IExecuteFunctions,
	INodeParameterResourceLocator,
	INodeProperties,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { bodyProperties, readBodyEnvelope } from './bodyEnvelope';
import { pageRLC, spaceRLC } from '../common';
import { confluenceApiRequest } from '../../transport';

const showOnCreate = { resource: ['page'], operation: ['create'] };

export const description: INodeProperties[] = [
	{
		...spaceRLC,
		required: true,
		description: 'The space to create the page in',
		displayOptions: { show: showOnCreate },
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. Weekly Report',
		description: 'The title of the new page',
		displayOptions: { show: showOnCreate },
	},
	...bodyProperties(['create']),
	{
		...pageRLC,
		displayName: 'Parent Page',
		name: 'parentPage',
		required: false,
		description:
			'The page to create the new page under. Leave empty to create under the space homepage.',
		// By Title needs a title-to-ID resolver the create path does not have yet
		modes: (pageRLC.modes ?? []).filter((mode) => mode.name !== 'title'),
		displayOptions: {
			show: showOnCreate,
			// The API rejects root-level + parentId; hiding makes the combination unrepresentable
			hide: { '/options.rootLevel': [true] },
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: showOnCreate },
		options: [
			{
				displayName: 'Create as Draft',
				name: 'createAsDraft',
				type: 'boolean',
				default: false,
				description: 'Whether to create the page as a draft instead of publishing it',
			},
			{
				displayName: 'Private',
				name: 'private',
				type: 'boolean',
				default: false,
				description:
					'Whether only the creating user can view and edit the page. The creator is the connected account, which needs permission to restrict content in the space.',
			},
			{
				displayName: 'Root Level',
				name: 'rootLevel',
				type: 'boolean',
				default: false,
				description:
					'Whether to create the page at the space root, outside the space homepage tree. Cannot be combined with a parent page.',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	const spaceId = this.getNodeParameter('space', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const options = this.getNodeParameter('options', itemIndex, {});

	const rawTitle: unknown = this.getNodeParameter('title', itemIndex, '');
	// Objects coerce to '' so validation rejects them instead of titling the page '[object Object]'
	const title =
		typeof rawTitle === 'string'
			? rawTitle.trim()
			: rawTitle === null || rawTitle === undefined || typeof rawTitle === 'object'
				? ''
				: String(rawTitle).trim();

	if (!spaceId) {
		throw new NodeOperationError(this.getNode(), 'Space is required', { itemIndex });
	}
	if (!title) {
		throw new NodeOperationError(this.getNode(), 'Title is required', { itemIndex });
	}

	const body: IDataObject = {
		spaceId,
		status: options.createAsDraft ? 'draft' : 'current',
		title,
		body: readBodyEnvelope(this, itemIndex),
	};

	if (!options.rootLevel) {
		const parentRef = this.getNodeParameter('parentPage', itemIndex, '') as
			| INodeParameterResourceLocator
			| string;
		const rawParentValue =
			typeof parentRef === 'object' && parentRef !== null ? parentRef.value : parentRef;
		// The field is optional: an empty By URL value means "no parent", so only
		// extract (and regex-validate) once something is set
		if (String(rawParentValue ?? '').trim() !== '') {
			const parentId = this.getNodeParameter('parentPage', itemIndex, '', {
				extractValue: true,
			}) as string;
			if (parentId) body.parentId = parentId;
		}
	}

	const qs: IDataObject = {};
	if (options.private) qs.private = true;
	if (options.rootLevel) qs['root-level'] = true;

	try {
		return await confluenceApiRequest.call(this, 'POST', '/wiki/api/v2/pages', body, qs);
	} catch (error) {
		// Private creation applies a content restriction under the hood, and Atlassian
		// masks the failing permission/scope check as 404 on this endpoint
		if (options.private && error instanceof NodeApiError && error.httpCode === '404') {
			throw new NodeOperationError(this.getNode(), 'Could not create the page as private', {
				itemIndex,
				description:
					'Atlassian reports this as "not found", but it usually means the restriction step was refused: the connected user needs the "Add/Delete restrictions" permission in the space, and the credential\'s OAuth app must allow the content-restriction scopes. Try again without the Private option, or check the space permissions.',
			});
		}
		throw error;
	}
}
