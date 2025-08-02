import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SolarWindsObservabilityApi implements ICredentialType {
	name = 'solarWindsObservabilityApi';

	displayName = 'SolarWinds Observability';

	documentationUrl = 'solarwindsobservability';

	icon = {
		light: 'file:icons/SolarWindsObservability.svg',
		dark: 'file:icons/SolarWindsObservability.svg',
	} as const;

	httpRequestNode = {
		name: 'SolarWinds Observability',
		docsUrl:
			'https://documentation.solarwinds.com/en/success_center/observability/content/api/api-swagger.htm',
		apiBaseUrlPlaceholder: 'https://api.xx-yy.cloud.solarwinds.com/',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'URL',
			name: 'url',
			required: true,
			type: 'string',
			default: '',
		},
		{
			displayName: 'API Token',
			name: 'apiToken',
			required: true,
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiToken}}',
				'Content-Type': 'application/json-rpc',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.url}}'.replace(/\/$/, ''),
			url: '/v1/logs',
			method: 'GET',
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'error',
					value: 'invalid_auth',
					message: 'Invalid access token',
				},
			},
		],
	};
}
