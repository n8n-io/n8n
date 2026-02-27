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
			description:
				'使用する環境。Test は開発用チャネル、Production は本番チャネルに対応します',
		},

		// ─── Production ───────────────────────────────────────────
		{
			displayName: 'Channel Access Token (Production)',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: '本番チャネルの Channel Access Token (long-lived)',
			displayOptions: { show: { environment: ['production'] } },
		},
		{
			displayName: 'Channel Secret (Production)',
			name: 'channelSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: '本番チャネルの Channel Secret（Webhook 署名検証に使用）',
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
			description: 'テストチャネルの Channel Access Token (long-lived)',
			displayOptions: { show: { environment: ['test'] } },
		},
		{
			displayName: 'Channel Secret (Test)',
			name: 'testChannelSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'テストチャネルの Channel Secret（Webhook 署名検証に使用）',
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
