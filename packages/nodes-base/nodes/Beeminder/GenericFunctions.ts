import type { OptionsWithUri } from 'request';

import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-workflow';

const BEEMINDER_URI = 'https://www.beeminder.com/api/v1';

export async function beeminderApiRequest(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const options: OptionsWithUri = {
		method,
		body,
		qs: query,
		uri: `${BEEMINDER_URI}${endpoint}`,
		json: true,
	};

	if (!Object.keys(body as IDataObject).length) {
		delete options.body;
	}

	if (!Object.keys(query).length) {
		delete options.qs;
	}

	return this.helpers.requestWithAuthentication.call(this, 'beeminderApi', options);
}

export async function beeminderApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	method: string,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.page = 1;
	do {
		responseData = await beeminderApiRequest.call(this, method, endpoint, body, query);
		query.page++;
		returnData.push.apply(returnData, responseData as IDataObject[]);
	} while (responseData.length !== 0);

	return returnData;
}
