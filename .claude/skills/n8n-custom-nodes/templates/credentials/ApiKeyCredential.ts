/**
 * TEMPLATE: API Key Credential
 *
 * Simple credential that authenticates via API key in a header.
 * The `authenticate` property auto-injects the key into every request.
 * The `test` property defines a request to validate the credential.
 *
 * Replace all occurrences of:
 *   - __ServiceName__     → Your service display name (PascalCase)
 *   - __serviceName__     → Your credential name (camelCase)
 */
import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class __ServiceName__Api implements ICredentialType {
	name = '__serviceName__Api';

	displayName = '__ServiceName__ API';

	documentationUrl = '__serviceName__';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.example.com',
			required: true,
			description: 'The base URL of the API',
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

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/v1/me',
		},
	};
}
