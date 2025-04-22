import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class RaiaApi implements ICredentialType {
	name = 'raiaApi';

	displayName = 'Raia API';

	documentationUrl = 'https://api.raia2.com/api/external/docs';

	icon = 'file:icons/raia.svg' as const;

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'Agent-Secret-Key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			method: 'POST',
			url: 'https://api.raia2.com/external/prompts',
			body: {
				prompt: 'Test prompt to validate API key',
			},
			json: true,
		},
	};
}
