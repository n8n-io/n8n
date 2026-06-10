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
