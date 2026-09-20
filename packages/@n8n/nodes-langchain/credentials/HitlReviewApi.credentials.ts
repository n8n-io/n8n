import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

/**
 * Connection to a human-in-the-loop review service (the backend behind the
 * "AI Agent with Human Review" node). The node registers drafts at
 * `<baseUrl>/hitl`, reads threads at `<baseUrl>/api/threads` and exports
 * OpenTelemetry traces to `<baseUrl>/v1/traces`, all with these credentials.
 */
export class HitlReviewApi implements ICredentialType {
	name = 'hitlReviewApi';

	displayName = 'HITL Review Service';

	documentationUrl = 'hitlreview';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			required: true,
			default: 'http://localhost:3100',
			placeholder: 'https://review.example.com',
			description:
				'Root of the review service. Endpoints are derived from it: /hitl, /api/threads, /v1/traces.',
		},
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'Sent as the x-hitl-token header on every request. Leave empty if the service runs without HITL_SHARED_SECRET.',
		},
		{
			displayName: 'Ignore SSL Issues (Insecure)',
			name: 'allowUnauthorizedCerts',
			type: 'boolean',
			default: false,
			description: 'Whether to connect even if SSL certificate validation is not possible',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'x-hitl-token': '={{ $credentials.apiToken }}',
			},
		},
	};

	// /api/threads is behind the shared secret when one is configured, so it
	// proves both reachability and the token; /health would pass without a token.
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{ $credentials.baseUrl.replace(/\\/+$/, "") }}',
			url: '/api/threads',
			method: 'GET',
			skipSslCertificateValidation: '={{ $credentials.allowUnauthorizedCerts }}',
		},
	};
}
