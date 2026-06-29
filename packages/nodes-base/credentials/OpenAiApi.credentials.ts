import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	IDataObject,
	INodeProperties,
} from 'n8n-workflow';

function isDataObject(value: unknown): value is IDataObject {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function getOpenAiApiKey(credentials: ICredentialDataDecryptedObject): string {
	const { oauthTokenData } = credentials;
	let oauthAccessToken = '';
	if (isDataObject(oauthTokenData)) {
		oauthAccessToken =
			typeof oauthTokenData.access_token === 'string' ? oauthTokenData.access_token : '';
	}

	const apiKey = typeof credentials.apiKey === 'string' ? credentials.apiKey : '';
	return apiKey || oauthAccessToken;
}

export const OPEN_AI_API_CREDENTIAL_TYPE = 'openAiApi';
export const OPEN_AI_OAUTH2_CREDENTIAL_TYPE = 'openAiOAuth2Api';

export function getOpenAiCredentialType(authentication: unknown): string {
	return authentication === 'oAuth2' ? OPEN_AI_OAUTH2_CREDENTIAL_TYPE : OPEN_AI_API_CREDENTIAL_TYPE;
}

export class OpenAiApi implements ICredentialType {
	name = 'openAiApi';

	displayName = 'OpenAI';

	documentationUrl = 'openai';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
		{
			displayName: 'Organization ID (optional)',
			name: 'organizationId',
			type: 'string',
			default: '',
			hint: 'Only required if you belong to multiple organisations',
			description:
				"For users who belong to multiple organizations, you can set which organization is used for an API request. Usage from these API requests will count against the specified organization's subscription quota.",
		},
		{
			displayName: 'Base URL',
			name: 'url',
			type: 'string',
			default: 'https://api.openai.com/v1',
			description: 'Override the default base URL for the API',
		},
		{
			displayName: 'Add Custom Header',
			name: 'header',
			type: 'boolean',
			default: false,
		},
		{
			displayName: 'Header Name',
			name: 'headerName',
			type: 'string',
			displayOptions: {
				show: {
					header: [true],
				},
			},
			default: '',
		},
		{
			displayName: 'Header Value',
			name: 'headerValue',
			type: 'string',
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					header: [true],
				},
			},
			default: '',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials?.url}}',
			url: '/models',
		},
	};

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		requestOptions.headers ??= {};

		requestOptions.headers['Authorization'] = `Bearer ${getOpenAiApiKey(credentials)}`;
		requestOptions.headers['OpenAI-Organization'] = credentials.organizationId;

		if (
			credentials.header &&
			typeof credentials.headerName === 'string' &&
			credentials.headerName &&
			typeof credentials.headerValue === 'string'
		) {
			requestOptions.headers[credentials.headerName] = credentials.headerValue;
		}

		return requestOptions;
	}
}
