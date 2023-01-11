import { OptionsWithUri } from 'request';

import { IExecuteFunctions } from 'n8n-core';

import { IDataObject, JsonObject, NodeApiError } from 'n8n-workflow';

import { ElasticsearchApiCredentials } from './types';

export async function elasticsearchApiRequest(
	this: IExecuteFunctions,
	method: 'GET' | 'PUT' | 'POST' | 'DELETE',
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const { baseUrl, ignoreSSLIssues } = (await this.getCredentials(
		'elasticsearchApi',
	)) as ElasticsearchApiCredentials;

	const options: OptionsWithUri = {
		method,
		body,
		qs,
		uri: `${baseUrl}${endpoint}`,
		json: true,
		rejectUnauthorized: !ignoreSSLIssues,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	try {
		return await this.helpers.requestWithAuthentication.call(this, 'elasticsearchApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function elasticsearchApiRequestAllItems(
	this: IExecuteFunctions,
	indexId: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<any> {
	//https://www.elastic.co/guide/en/elasticsearch/reference/7.16/paginate-search-results.html#search-after
	try {
		//create a point in time (PIT) to preserve the current index state over your searches
		let pit = (
			await elasticsearchApiRequest.call(this, 'POST', `/${indexId}/_pit`, {}, { keep_alive: '1m' })
		)?.id as string;

		let returnData: IDataObject[] = [];
		let responseData;
		let searchAfter: string[] = [];

		const requestBody: IDataObject = {
			...body,
			size: 10000,
			pit: {
				id: pit,
				keep_alive: '1m',
			},
			track_total_hits: false, //Disable the tracking of total hits to speed up pagination
		};

		responseData = await elasticsearchApiRequest.call(this, 'GET', '/_search', requestBody, qs);
		if (responseData?.hits?.hits) {
			returnData = returnData.concat(responseData.hits.hits);
			const lastHitIndex = responseData.hits.hits.length - 1;
			//Sort values for the last returned hit with the tiebreaker value
			searchAfter = responseData.hits.hits[lastHitIndex].sort;
			//Update id for the point in time
			pit = responseData.pit_id;
		} else {
			return [];
		}

		while (true) {
			requestBody.search_after = searchAfter;
			requestBody.pit = { id: pit, keep_alive: '1m' };

			responseData = await elasticsearchApiRequest.call(this, 'GET', '/_search', requestBody, qs);

			if (responseData?.hits?.hits?.length) {
				returnData = returnData.concat(responseData.hits.hits);
				const lastHitIndex = responseData.hits.hits.length - 1;
				searchAfter = responseData.hits.hits[lastHitIndex].sort;
				pit = responseData.pit_id;
			} else {
				break;
			}
		}

		await elasticsearchApiRequest.call(this, 'DELETE', '/_pit', { id: pit });

		return returnData;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
