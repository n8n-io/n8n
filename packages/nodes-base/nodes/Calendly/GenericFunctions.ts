import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IHookFunctions,
	IWebhookFunctions,
	IHttpRequestMethods,
	LegacyRequestOptions,
	RequestPath,
} from 'n8n-workflow';
import { requestPath, requestUrl } from 'n8n-workflow';

export function getCredentialsType(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
): 'calendlyApi' | 'calendlyOAuth2Api' {
	const authentication = this.getNodeParameter('authentication', 0, 'oAuth2') as string;
	return authentication === 'apiKey' ? 'calendlyApi' : 'calendlyOAuth2Api';
}

export async function calendlyApiRequest(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: RequestPath,
	body: IDataObject = {},
	query: IDataObject = {},
): Promise<IDataObject> {
	const headers: IDataObject = {
		'Content-Type': 'application/json',
	};

	const endpoint = 'https://api.calendly.com';

	const options: LegacyRequestOptions = {
		headers,
		method,
		body,
		qs: query,
		uri: requestUrl`${endpoint}${resource}`,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}
	if (!Object.keys(query).length) {
		delete options.qs;
	}

	const credentialsType = getCredentialsType.call(this);
	return await this.helpers.requestWithAuthentication.call(this, credentialsType, options);
}

const WEBHOOK_SUBSCRIPTION_URI_PREFIX = 'https://api.calendly.com/webhook_subscriptions/';

export async function deleteWebhookSubscription(
	this: IHookFunctions,
	webhookURI: string,
): Promise<void> {
	if (!webhookURI.startsWith(WEBHOOK_SUBSCRIPTION_URI_PREFIX)) return;

	const id = webhookURI.slice(WEBHOOK_SUBSCRIPTION_URI_PREFIX.length);
	await calendlyApiRequest.call(this, 'DELETE', requestPath`/webhook_subscriptions/${id}`);
}
