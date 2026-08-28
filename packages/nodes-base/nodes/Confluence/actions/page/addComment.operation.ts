import type {
	IDataObject,
	IDisplayOptions,
	IExecuteFunctions,
	INodeProperties,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { bodyProperties, envelopeHasContent, readBodyEnvelope } from './bodyEnvelope';
import { confluenceApiRequest } from '../../transport';
import { optionalSpaceRLC, pageRLC, resolvePageId } from '../common';
import type { ConfluenceOperation } from '../router';

const showOnAddComment = { resource: ['page'], operation: ['addComment'] };
// Replies target the parent comment, so the page pickers disappear once one is set;
// \S (not `exists`) keeps them visible for whitespace-only values, which execute treats as absent
const hideOnReply: IDisplayOptions['hide'] = { parentCommentId: [{ _cnd: { regex: '\\S' } }] };

export const description: INodeProperties[] = [
	{
		displayName: 'Parent Comment ID',
		name: 'parentCommentId',
		type: 'string',
		default: '',
		placeholder: 'e.g. 123456',
		description:
			'Leave empty to comment directly on a page. Set to reply to an existing footer comment; the page is inferred from the parent.',
		displayOptions: { show: showOnAddComment },
	},
	{
		...optionalSpaceRLC,
		displayOptions: { show: showOnAddComment, hide: hideOnReply },
	},
	{
		...pageRLC,
		description: 'The page to comment on',
		displayOptions: { show: showOnAddComment, hide: hideOnReply },
	},
	...bodyProperties(['addComment'], undefined, 'Comment content'),
];

export const execute: ConfluenceOperation = async function (
	this: IExecuteFunctions,
	itemIndex: number,
) {
	const body = readBodyEnvelope(this, itemIndex);
	// An empty body is valid for a page, but a comment without content is never intended
	if (!envelopeHasContent(body)) {
		throw new NodeOperationError(this.getNode(), 'The comment body is empty', {
			itemIndex,
			description: 'Provide the comment content in the Body field.',
		});
	}
	const parentCommentId = String(
		this.getNodeParameter('parentCommentId', itemIndex, '') ?? '',
	).trim();

	// The API takes exactly one container: a parent comment (reply, page inferred) or a page
	const payload: IDataObject = { body };
	if (parentCommentId !== '') {
		payload.parentCommentId = parentCommentId;
	} else {
		payload.pageId = await resolvePageId.call(this, itemIndex);
	}

	try {
		return await confluenceApiRequest.call(this, 'POST', '/wiki/api/v2/footer-comments', payload);
	} catch (error) {
		// Atlassian masks permission failures on this endpoint as 404
		if (error instanceof NodeApiError && error.httpCode === '404') {
			throw new NodeOperationError(this.getNode(), 'Confluence could not add the comment', {
				itemIndex,
				description:
					parentCommentId === ''
						? 'The page may not exist, or the connected user may lack view or comment permission in its space (Confluence reports permission failures as "not found").'
						: 'The parent comment may not exist, or the connected user may lack view or comment permission on its page (Confluence reports permission failures as "not found").',
			});
		}
		throw error;
	}
};
