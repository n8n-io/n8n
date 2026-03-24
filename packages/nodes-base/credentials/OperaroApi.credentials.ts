import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class OperaroApi implements ICredentialType {
	name = 'operaroApi';

	displayName = 'Operaro API';

	documentationUrl = 'operaro';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://localhost:7701',
			description: 'The base URL of your Operaro API gateway',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'The API key or Bearer token for authenticating with Operaro',
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
