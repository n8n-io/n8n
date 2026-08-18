import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import type { ConfluenceBodyEnvelope } from './bodyEnvelope';
import { confluenceApiRequest } from '../../transport';

/**
 * Shared fetch → modify → PUT machinery for the Update and Append operations.
 * Confluence uses optimistic locking: every PUT must carry
 * `version.number = current + 1`, so both operations read the page first and
 * a stale number (someone edited in between) surfaces as a 409.
 */

export interface ConfluencePageSnapshot {
	status: 'current' | 'draft';
	title: string;
	versionNumber: number;
	bodyValue: string;
}

export async function fetchPageForWrite(
	this: IExecuteFunctions,
	itemIndex: number,
	pageId: string,
	bodyFormat?: ConfluenceBodyEnvelope['representation'],
): Promise<ConfluencePageSnapshot> {
	const qs: IDataObject = {};
	if (bodyFormat !== undefined) qs['body-format'] = bodyFormat;

	const page = await confluenceApiRequest.call(
		this,
		'GET',
		`/wiki/api/v2/pages/${encodeURIComponent(pageId)}`,
		{},
		qs,
	);

	const versionNumber = (page.version as IDataObject | undefined)?.number;
	if (typeof versionNumber !== 'number') {
		throw new NodeOperationError(this.getNode(), 'Could not read the current version of the page', {
			itemIndex,
		});
	}

	const bodyEnvelope =
		bodyFormat === undefined
			? undefined
			: ((page.body as IDataObject | undefined)?.[bodyFormat] as IDataObject | undefined);

	return {
		// Echoed back on the PUT so updating a draft does not publish it
		status: page.status === 'draft' ? 'draft' : 'current',
		title: typeof page.title === 'string' ? page.title : '',
		versionNumber,
		bodyValue: typeof bodyEnvelope?.value === 'string' ? bodyEnvelope.value : '',
	};
}

export async function putPage(
	this: IExecuteFunctions,
	itemIndex: number,
	pageId: string,
	snapshot: ConfluencePageSnapshot,
	title: string,
	body: ConfluenceBodyEnvelope,
): Promise<IDataObject> {
	const payload: IDataObject = {
		id: pageId,
		status: snapshot.status,
		title,
		body,
		version: { number: snapshot.versionNumber + 1 },
	};

	try {
		return await confluenceApiRequest.call(
			this,
			'PUT',
			`/wiki/api/v2/pages/${encodeURIComponent(pageId)}`,
			payload,
		);
	} catch (error) {
		// The version fetched above went stale: the page changed between the
		// read and this write. The collision is detected, never overwritten.
		if (error instanceof NodeApiError && error.httpCode === '409') {
			throw new NodeOperationError(this.getNode(), 'The page was modified concurrently', {
				itemIndex,
				description:
					'Someone else changed the page between this operation reading it and saving it. Nothing was overwritten — run the node again to apply the change to the latest version of the page.',
			});
		}
		throw error;
	}
}
