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

import { extractDocTypeFields } from './utils';

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

/**
 * Fetch the field definitions of a DocType.
 *
 * Version 1 reads them from `/api/resource/DocType/{docType}`, which requires read
 * access to the DocType doctype itself — in practice the System Manager role — so for
 * an ordinary user the request 403s and the field dropdowns stay empty. From version
 * 1.1 we call the endpoint the Frappe desk UI itself uses, which authorises against the
 * user's access to the doctype being loaded.
 *
 * `docType` arrives URI-encoded from `getDocTypes`, so it is interpolated rather than
 * passed as a query object, which would encode it a second time.
 */
export async function getDocTypeFields(
	this: ILoadOptionsFunctions,
	docType: string,
): Promise<Array<{ name: string; value: string }>> {
	if (this.getNode().typeVersion < 1.1) {
		const { data } = await erpNextApiRequest.call(
			this,
			'GET',
			`/api/resource/DocType/${docType}`,
			{},
		);

		return data.fields.map(({ label, fieldname }: { label: string; fieldname: string }) => ({
			name: label,
			value: fieldname,
		}));
	}

	const response = await erpNextApiRequest.call(
		this,
		'GET',
		`/api/method/frappe.desk.form.load.getdoctype?doctype=${docType}`,
		{},
	);

	return extractDocTypeFields(response, docType);
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
