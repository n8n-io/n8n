import { OptionsWithUri } from 'request';

import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-core';

import { IDataObject, NodeApiError } from 'n8n-workflow';

export async function pushbulletApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	path: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	qs: IDataObject = {},
	uri?: string | undefined,
	option = {},
	// tslint:disable-next-line:no-any
): Promise<any> {
	const options: OptionsWithUri = {
		method,
		body,
		qs,
		uri: uri || `https://api.pushbullet.com/v2${path}`,
		json: true,
	};
	try {
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		if (Object.keys(option).length !== 0) {
			Object.assign(options, option);
		}
		//@ts-ignore
		return await this.helpers.requestOAuth2.call(this, 'pushbulletOAuth2Api', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function pushbulletApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: string,
	endpoint: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	query: IDataObject = {},
	// tslint:disable-next-line:no-any
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	do {
		responseData = await pushbulletApiRequest.call(this, method, endpoint, body, query);
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (responseData.cursor !== undefined);

	return returnData;
}
