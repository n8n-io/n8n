import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { confluenceApiRequest } from '../../transport';
import { optionalSpaceRLC, pageRLC, resolvePageId } from '../common';
import type { ConfluenceOperation } from '../router';

const showOnDelete = { resource: ['page'], operation: ['delete'] };

const NOT_FOUND_DESCRIPTION =
	'The page may not exist or may already be in the trash. The ID may belong to another content type, such as a space or a blog post. The connected user may lack view or "Delete pages" permission in the page\'s space (Confluence reports permission failures as "not found"). The page may also be an unsaved draft.';

export const description: INodeProperties[] = [
	{
		displayName:
			"Deleting a page does not delete its child pages — they move up to the deleted page's parent",
		name: 'deleteChildrenNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: showOnDelete },
	},
	{
		...optionalSpaceRLC,
		displayOptions: { show: showOnDelete },
	},
	{
		...pageRLC,
		description: 'The page to delete',
		displayOptions: { show: showOnDelete },
	},
	{
		displayName: 'Permanently Delete (Purge)',
		name: 'purge',
		type: 'boolean',
		default: false,
		description:
			"Whether to permanently delete the page instead of moving it to trash. This cannot be undone and requires admin permission in the page's space.",
		displayOptions: { show: showOnDelete },
	},
];

export const execute: ConfluenceOperation = async function (
	this: IExecuteFunctions,
	itemIndex: number,
) {
	const purge = this.getNodeParameter('purge', itemIndex, false) as boolean;
	const pageId = await resolvePageId.call(this, itemIndex);
	const endpoint = `/wiki/api/v2/pages/${encodeURIComponent(pageId)}`;

	let trashConfirmed = false;
	try {
		await confluenceApiRequest.call(this, 'DELETE', endpoint);
		trashConfirmed = true;
	} catch (error) {
		// The OAuth scope is only the ceiling — deleting also needs the space-level permission
		if (error instanceof NodeApiError && error.httpCode === '403') {
			throw new NodeOperationError(this.getNode(), 'Confluence refused to delete the page', {
				itemIndex,
				description:
					'The connected user needs the "Delete pages" permission in the page\'s space; no OAuth scope change can grant it.',
			});
		}
		const notFound = error instanceof NodeApiError && error.httpCode === '404';
		// Confluence masks permission failures on this endpoint as 404
		if (notFound && !purge) {
			throw new NodeOperationError(this.getNode(), 'Confluence could not delete the page', {
				itemIndex,
				description: NOT_FOUND_DESCRIPTION,
			});
		}
		// A page that is already in the trash 404s on the plain DELETE; when purging,
		// continue so the purge request still runs (a missing page 404s again there)
		if (!notFound) {
			throw error;
		}
	}

	// The API only purges pages that are already trashed, so purge is a second request
	if (purge) {
		try {
			await confluenceApiRequest.call(this, 'DELETE', endpoint, {}, { purge: true });
		} catch (error) {
			const forbidden = error instanceof NodeApiError && error.httpCode === '403';
			const notFound = error instanceof NodeApiError && error.httpCode === '404';
			// A 403 means the page exists, so it sits in the trash whether or not this
			// run is what put it there
			if (forbidden || (notFound && trashConfirmed)) {
				throw new NodeOperationError(
					this.getNode(),
					'The page is in the trash, but could not be purged',
					{
						itemIndex,
						description:
							'Permanently deleting a page requires admin permission in its space. The page can be restored from the Confluence UI.',
					},
				);
			}
			if (notFound) {
				throw new NodeOperationError(this.getNode(), 'Confluence could not delete the page', {
					itemIndex,
					description: NOT_FOUND_DESCRIPTION,
				});
			}
			throw error;
		}
	}

	return { deleted: true, pageId, purged: purge };
};
