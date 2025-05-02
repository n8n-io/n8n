import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class JinaAiApi implements ICredentialType {
	name = 'jinaAiApi';

	displayName = 'Jina AI API';

	documentationUrl = 'jinaAi';

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
				Authorization: '=Bearer {{ $credentials?.apiKey }}',
			},
		},
	};

	// TODO: add a test request, not sure which endpoint to use
}
