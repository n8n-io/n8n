import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class AzureOpenAiApi implements ICredentialType {
	name = 'azureOpenAiApi';

	displayName = 'Azure Open AI';

	documentationUrl = 'azureopenai';

	properties: INodeProperties[] = [
		{
			displayName: 'Endpoint Type',
			name: 'endpointType',
			type: 'options',
			options: [
				{ name: 'Classic', value: 'classic' },
				{ name: 'Azure AI Foundry', value: 'foundry' },
			],
			default: 'classic',
			description:
				'Classic targets *.openai.azure.com (resource name + deployment-based URLs). Azure AI Foundry targets *.services.ai.azure.com/openai/v1 (full endpoint URL).',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
		{
			displayName: 'Resource Name',
			name: 'resourceName',
			type: 'string',
			required: true,
			default: '',
			displayOptions: { show: { endpointType: ['classic'] } },
		},
		{
			displayName: 'API Version',
			name: 'apiVersion',
			type: 'string',
			required: true,
			default: '2025-03-01-preview',
			displayOptions: { show: { endpointType: ['classic'] } },
		},
		{
			displayName: 'Endpoint',
			name: 'foundryEndpoint',
			type: 'string',
			required: true,
			default: '',
			placeholder: 'https://<resource>.services.ai.azure.com/openai/v1',
			displayOptions: { show: { endpointType: ['foundry'] } },
			hint: 'The full Azure AI Foundry OpenAI-compatible base URL.',
		},
		{
			displayName: 'Endpoint',
			name: 'endpoint',
			type: 'string',
			default: undefined,
			placeholder: 'https://<resource>.openai.azure.com',
			displayOptions: { show: { endpointType: ['classic'] } },
			hint: 'Optional. Defaults to https://<resourceName>.openai.azure.com.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'api-key': '={{$credentials.apiKey}}',
			},
		},
	};
}
