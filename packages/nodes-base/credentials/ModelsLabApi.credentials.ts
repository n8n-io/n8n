import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class ModelsLabApi implements ICredentialType {
	name = 'modelsLabApi';

	displayName = 'ModelsLab API';

	documentationUrl = 'https://docs.modelslab.com/';

	icon = 'file:modelslab.svg';

	httpRequestNode = {
		name: 'ModelsLab',
		docsUrl: 'https://docs.modelslab.com/',
		apiBaseUrl: 'https://modelslab.com/api/v6',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description: 'Get your API key from <a href="https://modelslab.com/dashboard/api-keys" target="_blank">ModelsLab Dashboard</a>',
		},
	];

	authenticate = {
		type: 'generic' as const,
		properties: {
			body: {
				key: '={{$credentials.apiKey}}',
			},
		},
	};
}