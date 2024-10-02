import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IHookFunctions,
	IWebhookFunctions,
	IHttpRequestMethods,
	IRequestOptions,
} from 'n8n-workflow';

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
	resource: string,

	body: any = {},
	query: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
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

	let options: IRequestOptions = {
		headers,
		method,
		body,
		qs: query,
		uri: uri || `${endpoint}${resource}`,
		json: true,
	};

	if (!Object.keys(body as IDataObject).length) {
		delete options.form;
	}
	if (!Object.keys(query).length) {
		delete options.qs;
	}
	options = Object.assign({}, options, option);

	const credentialsType =
		(this.getNodeParameter('authentication', 0) as string) === 'apiKey'
			? 'calendlyApi'
			: 'calendlyOAuth2Api';
	return await this.helpers.requestWithAuthentication.call(this, credentialsType, options);
}
