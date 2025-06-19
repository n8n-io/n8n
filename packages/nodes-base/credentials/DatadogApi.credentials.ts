import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class DatadogApi implements ICredentialType {
	name = 'datadogApi';

	displayName = 'Datadog API';

	documentationUrl = 'datadog';

	icon = { light: 'file:icons/Datadog.svg', dark: 'file:icons/Datadog.svg' } as const;

	httpRequestNode = {
		name: 'Datadog',
		docsUrl: 'https://docs.datadoghq.com/api/latest/',
		apiBaseUrlPlaceholder: 'https://api.datadoghq.com/api/v1/metrics',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'URL',
			name: 'url',
			required: true,
			type: 'string',
			default: 'https://api.datadoghq.com',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			required: true,
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'APP Key',
			name: 'appKey',
			required: false,
			type: 'string',
			default: '',
			typeOptions: { password: true },
			description: 'For some endpoints, you also need an Application key.',
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		requestOptions.headers = {
			'DD-API-KEY': credentials.apiKey,
			'DD-APPLICATION-KEY': credentials.appKey,
		};
		if (!requestOptions.headers['DD-APPLICATION-KEY']) {
			delete requestOptions.headers['DD-APPLICATION-KEY'];
		}

		return requestOptions;
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.url}}',
			url: '/api/v1/validate',
			method: 'GET',
		},
	};
}
