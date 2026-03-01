import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class ImpervaWafApi implements ICredentialType {
	name = 'impervaWafApi';

	displayName = 'Imperva WAF API';

	documentationUrl = 'impervawaf';

	icon = { light: 'file:icons/Imperva.svg', dark: 'file:icons/Imperva.dark.svg' } as const;

	httpRequestNode = {
		name: 'Imperva WAF',
		docsUrl: 'https://docs.imperva.com/bundle/api-docs',
		apiBaseUrl: 'https://api.imperva.com/',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'API ID',
			name: 'apiID',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'x-API-Id': '={{$credentials.apiID}}',
				'x-API-Key': '={{$credentials.apiKey}}',
			},
		},
	};
}
