import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { confluenceApiRequest } from '../../transport';
import type { ConfluenceOperation } from '../router';

const showOnDeleteComment = { resource: ['page'], operation: ['deleteComment'] };

export const description: INodeProperties[] = [
	{
		displayName: 'Deleting a comment is permanent — it does not go to the trash',
		name: 'deleteCommentNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: showOnDeleteComment },
	},
	{
		displayName: 'Comment ID',
		name: 'commentId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 123456',
		description: 'The ID of the footer comment to delete',
		displayOptions: { show: showOnDeleteComment },
	},
];

export const execute: ConfluenceOperation = async function (
	this: IExecuteFunctions,
	itemIndex: number,
) {
	const commentId = String(this.getNodeParameter('commentId', itemIndex, '') ?? '').trim();
	if (commentId === '') {
		throw new NodeOperationError(this.getNode(), "The 'Comment ID' parameter is empty", {
			itemIndex,
		});
	}

	try {
		await confluenceApiRequest.call(
			this,
			'DELETE',
			`/wiki/api/v2/footer-comments/${encodeURIComponent(commentId)}`,
		);
	} catch (error) {
		// Atlassian masks permission failures on this endpoint as 404
		if (error instanceof NodeApiError && error.httpCode === '404') {
			throw new NodeOperationError(this.getNode(), 'Confluence could not delete the comment', {
				itemIndex,
				description:
					'The comment may not exist or may already be deleted, or the connected user may lack view or delete permission on its page (Confluence reports permission failures as "not found").',
			});
		}
		throw error;
	}

	// DELETE replies 204 with no body
	return { deleted: true, commentId };
};
