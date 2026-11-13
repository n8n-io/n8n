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

function getAuthenticationTypeFromApiKey(data: string): 'accessToken' | 'apiKey' {
	// The access token is a JWT, so it will always include dots to separate
	// header, payoload and signature.
	return data.includes('.') ? 'accessToken' : 'apiKey';
}

export async function getAuthenticationType(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
): Promise<'accessToken' | 'apiKey'> {
	const authentication = this.getNodeParameter('authentication', 0) as string;
	if (authentication === 'apiKey') {
		const { apiKey } = await this.getCredentials<{ apiKey: string }>('calendlyApi');
		return getAuthenticationTypeFromApiKey(apiKey);
	} else {
		return 'accessToken';
	}
}

export async function calendlyApiRequest(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: RequestPath,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const authenticationType = await getAuthenticationType.call(this);

	const headers: IDataObject = {
		'Content-Type': 'application/json',
	};

	let endpoint = 'https://api.calendly.com';

	// remove once API key is deprecated
	if (authenticationType === 'apiKey') {
		endpoint = 'https://calendly.com/api/v1';
	}

	const options: LegacyRequestOptions = {
		headers,
		method,
		body,
		qs: query,
		uri: requestUrl`${endpoint}${resource}`,
		json: true,
	};

	if (!Object.keys(body as IDataObject).length) {
		delete options.form;
	}
	if (!Object.keys(query).length) {
		delete options.qs;
	}

	const credentialsType =
		(this.getNodeParameter('authentication', 0) as string) === 'apiKey'
			? 'calendlyApi'
			: 'calendlyOAuth2Api';
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
