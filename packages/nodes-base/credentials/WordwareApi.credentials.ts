import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class WordwareApi implements ICredentialType {
	name = 'wordwareApi';

	displayName = 'Wordware API';

	documentationUrl = 'wordware';

	icon = { light: 'file:icons/wordware.png', dark: 'file:icons/wordware.png' } as const;

	httpRequestNode = {
		name: 'Wordware',
		docsUrl: 'https://docs.wordware.ai/tour',
		apiBaseUrlPlaceholder: 'https://app.wordware.ai/api/',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
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
}
