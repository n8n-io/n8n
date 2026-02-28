import {
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class LineApi implements ICredentialType {
	name = 'lineApi';

	displayName = 'LINE API';

	documentationUrl = 'https://developers.line.biz/en/docs/messaging-api/';

	properties: INodeProperties[] = [
		{
			displayName: 'Environment',
			name: 'environment',
			type: 'options',
			options: [
				{ name: 'Production', value: 'production' },
				{ name: 'Test', value: 'test' },
			],
			default: 'production',
			description: 'The environment to use. Choose Test for a development channel and Production for a live channel.',
		},

		// ─── Production ───────────────────────────────────────────
		{
			displayName: 'Channel Access Token (Production)',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'Long-lived channel access token for the production channel',
			displayOptions: { show: { environment: ['production'] } },
		},
		{
			displayName: 'Channel Secret (Production)',
			name: 'channelSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Channel secret for the production channel, used to verify webhook signatures',
			displayOptions: { show: { environment: ['production'] } },
		},

		// ─── Test ─────────────────────────────────────────────────
		{
			displayName: 'Channel Access Token (Test)',
			name: 'testAccessToken',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'Long-lived channel access token for the test channel',
			displayOptions: { show: { environment: ['test'] } },
		},
		{
			displayName: 'Channel Secret (Test)',
			name: 'testChannelSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Channel secret for the test channel, used to verify webhook signatures',
			displayOptions: { show: { environment: ['test'] } },
		},
	];

	authenticate = {
		type: 'generic' as const,
		properties: {
			headers: {
				Authorization:
					"=Bearer {{$credentials.environment === 'test' ? $credentials.testAccessToken : $credentials.accessToken}}",
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.line.me',
			url: '/v2/bot/info',
			method: 'GET',
		},
	};
}
