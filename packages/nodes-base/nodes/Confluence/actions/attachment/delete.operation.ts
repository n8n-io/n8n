import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { confluenceApiRequest } from '../../transport';
import type { ConfluenceOperation } from '../router';

const showOnDelete = { resource: ['attachment'], operation: ['delete'] };

export const description: INodeProperties[] = [
	{
		displayName: 'Attachment ID',
		name: 'attachmentId',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. att123456',
		description:
			'The ID of the attachment to delete. Attachment IDs come from the Get Many operation.',
		displayOptions: { show: showOnDelete },
	},
	{
		displayName: 'Permanently Delete (Purge)',
		name: 'purge',
		type: 'boolean',
		default: false,
		description:
			"Whether to permanently delete the attachment instead of moving it to trash. This cannot be undone and requires admin permission in the attachment's space.",
		displayOptions: { show: showOnDelete },
	},
];

/** Moves the attachment to trash. Resolves silently on a 404 while purging,
 * since an attachment already in the trash 404s here too, and the purge
 * request that follows is the one that actually needs to run. */
async function trashAttachment(
	this: IExecuteFunctions,
	endpoint: string,
	purge: boolean,
	itemIndex: number,
): Promise<void> {
	try {
		await confluenceApiRequest.call(this, 'DELETE', endpoint);
	} catch (error) {
		// The endpoint documents no 403; permission failures arrive as 404
		if (!(error instanceof NodeApiError && error.httpCode === '404')) throw error;
		if (purge) return;
		throw new NodeOperationError(this.getNode(), 'Confluence could not delete the attachment', {
			itemIndex,
			description:
				'The attachment may not exist or may already be in the trash, or the connected user may lack permission to view its page or to delete attachments in the space (Confluence reports permission failures as "not found").',
		});
	}
}

/** Permanently removes an already-trashed attachment. Only called once
 * `trashAttachment` has already moved it there. */
async function purgeAttachment(
	this: IExecuteFunctions,
	endpoint: string,
	itemIndex: number,
): Promise<void> {
	try {
		await confluenceApiRequest.call(this, 'DELETE', endpoint, {}, { purge: true });
	} catch (error) {
		// Whatever the cause, the attachment is now trashed but not purged. Saying so
		// matters more than the status code, which this endpoint does not document.
		throw new NodeOperationError(
			this.getNode(),
			'The attachment was moved to trash, but could not be purged',
			{
				itemIndex,
				description: `The attachment is in the trash and can be restored from the Confluence UI. Permanently deleting one usually requires permission to administer the space. Confluence said: ${error instanceof Error ? error.message : String(error)}`,
			},
		);
	}
}

export const execute: ConfluenceOperation = async function (
	this: IExecuteFunctions,
	itemIndex: number,
) {
	const attachmentId = String(this.getNodeParameter('attachmentId', itemIndex, '')).trim();
	if (attachmentId === '') {
		throw new NodeOperationError(this.getNode(), "The 'Attachment ID' parameter is empty", {
			itemIndex,
		});
	}

	// Strict compare, not a cast: an expression can hand back the string "false",
	// which is truthy and would permanently delete the attachment by accident
	const purge = this.getNodeParameter('purge', itemIndex, false) === true;
	const endpoint = `/wiki/api/v2/attachments/${encodeURIComponent(attachmentId)}`;

	await trashAttachment.call(this, endpoint, purge, itemIndex);
	if (purge) await purgeAttachment.call(this, endpoint, itemIndex);

	// Responds 204 with no body, so report the outcome in page:delete's shape
	return { deleted: true, attachmentId, purged: purge };
};
