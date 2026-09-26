import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

/**
 * Connection to the Cerebro platform (Azure). A single API key is exchanged at
 * `<baseUrl>/config/v1/auth/api-keys/token` for a short-lived JWT, which then
 * authorizes agent config reads (`/config/v1/agents`) and OTLP trace ingest
 * (`/ingest/v1/agents/{id}/traces`). The node performs the exchange; this
 * credential only stores the key and base URL.
 */
export class CerebroApi implements ICredentialType {
	name = 'cerebroApi';

	displayName = 'Cerebro API';

	documentationUrl = 'cerebro';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			required: true,
			default: 'https://cerebro-stg-apim.azure-api.net',
			placeholder: 'https://cerebro-stg-apim.azure-api.net',
			description: 'Root of the Cerebro API gateway. The /config and /ingest paths hang off it.',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			placeholder: 'cerebro_sk_live_apk_…',
			description:
				'Cerebro API key. Exchanged for a short-lived token on each use; never sent to agents.',
		},
	];

	// The key-for-token exchange doubles as the credential test: a 200 means the
	// key is valid and has an ingest-scoped token.
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{ $credentials.baseUrl.replace(/\\/+$/, "") }}',
			url: '/config/v1/auth/api-keys/token',
			method: 'POST',
			body: { api_key: '={{ $credentials.apiKey }}' },
			headers: { 'content-type': 'application/json' },
		},
	};
}
