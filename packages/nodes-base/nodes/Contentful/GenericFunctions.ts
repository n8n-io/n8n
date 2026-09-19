import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function contentfulApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	_option: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('contentfulApi');
	const source = this.getNodeParameter('source', 0) as string;
	const isPreview = source === 'previewApi';

	const options: IRequestOptions = {
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
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function contentfulApiRequestAllItems(
	this: ILoadOptionsFunctions | IExecuteFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	resource: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	// Contentful's `skip` is the index of the first record to return, so it
	// has to advance by the page size to reach the next page.
	const limit = 100;
	query.limit = limit;
	query.skip = 0;

	do {
		responseData = await contentfulApiRequest.call(this, method, resource, body, query);
		query.skip = (query.skip as number) + limit;
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (returnData.length < responseData.total);

	return returnData;
}
