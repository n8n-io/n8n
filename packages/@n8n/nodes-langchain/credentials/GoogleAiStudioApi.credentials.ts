import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class GoogleAiStudioApi implements ICredentialType {
	name = 'googleAiStudioApi';

	displayName = 'Google AI Studio API';

	documentationUrl = 'googleAiStudio';

	properties: INodeProperties[] = [
		{
			displayName: 'Host',
			name: 'host',
			required: true,
			type: 'string',
			default: 'https://generativelanguage.googleapis.com',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: 'AIzaSyBv9nAIQXc28JjmkcGdnwCSeGeonY-bs7M',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			qs: {
				key: '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.host}}/v1beta3/models',
		},
	};
}
