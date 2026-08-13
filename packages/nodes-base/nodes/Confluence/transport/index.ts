import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { getAtlassianApiBaseUrl, getAtlassianCloudId } from '@utils/atlassian';

export const CONFLUENCE_CREDENTIAL_NAME = 'confluenceCloudOAuth2Api';

export async function confluenceApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<IDataObject> {
	const credentials = await this.getCredentials(CONFLUENCE_CREDENTIAL_NAME);
	// Keyed `domain` for backwards compatibility with Jira credentials; labeled "Site URL" in the UI
	const siteUrl = credentials.domain;
	if (typeof siteUrl !== 'string' || siteUrl === '') {
		throw new NodeOperationError(
			this.getNode(),
			'The Confluence credential is missing the Site URL field',
		);
	}
	const cloudId = await getAtlassianCloudId.call(
		this,
		CONFLUENCE_CREDENTIAL_NAME,
		siteUrl,
		'confluence',
	);

	// The URL is concatenated onto the api.atlassian.com base, so caller input can't
	// change the host; a future verbatim-URL param needs an origin check first.
	const options: IHttpRequestOptions = {
		method,
		url: `${getAtlassianApiBaseUrl('confluence', cloudId)}${endpoint}`,
		body,
		qs,
		json: true,
	};

	try {
		return await this.helpers.httpRequestWithAuthentication.call(
			this,
			CONFLUENCE_CREDENTIAL_NAME,
			options,
		);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
