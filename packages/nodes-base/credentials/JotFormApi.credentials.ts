import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class JotFormApi implements ICredentialType {
	name = 'jotFormApi';
	displayName = 'JotForm API';
	documentationUrl = 'jotForm';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'API Domain',
			name: 'apiDomain',
			type: 'options',
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
			description:
				'The API domain to use. Use "eu-api.jotform.com" if your account is in based in Europe.',
		},
	];
}
