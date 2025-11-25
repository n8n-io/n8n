import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class NanoBananaApi implements ICredentialType {
	name = 'nanoBananaApi';

	displayName = 'Nano Banana API';

	documentationUrl = 'https://cloud.google.com/vertex-ai/docs';

	properties: INodeProperties[] = [
		{
			displayName: 'API Endpoint',
			name: 'apiEndpoint',
			type: 'string',
			default: 'aiplatform.googleapis.com',
			description: 'The API endpoint for the Gemini API',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'Your Vertex AI API Key',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL: '=https://{{$credentials.apiEndpoint}}/v1/publishers/google/models',
			url: '?key={{$credentials.apiKey}}',
		},
	};
}
