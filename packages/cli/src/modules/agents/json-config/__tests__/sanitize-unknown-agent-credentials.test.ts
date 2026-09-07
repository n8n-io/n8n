import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';

import { sanitizeUnknownAgentCredentials } from '../sanitize-unknown-agent-credentials';

describe('sanitizeUnknownAgentCredentials', () => {
	const accessibleCredentialIds = new Set(['known-cred', 'nested-cred']);

	it('preserves the n8n Connect tag on the main model credential', () => {
		const result = sanitizeUnknownAgentCredentials(
			{ credential: AI_GATEWAY_MANAGED_TAG, model: 'openai/gpt-5' },
			accessibleCredentialIds,
		);

		expect(result).toEqual({ credential: AI_GATEWAY_MANAGED_TAG, model: 'openai/gpt-5' });
	});

	it('preserves the n8n Connect tag on difficulty model credentials', () => {
		const result = sanitizeUnknownAgentCredentials(
			{
				subAgents: {
					modelsByDifficulty: {
						low: { model: 'openai/gpt-5-mini', credential: AI_GATEWAY_MANAGED_TAG },
						high: { model: 'anthropic/claude-sonnet-4-6', credential: AI_GATEWAY_MANAGED_TAG },
					},
				},
			},
			accessibleCredentialIds,
		);

		expect(result).toEqual({
			subAgents: {
				modelsByDifficulty: {
					low: { model: 'openai/gpt-5-mini', credential: AI_GATEWAY_MANAGED_TAG },
					high: { model: 'anthropic/claude-sonnet-4-6', credential: AI_GATEWAY_MANAGED_TAG },
				},
			},
		});
	});

	it('preserves the n8n Connect tag on memory worker model credentials', () => {
		// Memory workers are ordinary chat models, so the gateway can serve them.
		// Stripping the tag here left the model with an unresolvable empty credential.
		const workerModel = { model: 'openai/gpt-4o-mini', credential: AI_GATEWAY_MANAGED_TAG };
		const config = {
			memory: {
				observationalMemory: { observerModel: workerModel, reflectorModel: workerModel },
				episodicMemory: {
					enabled: true,
					credential: 'known-cred',
					extractorModel: workerModel,
					reflectorModel: workerModel,
				},
			},
		};

		expect(sanitizeUnknownAgentCredentials(config, accessibleCredentialIds)).toEqual(config);
	});

	it('clears the n8n Connect tag on the episodic memory embedding credential', () => {
		// That path is served by the AI assistant proxy and only accepts
		// MANAGED_CREDENTIAL_TOKEN; the gateway tag is not a valid value there.
		const result = sanitizeUnknownAgentCredentials(
			{ memory: { episodicMemory: { enabled: true, credential: AI_GATEWAY_MANAGED_TAG } } },
			accessibleCredentialIds,
		);

		expect(result).toEqual({
			memory: { episodicMemory: { enabled: true, credential: '' } },
		});
	});

	it('clears unknown top-level credential fields', () => {
		const result = sanitizeUnknownAgentCredentials(
			{
				credential: 'unknown-cred',
				model: 'openai/gpt-5.5',
				name: 'General Purpose Agent',
			},
			accessibleCredentialIds,
		);

		expect(result).toEqual({
			credential: '',
			model: 'openai/gpt-5.5',
			name: 'General Purpose Agent',
		});
	});

	it('preserves known credential fields', () => {
		const result = sanitizeUnknownAgentCredentials(
			{ credential: 'known-cred', model: 'anthropic/claude-sonnet-4-5', name: 'Agent' },
			accessibleCredentialIds,
		);

		expect(result).toEqual({
			credential: 'known-cred',
			model: 'anthropic/claude-sonnet-4-5',
			name: 'Agent',
		});
	});

	it('preserves managed proxy credential tokens only for episodic memory embeddings', () => {
		const result = sanitizeUnknownAgentCredentials(
			{
				memory: {
					episodicMemory: {
						enabled: true,
						credential: 'managed',
					},
				},
			},
			accessibleCredentialIds,
		);

		expect(result).toEqual({
			memory: {
				episodicMemory: {
					enabled: true,
					credential: 'managed',
				},
			},
		});
	});

	it('clears managed proxy credential tokens outside episodic memory embeddings', () => {
		const result = sanitizeUnknownAgentCredentials(
			{
				credential: 'managed',
				config: {
					webSearch: {
						enabled: true,
						provider: 'brave',
						credential: 'managed',
					},
				},
				integrations: [{ type: 'slack', credentialId: 'managed' }],
				mcpServers: [
					{
						name: 'github',
						url: 'https://example.com/mcp',
						transport: 'streamableHttp',
						authentication: 'bearerAuth',
						credential: 'managed',
					},
				],
				memory: {
					observationalMemory: {
						observerModel: { model: 'openai/gpt-4o-mini', credential: 'managed' },
					},
					episodicMemory: {
						enabled: true,
						credential: 'managed',
						extractorModel: { model: 'openai/gpt-4o-mini', credential: 'managed' },
					},
				},
				tools: [
					{
						type: 'node',
						name: 'Slack',
						node: {
							nodeType: 'n8n-nodes-base.slack',
							nodeTypeVersion: 1,
							credentials: { slackApi: { id: 'managed', name: 'Managed by n8n' } },
						},
					},
				],
			},
			accessibleCredentialIds,
		);

		expect(result).toEqual({
			credential: '',
			config: {
				webSearch: {
					enabled: true,
					provider: 'brave',
					credential: '',
				},
			},
			integrations: [{ type: 'slack', credentialId: '' }],
			mcpServers: [
				{
					name: 'github',
					url: 'https://example.com/mcp',
					transport: 'streamableHttp',
					authentication: 'bearerAuth',
					credential: '',
				},
			],
			memory: {
				observationalMemory: {
					observerModel: { model: 'openai/gpt-4o-mini', credential: '' },
				},
				episodicMemory: {
					enabled: true,
					credential: 'managed',
					extractorModel: { model: 'openai/gpt-4o-mini', credential: '' },
				},
			},
			tools: [
				{
					type: 'node',
					name: 'Slack',
					node: {
						nodeType: 'n8n-nodes-base.slack',
						nodeTypeVersion: 1,
						credentials: { slackApi: { id: '', name: 'Managed by n8n' } },
					},
				},
			],
		});
	});

	it('preserves the n8n Connect managed sentinel on a node-tool credential', () => {
		// Relies on the non-string-id recursion branch of the `credentials`
		// handler — this pin exists so a refactor of that branch can't silently
		// start clearing managed refs.
		const result = sanitizeUnknownAgentCredentials(
			{
				tools: [
					{
						type: 'node',
						name: 'Slack',
						node: {
							nodeType: 'n8n-nodes-base.slackTool',
							nodeTypeVersion: 1,
							credentials: {
								slackApi: { id: null, name: 'n8n credits', __aiGatewayManaged: true },
							},
						},
					},
				],
			},
			accessibleCredentialIds,
		);

		expect(result).toEqual({
			tools: [
				{
					type: 'node',
					name: 'Slack',
					node: {
						nodeType: 'n8n-nodes-base.slackTool',
						nodeTypeVersion: 1,
						credentials: {
							slackApi: { id: null, name: 'n8n credits', __aiGatewayManaged: true },
						},
					},
				},
			],
		});
	});

	it('clears unknown credentialId fields at arbitrary nesting depth', () => {
		const result = sanitizeUnknownAgentCredentials(
			{
				integrations: [{ type: 'slack', credentialId: 'unknown-cred' }],
				memory: {
					episodicMemory: {
						enabled: true,
						credential: 'unknown-cred',
					},
				},
			},
			accessibleCredentialIds,
		);

		expect(result).toEqual({
			integrations: [{ type: 'slack', credentialId: '' }],
			memory: {
				episodicMemory: {
					enabled: true,
					credential: '',
				},
			},
		});
	});

	it('clears unknown credentials map ids but leaves unrelated id fields untouched', () => {
		const result = sanitizeUnknownAgentCredentials(
			{
				tools: [
					{ type: 'custom', id: 'tool-1', credentials: { openAiApi: { id: 'unknown-cred' } } },
				],
				tasks: [{ type: 'task', id: 'task-1', enabled: true }],
			},
			accessibleCredentialIds,
		);

		expect(result).toEqual({
			tools: [{ type: 'custom', id: 'tool-1', credentials: { openAiApi: { id: '' } } }],
			tasks: [{ type: 'task', id: 'task-1', enabled: true }],
		});
	});

	it('clears unknown credentials on vector store connections, including the nested embedding credential', () => {
		const result = sanitizeUnknownAgentCredentials(
			{
				vectorStores: [
					{
						provider: 'qdrant',
						name: 'product_docs',
						credential: 'unknown-cred',
						useWhen: 'Search product docs',
						embedding: { model: 'openai/text-embedding-3-small', credential: 'unknown-cred' },
						collectionName: 'docs',
					},
					{
						provider: 'postgres',
						name: 'faq',
						credential: 'known-cred',
						useWhen: 'Search FAQ',
						embedding: { model: 'openai/text-embedding-3-small', credential: 'nested-cred' },
						tableName: 'faq',
					},
				],
			},
			accessibleCredentialIds,
		);

		expect(result).toEqual({
			vectorStores: [
				{
					provider: 'qdrant',
					name: 'product_docs',
					credential: '',
					useWhen: 'Search product docs',
					embedding: { model: 'openai/text-embedding-3-small', credential: '' },
					collectionName: 'docs',
				},
				{
					provider: 'postgres',
					name: 'faq',
					credential: 'known-cred',
					useWhen: 'Search FAQ',
					embedding: { model: 'openai/text-embedding-3-small', credential: 'nested-cred' },
					tableName: 'faq',
				},
			],
		});
	});

	it('preserves known nested credentials', () => {
		const result = sanitizeUnknownAgentCredentials(
			{
				memory: {
					observationalMemory: {
						observerModel: { model: 'openai/gpt-4o-mini', credential: 'nested-cred' },
					},
				},
				integrations: [{ type: 'linear', credentialId: 'known-cred' }],
			},
			accessibleCredentialIds,
		);

		expect(result).toEqual({
			memory: {
				observationalMemory: {
					observerModel: { model: 'openai/gpt-4o-mini', credential: 'nested-cred' },
				},
			},
			integrations: [{ type: 'linear', credentialId: 'known-cred' }],
		});
	});

	it('leaves non-string credential-like values untouched', () => {
		const input = {
			credential: 123,
			credentialId: null,
			credentials: { openAiApi: { id: false } },
		};

		expect(sanitizeUnknownAgentCredentials(input, accessibleCredentialIds)).toEqual(input);
	});

	it('returns non-object input unchanged', () => {
		expect(sanitizeUnknownAgentCredentials(null, accessibleCredentialIds)).toBeNull();
		expect(sanitizeUnknownAgentCredentials('credential', accessibleCredentialIds)).toBe(
			'credential',
		);
	});

	it('clears a top-level credential when model is empty', () => {
		const result = sanitizeUnknownAgentCredentials(
			{ model: '', credential: 'known-cred' },
			accessibleCredentialIds,
		);

		expect(result).toEqual({ model: '', credential: '' });
	});

	it('preserves a top-level credential when model is set', () => {
		const result = sanitizeUnknownAgentCredentials(
			{ model: 'anthropic/claude-sonnet-4-5', credential: 'known-cred' },
			accessibleCredentialIds,
		);

		expect(result).toEqual({
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'known-cred',
		});
	});
});
