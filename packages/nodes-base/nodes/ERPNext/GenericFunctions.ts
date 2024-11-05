import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	IHookFunctions,
	IWebhookFunctions,
	IHttpRequestMethods,
	IRequestOptions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

/**
 * Return the base API URL based on the user's environment.
 */
const getBaseUrl = ({ environment, domain, subdomain }: ERPNextApiCredentials) =>
	environment === 'cloudHosted' ? `https://${subdomain}.${domain}` : domain;

export async function erpNextApiRequest(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: IDataObject = {},
	query: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
) {
	const credentials = await this.getCredentials<ERPNextApiCredentials>('erpNextApi');
	const baseUrl = getBaseUrl(credentials);

	let options: IRequestOptions = {
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs: query,
		uri: uri || `${baseUrl}${resource}`,
		json: true,
		rejectUnauthorized: !credentials.allowUnauthorizedCerts,
	};

	options = Object.assign({}, options, option);

	if (!Object.keys(options.body as IDataObject).length) {
		delete options.body;
	}

	if (!Object.keys(options.qs as IDataObject).length) {
		delete options.qs;
	}
	try {
		return await this.helpers.requestWithAuthentication.call(this, 'erpNextApi', options);
	} catch (error) {
		if (error.statusCode === 403) {
			throw new NodeApiError(this.getNode(), { message: 'DocType unavailable.' });
		}

		if (error.statusCode === 307) {
			throw new NodeApiError(this.getNode(), {
				message: 'Please ensure the subdomain is correct.',
			});
		}
		throw error;
	}
}

export async function erpNextApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	resource: string,
	body: IDataObject,
	query: IDataObject = {},
) {
	const returnData: any[] = [];

	let responseData;
	query.limit_start = 0;
	query.limit_page_length = 1000;

	do {
		responseData = await erpNextApiRequest.call(this, method, resource, body, query);
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
		query.limit_start += query.limit_page_length - 1;
	} while (responseData.data && responseData.data.length > 0);

	return returnData;
}

type ERPNextApiCredentials = {
	apiKey: string;
	apiSecret: string;
	environment: 'cloudHosted' | 'selfHosted';
	subdomain?: string;
	domain?: string;
	allowUnauthorizedCerts?: boolean;
};
