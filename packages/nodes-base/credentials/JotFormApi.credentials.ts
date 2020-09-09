import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class JotFormApi implements ICredentialType {
	name = 'jotFormApi';
	displayName = 'JotForm API';
	documentationUrl = 'jotForm';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'API Domain',
			name: 'apiDomain',
			type: 'options' as NodePropertyTypes,
			options: [
				{
					name: 'api.jotform.com',
					value: 'api.jotform.com',
				},
				{
					name: 'eu-api.jotform.com',
					value: 'eu-api.jotform.com',
				},
			],
			default: 'api.jotform.com',
			description: 'The API domain to use. Use "eu-api.jotform.com" if your account is in based in Europe.',
		},
	];
}
