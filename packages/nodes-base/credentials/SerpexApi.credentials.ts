import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class SerpexApi implements ICredentialType {
	name = 'serpexApi';

	displayName = 'Serpex API';

	documentationUrl = 'https://serpex.dev/docs';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			placeholder: 'sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
			description: 'Your Serpex API key. Get it from https://serpex.dev/dashboard',
		},
	];

	authenticate = {
		header: {
			key: 'Authorization',
			value: '=Bearer {{$credentials.apiKey}}',
		},
	};
}
