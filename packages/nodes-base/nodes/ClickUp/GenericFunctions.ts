import type { OptionsWithUri } from 'request';

import type {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import type { IDataObject, IOAuth2Options } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function clickupApiRequest(
	this:
		| IHookFunctions
		| IExecuteFunctions
		| IExecuteSingleFunctions
		| ILoadOptionsFunctions
		| IWebhookFunctions,
	method: string,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	_option: IDataObject = {},
): Promise<any> {
	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		qs,
		body,
		uri: uri || `https://api.clickup.com/api/v2${resource}`,
		json: true,
	};

	try {
		const authenticationMethod = this.getNodeParameter('authentication', 0) as string;

		if (authenticationMethod === 'accessToken') {
			return await this.helpers.requestWithAuthentication.call(this, 'clickUpApi', options);
		} else {
			const oAuth2Options: IOAuth2Options = {
				keepBearer: false,
				tokenType: 'Bearer',
			};
			// @ts-ignore
			return await this.helpers.requestOAuth2.call(
				this,
				'clickUpOAuth2Api',
				options,
				oAuth2Options,
			);
		}
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function clickupApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: string,
	resource: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.page = 0;

	do {
		responseData = await clickupApiRequest.call(this, method, resource, body, query);
		returnData.push.apply(returnData, responseData[propertyName]);
		query.page++;
		if (query.limit && query.limit <= returnData.length) {
			return returnData;
		}
	} while (responseData[propertyName] && responseData[propertyName].length !== 0);
	return returnData;
}

export function validateJSON(json: string | undefined): any {
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = undefined;
	}
	return result;
}
