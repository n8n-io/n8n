import type { IExecuteFunctions, IExecuteSingleFunctions, ILoadOptionsFunctions } from 'n8n-core';

import type { OptionsWithUri } from 'request';

import type { IDataObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function contentfulApiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	_option: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('contentfulApi');
	const source = this.getNodeParameter('source', 0) as string;
	const isPreview = source === 'previewApi';

	const options: OptionsWithUri = {
		method,
		qs,
		body,
		uri: uri || `https://${isPreview ? 'preview' : 'cdn'}.contentful.com${resource}`,
		json: true,
	};

	if (isPreview) {
		qs.access_token = credentials.ContentPreviewaccessToken as string;
	} else {
		qs.access_token = credentials.ContentDeliveryaccessToken as string;
	}

	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function contenfulApiRequestAllItems(
	this: ILoadOptionsFunctions | IExecuteFunctions,
	propertyName: string,
	method: string,
	resource: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	query.limit = 100;
	query.skip = 0;

	do {
		responseData = await contentfulApiRequest.call(this, method, resource, body, query);
		query.skip = (query.skip + 1) * query.limit;
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (returnData.length < responseData.total);

	return returnData;
}
