import { secretsUseCredentialsNotParameters } from './secrets-use-credentials-not-parameters';
import type { WorkflowNodeResponse, WorkflowResponse } from '../../clients/n8n-client';

function workflow(...nodes: WorkflowNodeResponse[]): WorkflowResponse {
	return {
		id: 'wf-1',
		name: 'Lead generation',
		active: false,
		versionId: 'v1',
		nodes: [
			{ name: 'Chat', type: '@n8n/n8n-nodes-langchain.chatTrigger', parameters: {} },
			...nodes,
		],
		connections: {},
	};
}

const ctx = { prompt: 'find leads with google custom search' };

describe('secretsUseCredentialsNotParameters', () => {
	it('fails when an HTTP Request Tool asks for an API key via a query-param placeholder (INS-633 shape)', async () => {
		const result = await secretsUseCredentialsNotParameters.run(
			workflow({
				name: 'web_search',
				type: 'n8n-nodes-base.httpRequestTool',
				parameters: {
					url: 'https://www.googleapis.com/customsearch/v1',
					sendQuery: true,
					queryParameters: {
						parameters: [
							{ name: 'q', value: '={{ $fromAI("query") }}' },
							{ name: 'key', value: '<__PLACEHOLDER_VALUE__Google Custom Search API Key__>' },
							{ name: 'cx', value: '<__PLACEHOLDER_VALUE__Search Engine ID__>' },
						],
					},
				},
			}),
			ctx,
		);

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('web_search');
		expect(result.comment).toContain('key');
	});

	it('fails when a secret-labelled placeholder sits in a benign-looking header name', async () => {
		const result = await secretsUseCredentialsNotParameters.run(
			workflow({
				name: 'Call API',
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					url: 'https://api.example.com/v1/leads',
					sendHeaders: true,
					headerParameters: {
						parameters: [{ name: 'X-Client', value: '<__PLACEHOLDER_VALUE__Your Access Token__>' }],
					},
				},
			}),
			ctx,
		);

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('Call API');
	});

	it('fails when a hardcoded literal secret sits in a body parameter', async () => {
		const result = await secretsUseCredentialsNotParameters.run(
			workflow({
				name: 'Post Lead',
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					url: 'https://api.example.com/v1/leads',
					sendBody: true,
					bodyParameters: {
						parameters: [{ name: 'api_key', value: 'sk-live-abc123' }],
					},
				},
			}),
			ctx,
		);

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('Post Lead');
	});

	it('passes when the node attaches a Query Auth generic credential instead', async () => {
		const result = await secretsUseCredentialsNotParameters.run(
			workflow({
				name: 'web_search',
				type: 'n8n-nodes-base.httpRequestTool',
				parameters: {
					url: 'https://www.googleapis.com/customsearch/v1',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpQueryAuth',
					sendQuery: true,
					queryParameters: {
						parameters: [
							{ name: 'q', value: '={{ $fromAI("query") }}' },
							{ name: 'cx', value: '<__PLACEHOLDER_VALUE__Search Engine ID__>' },
						],
					},
				},
				credentials: { httpQueryAuth: { id: '1', name: 'Google Custom Search key' } },
			}),
			ctx,
		);

		expect(result.pass).toBe(true);
	});

	it('passes when the node uses a predefined credential type', async () => {
		const result = await secretsUseCredentialsNotParameters.run(
			workflow({
				name: 'Call API',
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					url: 'https://api.example.com/v1/leads',
					authentication: 'predefinedCredentialType',
					nodeCredentialType: 'hubspotApi',
				},
			}),
			ctx,
		);

		expect(result.pass).toBe(true);
	});

	it('passes for non-secret placeholders such as an ID the user picks at setup', async () => {
		const result = await secretsUseCredentialsNotParameters.run(
			workflow({
				name: 'Fetch Rows',
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					url: 'https://api.example.com/v1/sheets',
					sendQuery: true,
					queryParameters: {
						parameters: [
							{ name: 'spreadsheetId', value: '<__PLACEHOLDER_VALUE__Spreadsheet ID__>' },
							{ name: 'range', value: 'Sheet1!A:D' },
						],
					},
				},
			}),
			ctx,
		);

		expect(result.pass).toBe(true);
	});

	it('passes when a key parameter reads its value from an expression rather than a literal', async () => {
		const result = await secretsUseCredentialsNotParameters.run(
			workflow({
				name: 'Call API',
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					url: 'https://api.example.com/v1/leads',
					sendQuery: true,
					queryParameters: {
						parameters: [{ name: 'key', value: '={{ $json.searchKey }}' }],
					},
				},
			}),
			ctx,
		);

		expect(result.pass).toBe(true);
	});

	// The AI-agent HTTP tool the builder actually emits is the LangChain variant, not
	// `n8n-nodes-base.httpRequestTool` — different node type AND a different parameter
	// shape (`parametersQuery.values[]`, not `queryParameters.parameters[]`).
	it('fails when a LangChain HTTP tool asks for an API key via a query-param placeholder', async () => {
		const result = await secretsUseCredentialsNotParameters.run(
			workflow({
				name: 'google_web_search',
				type: '@n8n/n8n-nodes-langchain.toolHttpRequest',
				parameters: {
					method: 'GET',
					url: 'https://www.googleapis.com/customsearch/v1',
					sendQuery: true,
					specifyQuery: 'keypair',
					parametersQuery: {
						values: [
							{ name: 'q', valueProvider: 'modelRequired' },
							{
								name: 'key',
								valueProvider: 'fieldValue',
								value: '<__PLACEHOLDER_VALUE__Google Custom Search API Key__>',
							},
							{ name: 'cx', valueProvider: 'fieldValue', value: '017576662512468239146' },
						],
					},
				},
			}),
			ctx,
		);

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('google_web_search');
		expect(result.comment).toContain('key');
	});

	it('passes for the calibrated real build: LangChain HTTP tool with httpQueryAuth and no key param', async () => {
		const result = await secretsUseCredentialsNotParameters.run(
			workflow({
				name: 'google_web_search',
				type: '@n8n/n8n-nodes-langchain.toolHttpRequest',
				parameters: {
					method: 'GET',
					url: 'https://www.googleapis.com/customsearch/v1',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpQueryAuth',
					sendQuery: true,
					specifyQuery: 'keypair',
					parametersQuery: {
						values: [
							{ name: 'q', valueProvider: 'modelRequired' },
							{
								name: 'cx',
								valueProvider: 'fieldValue',
								value: '017576662512468239146:omuauf_lfve',
							},
							{ name: 'num', valueProvider: 'fieldValue', value: '5' },
						],
					},
				},
			}),
			ctx,
		);

		expect(result.pass).toBe(true);
		expect(result.applicable).not.toBe(false);
	});

	it('fails when a LangChain HTTP tool hardcodes a bearer token in a header', async () => {
		const result = await secretsUseCredentialsNotParameters.run(
			workflow({
				name: 'crm_lookup',
				type: '@n8n/n8n-nodes-langchain.toolHttpRequest',
				parameters: {
					url: 'https://api.example.com/v1/contacts',
					sendHeaders: true,
					parametersHeaders: {
						values: [
							{ name: 'Authorization', valueProvider: 'fieldValue', value: 'Bearer sk-live-123' },
						],
					},
				},
			}),
			ctx,
		);

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('crm_lookup');
	});

	// Raw-JSON form: `specifyQuery/Body/Headers: 'json'` swaps the keypair collection
	// for a single JSON string, so a secret hides in a string rather than an entry.
	it('fails when jsonQuery carries a secret placeholder', async () => {
		const result = await secretsUseCredentialsNotParameters.run(
			workflow({
				name: 'Search',
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					url: 'https://www.googleapis.com/customsearch/v1',
					sendQuery: true,
					specifyQuery: 'json',
					jsonQuery:
						'{"q": "acme corp", "cx": "017576662512468239146", "key": "<__PLACEHOLDER_VALUE__Google Custom Search API Key__>"}',
				},
			}),
			ctx,
		);

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('Search');
		expect(result.comment).toContain('key');
	});

	it('fails when jsonBody hardcodes an API key', async () => {
		const result = await secretsUseCredentialsNotParameters.run(
			workflow({
				name: 'Post Lead',
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					url: 'https://api.example.com/v1/leads',
					sendBody: true,
					specifyBody: 'json',
					jsonBody: '{"company": "Acme", "api_key": "sk-live-abc123"}',
				},
			}),
			ctx,
		);

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('Post Lead');
	});

	it('fails when jsonHeaders hardcodes an Authorization bearer token', async () => {
		const result = await secretsUseCredentialsNotParameters.run(
			workflow({
				name: 'Call API',
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					url: 'https://api.example.com/v1/leads',
					sendHeaders: true,
					specifyHeaders: 'json',
					jsonHeaders: '{"Accept": "application/json", "Authorization": "Bearer sk-live-abc123"}',
				},
			}),
			ctx,
		);

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('Authorization');
	});

	it('fails when a LangChain HTTP tool hides a secret placeholder in jsonQuery', async () => {
		const result = await secretsUseCredentialsNotParameters.run(
			workflow({
				name: 'google_web_search',
				type: '@n8n/n8n-nodes-langchain.toolHttpRequest',
				parameters: {
					url: 'https://www.googleapis.com/customsearch/v1',
					sendQuery: true,
					specifyQuery: 'json',
					jsonQuery: '{"key": "<__PLACEHOLDER_VALUE__Your API Key__>"}',
				},
			}),
			ctx,
		);

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('google_web_search');
	});

	it('passes when jsonBody carries only non-secret fields', async () => {
		const result = await secretsUseCredentialsNotParameters.run(
			workflow({
				name: 'Post Lead',
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					url: 'https://api.example.com/v1/leads',
					sendBody: true,
					specifyBody: 'json',
					jsonBody:
						'{"company": "Acme", "spreadsheetId": "<__PLACEHOLDER_VALUE__Spreadsheet ID__>"}',
				},
			}),
			ctx,
		);

		expect(result.pass).toBe(true);
	});

	it('passes when jsonQuery pulls the key from an expression rather than storing it', async () => {
		const result = await secretsUseCredentialsNotParameters.run(
			workflow({
				name: 'Search',
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					url: 'https://www.googleapis.com/customsearch/v1',
					sendQuery: true,
					specifyQuery: 'json',
					jsonQuery: '={"q": "{{ $json.company }}", "key": "{{ $json.searchKey }}"}',
				},
			}),
			ctx,
		);

		expect(result.pass).toBe(true);
	});

	// A hardcoded literal is a secret sitting in the JSON no matter how the node is
	// authenticated, so the literal signal runs even when a credential is attached —
	// otherwise removing HTTP coverage from `no_hardcoded_credentials` loses this case.
	it('fails on a hardcoded literal secret even when a credential is attached', async () => {
		const result = await secretsUseCredentialsNotParameters.run(
			workflow({
				name: 'Call API',
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					sendQuery: true,
					queryParameters: { parameters: [{ name: 'api_key', value: 'sk-live-1' }] },
				},
				credentials: { httpQueryAuth: { id: '1', name: 'Some key' } },
			}),
			ctx,
		);

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('api_key');
	});

	it('fails when auth mode is set but no credential is attached and a secret placeholder remains', async () => {
		const result = await secretsUseCredentialsNotParameters.run(
			workflow({
				name: 'web_search',
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					authentication: 'genericCredentialType',
					genericAuthType: 'httpQueryAuth',
					sendQuery: true,
					queryParameters: {
						parameters: [{ name: 'key', value: '<__PLACEHOLDER_VALUE__Google API Key__>' }],
					},
				},
			}),
			ctx,
		);

		expect(result.pass).toBe(false);
	});

	// Bare `key`/`apikey` only read as secret in a query string (Google's `?key=`).
	// In a body they are overwhelmingly the key half of a key/value pair.
	it('passes for a body parameter named key holding an ordinary value', async () => {
		const result = await secretsUseCredentialsNotParameters.run(
			workflow({
				name: 'Post Lead',
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					sendBody: true,
					bodyParameters: {
						parameters: [
							{ name: 'key', value: 'user_id' },
							{ name: 'value', value: '123' },
						],
					},
				},
			}),
			ctx,
		);

		expect(result.pass).toBe(true);
	});

	it('still fails for a query parameter named key holding a hardcoded value', async () => {
		const result = await secretsUseCredentialsNotParameters.run(
			workflow({
				name: 'Search',
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					sendQuery: true,
					queryParameters: { parameters: [{ name: 'key', value: 'AIzaSyD-hardcoded' }] },
				},
			}),
			ctx,
		);

		expect(result.pass).toBe(false);
	});

	it('passes for a parameter named credentialId, which references a credential rather than holding one', async () => {
		const result = await secretsUseCredentialsNotParameters.run(
			workflow({
				name: 'Post Lead',
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					sendBody: true,
					bodyParameters: { parameters: [{ name: 'credentialId', value: 'abc123' }] },
				},
			}),
			ctx,
		);

		expect(result.pass).toBe(true);
	});

	it('passes for a Page Token placeholder, which is pagination state rather than a secret', async () => {
		const result = await secretsUseCredentialsNotParameters.run(
			workflow({
				name: 'List Files',
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					sendQuery: true,
					queryParameters: {
						parameters: [{ name: 'pageToken', value: '<__PLACEHOLDER_VALUE__Page Token__>' }],
					},
				},
			}),
			ctx,
		);

		expect(result.pass).toBe(true);
	});

	it('still fails for an Access Token placeholder', async () => {
		const result = await secretsUseCredentialsNotParameters.run(
			workflow({
				name: 'List Files',
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					sendQuery: true,
					queryParameters: {
						parameters: [{ name: 'auth', value: '<__PLACEHOLDER_VALUE__Your Access Token__>' }],
					},
				},
			}),
			ctx,
		);

		expect(result.pass).toBe(false);
	});

	it('finds a secret placeholder in raw JSON even when a non-secret placeholder comes first', async () => {
		const result = await secretsUseCredentialsNotParameters.run(
			workflow({
				name: 'Post Lead',
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					sendBody: true,
					specifyBody: 'json',
					jsonBody:
						'{"sheet": <__PLACEHOLDER_VALUE__Spreadsheet ID__>, "auth": <__PLACEHOLDER_VALUE__Your API Key__>}',
				},
			}),
			ctx,
		);

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('Your API Key');
	});

	it('is not applicable when the workflow has no HTTP Request nodes', async () => {
		const result = await secretsUseCredentialsNotParameters.run(
			workflow({ name: 'Set', type: 'n8n-nodes-base.set', parameters: {} }),
			ctx,
		);

		expect(result.applicable).toBe(false);
		expect(result.pass).toBe(true);
	});
});
