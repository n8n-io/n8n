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

	let url = `https://cdn.contentful.com/spaces/${credentials.space_id}`;
	if (environmentId) url = `${url}/environments/${environmentId}`;
	if (endpoint) url = `${url}${endpoint}`;
	qs = qs || {};
	qs.access_token = credentials.access_token as string;

	const res = await that.helpers.request!({
		url,
		method: 'GET',
		qs
	} as OptionsWithUrl);

	return JSON.parse(res);
};
