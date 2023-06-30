import type { OptionsWithUri } from 'request';

import type {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function automizyApiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	path: string,

	body: any = {},
	qs: IDataObject = {},
	option = {},
): Promise<any> {
	const credentials = (await this.getCredentials('automizyApi')) as IDataObject;

	const options: OptionsWithUri = {
		headers: {
			Authorization: `Bearer ${credentials.apiToken}`,
		},
		method,
		body,
		qs,
		uri: `https://gateway.automizy.com/v2${path}`,
		json: true,
	};

	try {
		if (Object.keys(body as IDataObject).length === 0) {
			delete options.body;
		}
		if (Object.keys(qs).length === 0) {
			delete options.qs;
		}
		if (Object.keys(option).length !== 0) {
			Object.assign(options, option);
		}
		//@ts-ignore
		return await this.helpers.request.call(this, options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function automizyApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: string,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.limit = 100;
	query.page = 1;
	do {
		responseData = await automizyApiRequest.call(this, method, endpoint, body, query);
		query.page++;
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData.pageCount !== responseData.page);

	return returnData;
}
