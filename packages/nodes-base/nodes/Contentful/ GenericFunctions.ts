import { IExecuteFunctions } from 'n8n-core';
import { OptionsWithUrl } from 'request';

/**
 * @param  {IExecuteFunctions} that Reference to the system's execute functions
 * @param  {string} endpoint? Endpoint of api call
 * @param  {string} environmentId? Id of contentful environment (eg. master, staging, etc.)
 * @param  {Record<string|number>} qs? Query string, can be used for search parameters
 */
export const contentfulApiRequest = async (
	that: IExecuteFunctions,
	endpoint?: string,
	environmentId?: string,
	qs?: Record<string, string | number | undefined>
) => {
	const credentials = that.getCredentials('contentfulDeliveryApi');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	const source = that.getNodeParameter('source', 0) as string;
	const isPreview = source === 'preview_api';
	let accessToken = credentials.access_token as string;
	if (isPreview) {
		accessToken = credentials.access_token_preview as string;
		console.log('accessToken', accessToken);
		if (!accessToken) {
			throw new Error('No access token for preview API set in credentials!');
		}
	}

	let url = `https://${isPreview ? 'preview' : 'cdn'}.contentful.com/spaces/${credentials.space_id}`;
	if (environmentId) url = `${url}/environments/${environmentId}`;
	if (endpoint) url = `${url}${endpoint}`;
	qs = qs || {};
	qs.access_token = accessToken;

	const res = await that.helpers.request!({
		url,
		method: 'GET',
		qs
	} as OptionsWithUrl);

	return JSON.parse(res);
};
