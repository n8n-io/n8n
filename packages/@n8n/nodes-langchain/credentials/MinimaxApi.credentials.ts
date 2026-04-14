import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class MinimaxApi implements ICredentialType {
	name = 'minimaxApi';

	displayName = 'MiniMax';

	documentationUrl = 'minimax';

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
					description: 'platform.minimax.io - international endpoint',
				},
				{
					name: 'China',
					value: 'china',
					description: 'platform.minimaxi.com - mainland China endpoint',
				},
			],
			default: 'international',
		},
		{
			displayName: 'Base URL',
			name: 'url',
			type: 'hidden',
			default:
				'={{ $self.region === "china" ? "https://api.minimaxi.com/v1" : "https://api.minimax.io/v1" }}',
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
			url: '/files/list',
			qs: { purpose: 'voice_clone' },
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'base_resp.status_code',
					value: 1004,
					message: 'Authentication failed. Please check your API key.',
				},
			},
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'base_resp.status_code',
					value: 2049,
					message: 'Invalid API key. Please verify your key matches the selected region.',
				},
			},
		],
	};
}
