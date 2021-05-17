import { OptionsWithUri } from 'request';
import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';
import { IDataObject, NodeApiError, NodeOperationError, } from 'n8n-workflow';

export async function bitbucketApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = await this.getCredentials('bitbucketApi');
	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
	}
	let options: OptionsWithUri = {
		method,
		auth: {
			user: credentials.username as string,
			password: credentials.appPassword as string,
		},
		qs,
		body,
		uri: uri ||`https://api.bitbucket.org/2.0${resource}`,
		json: true,
	};
	options = Object.assign({}, options, option);
	if (Object.keys(options.body).length === 0) {
		delete options.body;
	}

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

/**
 * Make an API request to paginated flow endpoint
 * and return all results
 */
export async function bitbucketApiRequestAllItems(this: IHookFunctions | IExecuteFunctions| ILoadOptionsFunctions, propertyName: string, method: string, resource: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	let uri: string | undefined;

	do {
		responseData = await bitbucketApiRequest.call(this, method, resource, body, query, uri);
		uri = responseData.next;
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (
		responseData.next !== undefined
	);

	return returnData;
}
