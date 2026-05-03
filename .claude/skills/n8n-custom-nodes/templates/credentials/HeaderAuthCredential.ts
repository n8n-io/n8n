/**
 * TEMPLATE: Header/Query Auth Credential
 *
 * For services that authenticate with custom headers or query parameters
 * rather than standard Bearer tokens or OAuth. Supports combinations of
 * header and query string authentication.
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
			displayName: 'API Token',
			name: 'token',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
		{
			displayName: 'Subdomain',
			name: 'subdomain',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'e.g. mycompany',
			description: 'Your __ServiceName__ subdomain',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-API-Key': '={{$credentials.token}}',
			},
			// Alternatively, for query param auth:
			// qs: {
			//   api_key: '={{$credentials.token}}',
			// },
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '=https://{{$credentials.subdomain}}.example.com/api',
			url: '/v1/verify',
		},
	};
}
