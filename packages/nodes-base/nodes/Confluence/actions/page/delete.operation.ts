import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { confluenceApiRequest } from '../../transport';
import { optionalSpaceRLC, pageRLC, resolvePageId } from '../common';
import type { ConfluenceOperation } from '../router';

const showOnDelete = { resource: ['page'], operation: ['delete'] };

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

	try {
		await confluenceApiRequest.call(this, 'DELETE', endpoint);
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
				description:
					'The page may not exist or may already be in the trash, the connected user may lack view or "Delete pages" permission in the page\'s space (Confluence reports permission failures as "not found"), or the page is an unsaved draft.',
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
			if (error instanceof NodeApiError && error.httpCode === '403') {
				throw new NodeOperationError(
					this.getNode(),
					'The page was moved to trash, but could not be purged',
					{
						itemIndex,
						description:
							'Permanently deleting a page requires admin permission in its space. The page remains in the trash and can be restored from the Confluence UI.',
					},
				);
			}
			throw error;
		}
	}

	return { deleted: true, pageId, purged: purge };
};
