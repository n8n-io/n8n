import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class VoyageAiApi implements ICredentialType {
	name = 'voyageAiApi';

	displayName = 'VoyageAI API';

	documentationUrl = 'voyageai';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
				'Content-Type': 'application/json',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.voyageai.com',
			url: '/v1/embeddings',
			method: 'POST',
			body: {
				input: 'Test connectivity',
				model: 'voyage-3',
				input_type: 'document',
			},
		},
	};
}
