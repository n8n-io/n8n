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

/**
 * Get the field definitions of one DocType.
 *
 * `/api/resource/DocType/<name>` reads a record of the `DocType` doctype. A
 * default Frappe install gives that permission to System Manager only, so a user
 * who can read the documents still gets a 403 (#35796). The desk UI reads the
 * same definitions through `getdoctype`, which checks the permission of the
 * doctype that it loads.
 */
export async function erpNextApiDocTypeFields(
	this: ILoadOptionsFunctions,
	docType: string,
): Promise<DocTypeField[]> {
	const response = (await erpNextApiRequest.call(
		this,
		'GET',
		'/api/method/frappe.desk.form.load.getdoctype',
		{},
		// The parameter holds the encoded name, and the query string encodes again.
		{ doctype: decodeURI(docType) },
	)) as { docs?: Array<{ fields?: DocTypeField[] }> };

	// `docs` is a meta bundle: the requested doctype first, then its child tables.
	return response?.docs?.[0]?.fields ?? [];
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

export type DocTypeField = {
	label: string;
	fieldname: string;
};

type ERPNextApiCredentials = {
	apiKey: string;
	apiSecret: string;
	environment: 'cloudHosted' | 'selfHosted';
	subdomain?: string;
	domain?: string;
	allowUnauthorizedCerts?: boolean;
};
