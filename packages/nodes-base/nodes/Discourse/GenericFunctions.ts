import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

export async function discourseApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, path: string, body: any = {}, qs: IDataObject = {}, option = {}): Promise<any> { // tslint:disable-line:no-any

	const credentials = this.getCredentials('discourseApi') as IDataObject;

	const options: OptionsWithUri = {
		headers: {
			'Api-Key': credentials.apiKey,
			'Api-Username': credentials.username,
		},
		method,
		body,
		qs,
		uri: `${credentials.url}${path}`,
		json: true,
	};

	try {
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		//@ts-ignore
		return await this.helpers.request.call(this, options);
	} catch (error) {
		if (error.response && error.response.body && error.response.body.errors) {

			const errors = error.response.body.errors;
			// Try to return the error prettier
			throw new Error(
				`Discourse error response [${error.statusCode}]: ${errors.join('|')}`,
			);
		}
		throw error;
	}
}

export async function discourseApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;
	query.page = 1;
	do {
		responseData = await discourseApiRequest.call(this, method, endpoint, body, query);
		returnData.push.apply(returnData, responseData);
		query.page++;
	} while (
		responseData.length !== 0
	);
	return returnData;
}
