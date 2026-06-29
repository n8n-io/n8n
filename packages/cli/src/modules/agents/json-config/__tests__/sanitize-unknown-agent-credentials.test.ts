import { sanitizeUnknownAgentCredentials } from '../sanitize-unknown-agent-credentials';

describe('sanitizeUnknownAgentCredentials', () => {
	const accessibleCredentialIds = new Set(['known-cred', 'nested-cred']);

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
			{ credential: 'known-cred', name: 'Agent' },
			accessibleCredentialIds,
		);

		expect(result).toEqual({ credential: 'known-cred', name: 'Agent' });
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
});
