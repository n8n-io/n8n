import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class OpenCodeApi implements ICredentialType {
	name = 'openCodeApi';

	displayName = 'OpenCode API';

	documentationUrl = 'https://opencode.ai/docs';

	properties: INodeProperties[] = [
		{
			displayName: 'Provider',
			name: 'provider',
			type: 'options',
			options: [
				{ name: 'Anthropic', value: 'anthropic' },
				{ name: 'OpenAI', value: 'openai' },
				{ name: 'Google', value: 'google' },
			],
			default: 'anthropic',
			description: 'The AI model provider whose API key you are supplying',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'API key for the selected provider',
		},
	];
}
