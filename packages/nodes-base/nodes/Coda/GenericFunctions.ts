import { OptionsWithUri } from 'request';
import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';
import { IDataObject } from 'n8n-workflow';

export async function codaApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('codaApi');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	let options: OptionsWithUri = {
		headers: { 'Authorization': `Bearer ${credentials.accessToken}`},
		method,
		qs,
		body,
		uri: uri ||`https://coda.io/apis/v1${resource}`,
		json: true
	};
	options = Object.assign({}, options, option);
	if (Object.keys(options.body).length === 0) {
		delete options.body;
	}

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		let errorMessage = error.message;
		if (error.response.body) {
			errorMessage = error.response.body.message || error.response.body.Message || error.message;
		}

		throw new Error('Coda Error: ' + errorMessage);
	}
}

/**
 * Make an API request to paginated coda endpoint
 * and return all results
 */
export async function codaApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, propertyName: string, method: string, resource: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	query.limit = 100;

	let uri: string | undefined;

	do {
		responseData = await codaApiRequest.call(this, method, resource, body, query, uri);
		uri = responseData.nextPageLink;
		// @ts-ignore
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (
		responseData.nextPageLink !== undefined &&
		responseData.nextPageLink !== ''
	);

	return returnData;
}
