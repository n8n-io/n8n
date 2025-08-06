import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	IHookFunctions,
	IWebhookFunctions,
	IHttpRequestMethods,
	IRequestOptions,
} from 'n8n-workflow';
import { ApplicationError } from 'n8n-workflow';

const BEEMINDER_URI = 'https://www.beeminder.com/api/v1';

function isValidAuthenticationMethod(value: unknown): value is 'apiToken' | 'oAuth2' {
	return typeof value === 'string' && ['apiToken', 'oAuth2'].includes(value);
}

function convertToFormData(obj: any): Record<string, string> {
	const result: Record<string, string> = {};
	for (const [key, value] of Object.entries(obj)) {
		if (value === null || value === undefined) {
			// Skip null/undefined values
			continue;
		} else if (typeof value === 'boolean') {
			result[key] = value.toString();
		} else if (typeof value === 'number') {
			result[key] = value.toString();
		} else if (Array.isArray(value)) {
			// Handle arrays - convert to JSON string for form data
			result[key] = JSON.stringify(value);
		} else {
			result[key] = String(value);
		}
	}
	return result;
}

export async function beeminderApiRequest(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
	useFormData: boolean = false,
): Promise<any> {
	const authenticationMethod = this.getNodeParameter('authentication', 0, 'apiToken');

	if (!isValidAuthenticationMethod(authenticationMethod)) {
		throw new ApplicationError(`Invalid authentication method: ${authenticationMethod}`);
	}

	let credentialType = 'beeminderApi';
	if (authenticationMethod === 'oAuth2') {
		credentialType = 'beeminderOAuth2Api';
	}

	const options: IRequestOptions = {
		method,
		qs: query,
		uri: `${BEEMINDER_URI}${endpoint}`,
		json: true,
	};

	if (useFormData) {
		options.formData = convertToFormData(body);
	} else {
		options.body = body;
	}

	if (!Object.keys(body as IDataObject).length) {
		if (useFormData) {
			delete options.formData;
		} else {
			delete options.body;
		}
	}

	if (!Object.keys(query).length) {
		delete options.qs;
	}

	return await this.helpers.requestWithAuthentication.call(this, credentialType, options);
}

export async function beeminderApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	method: IHttpRequestMethods,
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
