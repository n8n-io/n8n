import type { CredentialListItem, CredentialProvider } from '@n8n/agents';
import { buildResolveLlmTool } from '../resolve-llm.tool';

function makeProvider(creds: CredentialListItem[]): CredentialProvider {
	return {
		list: jest.fn(async () => creds),
		resolve: jest.fn(async () => ({})),
	};
}

describe('resolve_llm tool', () => {
	it('auto-resolves when exactly one LLM-provider credential exists', async () => {
		const credentialProvider = makeProvider([
			{ id: 'c1', name: 'My Anthropic', type: 'anthropicApi' },
			{ id: 'c2', name: 'My Slack', type: 'slackApi' },
		]);
		const tool = buildResolveLlmTool({ credentialProvider });
		const result = await tool.handler!({}, {});

		expect(result).toEqual({
			ok: true,
			provider: 'anthropic',
			model: 'claude-sonnet-4-6',
			credentialId: 'c1',
			credentialName: 'My Anthropic',
		});
	});

	it('auto-resolves the requested provider when multiple LLM-provider credentials exist', async () => {
		const credentialProvider = makeProvider([
			{ id: 'c1', name: 'My Anthropic', type: 'anthropicApi' },
			{ id: 'c2', name: 'My OpenRouter', type: 'openRouterApi' },
		]);
		const tool = buildResolveLlmTool({ credentialProvider });
		const result = await tool.handler!({ provider: 'openrouter' }, {});

		expect(result).toEqual({
			ok: true,
			provider: 'openrouter',
			model: 'anthropic/claude-sonnet-4.6',
			credentialId: 'c2',
			credentialName: 'My OpenRouter',
		});
	});

	it('uses the requested model for the requested provider', async () => {
		const credentialProvider = makeProvider([
			{ id: 'c1', name: 'My OpenRouter', type: 'openRouterApi' },
		]);
		const tool = buildResolveLlmTool({ credentialProvider });
		const result = await tool.handler!(
			{ provider: 'openrouter', model: 'meta-llama/llama-3.1-70b-instruct' },
			{},
		);

		expect(result).toEqual({
			ok: true,
			provider: 'openrouter',
			model: 'meta-llama/llama-3.1-70b-instruct',
			credentialId: 'c1',
			credentialName: 'My OpenRouter',
		});
	});

	it('returns missing_credential when the requested provider has no credentials', async () => {
		const credentialProvider = makeProvider([
			{ id: 'c1', name: 'My Anthropic', type: 'anthropicApi' },
		]);
		const tool = buildResolveLlmTool({ credentialProvider });
		const result = await tool.handler!({ provider: 'openrouter' }, {});

		expect(result).toEqual({
			ok: false,
			reason: 'missing_credential',
			provider: 'openrouter',
			credentialType: 'openRouterApi',
			credentials: [],
		});
	});

	it('returns ambiguous_credential when the requested provider has multiple credentials', async () => {
		const credentialProvider = makeProvider([
			{ id: 'c1', name: 'Personal OpenRouter', type: 'openRouterApi' },
			{ id: 'c2', name: 'Work OpenRouter', type: 'openRouterApi' },
		]);
		const tool = buildResolveLlmTool({ credentialProvider });
		const result = await tool.handler!({ provider: 'openrouter' }, {});

		expect(result).toEqual({
			ok: false,
			reason: 'ambiguous_credential',
			provider: 'openrouter',
			credentialType: 'openRouterApi',
			credentials: [
				{ id: 'c1', name: 'Personal OpenRouter' },
				{ id: 'c2', name: 'Work OpenRouter' },
			],
		});
	});

	it('returns ambiguous_provider_or_credential when no provider is requested and multiple credentials exist', async () => {
		const credentialProvider = makeProvider([
			{ id: 'c1', name: 'My Anthropic', type: 'anthropicApi' },
			{ id: 'c2', name: 'My OpenAI', type: 'openAiApi' },
		]);
		const tool = buildResolveLlmTool({ credentialProvider });
		const result = await tool.handler!({}, {});

		expect(result).toEqual({
			ok: false,
			reason: 'ambiguous_provider_or_credential',
			credentials: [
				{ id: 'c1', name: 'My Anthropic', type: 'anthropicApi', provider: 'anthropic' },
				{ id: 'c2', name: 'My OpenAI', type: 'openAiApi', provider: 'openai' },
			],
		});
	});
});
