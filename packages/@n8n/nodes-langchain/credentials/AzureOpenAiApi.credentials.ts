import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class AzureOpenAiApi implements ICredentialType {
	name = 'azureOpenAiApi';

	displayName = 'Azure Open AI';

	documentationUrl = 'azureopenai';

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
			displayName: 'Resource Name',
			name: 'resourceName',
			type: 'string',
			required: true,
			default: '',
		},
		{
			displayName: 'API Version',
			name: 'apiVersion',
			type: 'string',
			required: true,
			default: '2025-03-01-preview',
		},
		{
			displayName: 'Endpoint',
			name: 'endpoint',
			type: 'string',
			default: undefined,
			placeholder: 'https://westeurope.api.cognitive.microsoft.com',
		},
		{
			displayName: 'Custom HTTP Header Name',
			name: 'customHttpHeader',
			type: 'string',
			default: '',
			placeholder: 'X-Custom-Header',
			description: 'A custom headers, e.g. a api-gateway header for authentication',
		},
		{
			displayName: 'Custom HTTP Header Value',
			name: 'customHttpHeaderValue',
			type: 'string',
			typeOptions: { password: true }, // Passwort-Typ für Sicherheit
			default: '',
			description: 'A value/string for the custom header',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'api-key': '={{$credentials.apiKey}}',
				// Hier nutzen wir die neue n8n Syntax, um dynamische Header-Namen zu setzen
				'={{$credentials.customHttpHeader}}': '={{$credentials.customHttpHeaderValue}}',
			},
		},
	};
}
