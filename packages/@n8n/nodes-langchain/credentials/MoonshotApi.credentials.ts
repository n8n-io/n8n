import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class MoonshotApi implements ICredentialType {
	name = 'moonshotApi';

	displayName = 'Moonshot';

	documentationUrl = 'moonshot';

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
			displayName: 'Region',
			name: 'region',
			type: 'options',
			options: [
				{
					name: 'International',
					value: 'international',
					description: 'platform.kimi.ai - international endpoint',
				},
				{
					name: 'China',
					value: 'china',
					description: 'platform.moonshot.cn - mainland China endpoint',
				},
			],
			default: 'international',
		},
		{
			displayName: 'Base URL',
			name: 'url',
			type: 'hidden',
			default:
				'={{ $self.region === "china" ? "https://api.moonshot.cn/v1" : "https://api.moonshot.ai/v1" }}',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{ $credentials.url }}',
			url: '/models',
		},
	};
}
