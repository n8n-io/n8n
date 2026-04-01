import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
	Icon,
} from 'n8n-workflow';

export class AlicloudModelStudioApi implements ICredentialType {
	name = 'alicloudModelStudioApi';

	displayName = 'Alibaba Cloud Model Studio API';

	documentationUrl = 'https://www.alibabacloud.com/help/en/model-studio/';

	icon: Icon = { light: 'file:icons/Qwen.svg', dark: 'file:icons/Qwen.dark.svg' };

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'The API key from Alibaba Cloud Model Studio',
		},
		{
			displayName: 'Region',
			name: 'region',
			type: 'options',
			default: 'ap-southeast-1',
			options: [
				{
					name: 'Singapore (International)',
					value: 'ap-southeast-1',
				},
				{
					name: 'US (Virginia)',
					value: 'us-east-1',
				},
				{
					name: 'China (Beijing)',
					value: 'cn-beijing',
				},
				{
					name: 'Hong Kong (China)',
					value: 'cn-hongkong',
				},
				{
					name: 'Germany (Frankfurt)',
					value: 'eu-central-1',
				},
			],
			description: 'The region for the Alibaba Cloud Model Studio API endpoint',
		},
		{
			displayName: 'Workspace ID',
			name: 'workspaceId',
			type: 'string',
			default: '',
			required: true,
			displayOptions: {
				show: {
					region: ['eu-central-1'],
				},
			},
			description:
				'The Workspace ID required for the Germany (Frankfurt) region. The endpoint URL is constructed as https://{WorkspaceId}.eu-central-1.maas.aliyuncs.com.',
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
			baseURL:
				'={{$credentials.region === "us-east-1" ? "https://dashscope-us.aliyuncs.com" : $credentials.region === "cn-beijing" ? "https://dashscope.aliyuncs.com" : $credentials.region === "cn-hongkong" ? "https://cn-hongkong.dashscope.aliyuncs.com" : $credentials.region === "eu-central-1" ? "https://" + $credentials.workspaceId + ".eu-central-1.maas.aliyuncs.com" : "https://dashscope-intl.aliyuncs.com"}}',
			url: '/api/v1/services/aigc/multimodal-generation/generation',
			method: 'POST',
			body: {
				model: 'qwen3.5-flash',
				input: {
					messages: [
						{
							role: 'user',
							content: [{ text: 'test' }],
						},
					],
				},
			},
		},
	};
}
