import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

/**
 * Make an API request to Dropbox
 *
 */
export async function dropboxApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: object,
	query: IDataObject = {},
	headers: IDataObject = {},
	option: IDataObject = {},
): Promise<any> {
	const options: IRequestOptions = {
		headers,
		method,
		qs: query,
		body,
		uri: endpoint,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	Object.assign(options, option);

	const authenticationMethod = this.getNodeParameter('authentication', 0) as string;

	try {
		if (authenticationMethod === 'accessToken') {
			return await this.helpers.requestWithAuthentication.call(this, 'dropboxApi', options);
		} else {
			return await this.helpers.requestOAuth2.call(this, 'dropboxOAuth2Api', options);
		}
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function dropboxpiRequestAllItems(
	this: IExecuteFunctions | IHookFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
	headers: IDataObject = {},
): Promise<any> {
	const resource = this.getNodeParameter('resource', 0) as string;

	const returnData: IDataObject[] = [];

	const paginationEndpoint: IDataObject = {
		folder: 'https://api.dropboxapi.com/2/files/list_folder/continue',
		search: 'https://api.dropboxapi.com/2/files/search/continue_v2',
	};

	let responseData;
	do {
		responseData = await dropboxApiRequest.call(
			this,
			method,
			endpoint,
			body as IDataObject,
			query,
			headers,
		);
		const cursor = responseData.cursor;
		if (cursor !== undefined) {
			endpoint = paginationEndpoint[resource] as string;
			body = { cursor };
		}
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData.has_more !== false);

	return returnData;
}

export async function getRootDirectory(this: IHookFunctions | IExecuteFunctions) {
	return await dropboxApiRequest.call(
		this,
		'POST',
		'https://api.dropboxapi.com/2/users/get_current_account',
		{},
	);
}

export function simplify(data: IDataObject[]) {
	const results = [];
	for (const element of data) {
		const { '.tag': key } = element?.metadata as IDataObject;
		const metadata = (element?.metadata as IDataObject)[key as string] as IDataObject;
		delete element.metadata;
		Object.assign(element, metadata);
		if ((element?.match_type as IDataObject)['.tag']) {
			element.match_type = (element?.match_type as IDataObject)['.tag'] as string;
		}
		results.push(element);
	}
	return results;
}

export async function getCredentials(this: IExecuteFunctions) {
	const authenticationMethod = this.getNodeParameter('authentication', 0) as string;
	if (authenticationMethod === 'accessToken') {
		return await this.getCredentials('dropboxApi');
	} else {
		return await this.getCredentials('dropboxOAuth2Api');
	}
}
