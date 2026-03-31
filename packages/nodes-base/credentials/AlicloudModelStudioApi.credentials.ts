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
			baseURL: 'https://dashscope-intl.aliyuncs.com',
			url: '/api/v1/services/aigc/text-generation/generation',
			method: 'POST',
			body: {
				model: 'qwen-flash',
				input: {
					messages: [
						{
							role: 'user',
							content: 'test',
						},
					],
				},
			},
		},
	};
}
