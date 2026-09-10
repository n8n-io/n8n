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

/**
 * Moves the attachment to trash. Returns whether the trash was actually
 * confirmed by a successful DELETE, as opposed to assumed: a 404 while
 * purging is swallowed because an attachment already in the trash 404s
 * here too, but that same 404 also covers a bad ID or a permission
 * failure this endpoint masks as "not found". The caller needs to know
 * which case it was to describe a later purge failure accurately.
 */
async function trashAttachment(
	this: IExecuteFunctions,
	endpoint: string,
	purge: boolean,
	itemIndex: number,
): Promise<boolean> {
	try {
		await confluenceApiRequest.call(this, 'DELETE', endpoint);
		return true;
	} catch (error) {
		// The endpoint documents no 403; permission failures arrive as 404
		if (!(error instanceof NodeApiError && error.httpCode === '404')) throw error;
		if (purge) return false;
		throw new NodeOperationError(this.getNode(), 'Confluence could not delete the attachment', {
			itemIndex,
			description:
				'The attachment may not exist or may already be in the trash, or the connected user may lack permission to view its page or to delete attachments in the space (Confluence reports permission failures as "not found").',
		});
	}
}

/** Permanently removes an attachment. Only called once `trashAttachment`
 * has moved it there or the trash step was assumed already done. */
async function purgeAttachment(
	this: IExecuteFunctions,
	endpoint: string,
	itemIndex: number,
	trashConfirmed: boolean,
): Promise<void> {
	try {
		await confluenceApiRequest.call(this, 'DELETE', endpoint, {}, { purge: true });
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		// Only claim the attachment is safely in the trash when the first request
		// actually confirmed it; a swallowed 404 could equally mean a bad ID or a
		// permission failure, neither of which leaves anything to restore
		if (trashConfirmed) {
			throw new NodeOperationError(
				this.getNode(),
				'The attachment was moved to trash, but could not be purged',
				{
					itemIndex,
					description: `The attachment is in the trash and can be restored from the Confluence UI. Permanently deleting one usually requires permission to administer the space. Confluence said: ${detail}`,
				},
			);
		}
		throw new NodeOperationError(
			this.getNode(),
			'Confluence could not permanently delete the attachment',
			{
				itemIndex,
				description: `The attachment may not exist, may never have been in the trash, or the connected user may lack permission to view its page or to delete or purge attachments in the space. Confluence said: ${detail}`,
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

	const trashConfirmed = await trashAttachment.call(this, endpoint, purge, itemIndex);
	if (purge) await purgeAttachment.call(this, endpoint, itemIndex, trashConfirmed);

	// Responds 204 with no body, so report the outcome in page:delete's shape
	return { deleted: true, attachmentId, purged: purge };
};
