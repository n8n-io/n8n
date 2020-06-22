import { OptionsWithUri } from 'request';
import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';
import { IDataObject, NodeApiError, NodeOperationError, } from 'n8n-workflow';

export async function disqusApiRequest(
		this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
		method: string,
		qs: IDataObject = {},
		uri?: string,
		body: IDataObject = {},
		option: IDataObject = {},
	): Promise<any> { // tslint:disable-line:no-any

	const authenticationMethod = this.getNodeParameter('authentication', 0);

	let options: OptionsWithUri = {
		method,
		body,
		uri: `https://disqus.com/api/3.0/${uri}?`,
		json: true,
	};

	if (authenticationMethod === 'accessToken') {
		const credentials = await this.getCredentials('disqusApi') as IDataObject;
		if (credentials === undefined) {
			throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
		}
		qs.api_key = credentials.accessToken;
	}


	options = Object.assign({}, options, option);
	if (Object.keys(options.body).length === 0) {
		delete options.body;
	}

	// Convert to query string into a format the API can read
	const queryStringElements: string[] = [];
	for (const key of Object.keys(qs)) {
		if (Array.isArray(qs[key])) {
			(qs[key] as string[]).forEach(value => {
				queryStringElements.push(`${key}=${value}`);
			});
		} else {
			queryStringElements.push(`${key}=${qs[key]}`);
		}
	}

	options.uri = options.uri + queryStringElements.join('&');

	try {
		if (authenticationMethod === 'accessToken') {
			return await await this.helpers.request!(options);
		} else {
			return await this.helpers.requestOAuth2!.call(this, 'disqusOAuth2Api', options);
		}
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

/**
 * Make an API request to paginated flow endpoint
 * and return all results
 */
export async function disqusApiRequestAllItems(
		this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
		method: string,
		qs: IDataObject = {},
		uri?: string,
		body: IDataObject = {},
		option: IDataObject = {},
	): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	try {
		do {
			responseData = await disqusApiRequest.call(this, method, qs, uri, body, option);
			qs.cursor = responseData.cursor.id;
			returnData.push.apply(returnData, responseData.response);
		} while (
			responseData.cursor.more === true &&
			responseData.cursor.hasNext === true
		);
		return returnData;
		} catch(error) {
		throw error;
	}
}
