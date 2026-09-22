import { DATABRICKS_PARTNER_USER_AGENT } from 'n8n-nodes-base/dist/nodes/Databricks/constants';
import { NodeOperationError, type ILoadOptionsFunctions } from 'n8n-workflow';

import { DATABRICKS_CREDENTIAL_TYPE } from './token-provider';

const MAX_PAGES = 50;

interface Page {
	next_page_token?: string;
}

/**
 * Follows `next_page_token` through a Databricks list endpoint and concatenates
 * what `pick` keeps from each page. Every picker pages through this one function
 * so the request shape, and the redirect guard, cannot drift between them.
 */
export async function listDatabricksPages<P extends Page, T>(
	ctx: ILoadOptionsFunctions,
	url: string,
	qs: Record<string, string | undefined>,
	pick: (page: P) => T[] | undefined,
): Promise<T[]> {
	let items: T[] = [];
	let pageToken: string | undefined;
	let pages = 0;
	do {
		// Guard against a host or proxy that echoes the same next_page_token back
		if (++pages > MAX_PAGES) {
			throw new NodeOperationError(ctx.getNode(), `Databricks list exceeded ${MAX_PAGES} pages`);
		}
		const page: P = await ctx.helpers.httpRequestWithAuthentication.call(
			ctx,
			DATABRICKS_CREDENTIAL_TYPE,
			{
				method: 'GET',
				url,
				qs: { ...qs, page_token: pageToken },
				headers: { Accept: 'application/json', 'User-Agent': DATABRICKS_PARTNER_USER_AGENT },
				json: true,
				// The bearer must not follow a redirect off the workspace host
				sendCredentialsOnCrossOriginRedirect: false,
			},
		);
		items = items.concat(pick(page) ?? []);
		pageToken = page.next_page_token;
	} while (pageToken);
	return items;
}
