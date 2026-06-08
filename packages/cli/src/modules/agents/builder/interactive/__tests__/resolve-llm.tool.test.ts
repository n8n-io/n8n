import type { CredentialListItem, CredentialProvider } from '@n8n/agents';

import type { ModelLookup } from '../resolve-llm.tool';
import { buildResolveLlmTool } from '../resolve-llm.tool';

function makeProvider(creds: CredentialListItem[]): CredentialProvider {
	return {
		list: jest.fn(async () => creds),
		resolve: jest.fn(async () => ({})),
	};
}

function makeModelLookup(impl?: ModelLookup['list']): ModelLookup & { list: jest.Mock } {
	return {
		list: jest.fn(impl ?? (async () => [])),
	};
}

describe('resolve_llm tool', () => {
	it('auto-resolves when exactly one LLM-provider credential exists', async () => {
		const credentialProvider = makeProvider([
			{ id: 'c1', name: 'My Anthropic', type: 'anthropicApi' },
			{ id: 'c2', name: 'My Slack', type: 'slackApi' },
		]);
		const modelLookup = makeModelLookup();
		const tool = buildResolveLlmTool({ credentialProvider, modelLookup });
		const result = await tool.handler!({}, {});

		expect(result).toEqual({
			ok: true,
			provider: 'anthropic',
			model: 'claude-sonnet-4-6',
			credentialId: 'c1',
			credentialName: 'My Anthropic',
		});
		expect(modelLookup.list).not.toHaveBeenCalled();
	});

	it('auto-resolves the requested provider when multiple LLM-provider credentials exist', async () => {
		const credentialProvider = makeProvider([
			{ id: 'c1', name: 'My Anthropic', type: 'anthropicApi' },
			{ id: 'c2', name: 'My OpenRouter', type: 'openRouterApi' },
		]);
		const modelLookup = makeModelLookup();
		const tool = buildResolveLlmTool({ credentialProvider, modelLookup });
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
		const credentialProvider = makeProvider([{ id: 'c1', name: 'My xAI', type: 'xAiApi' }]);
		const modelLookup = makeModelLookup();
		const tool = buildResolveLlmTool({ credentialProvider, modelLookup });
		const result = await tool.handler!({ provider: 'xai', model: 'grok-4-fast' }, {});

		expect(result).toEqual({
			ok: true,
			provider: 'xai',
			model: 'grok-4-fast',
			credentialId: 'c1',
			credentialName: 'My xAI',
		});
	});

	it('returns missing_credential when the requested provider has no credentials', async () => {
		const credentialProvider = makeProvider([
			{ id: 'c1', name: 'My Anthropic', type: 'anthropicApi' },
		]);
		const modelLookup = makeModelLookup();
		const tool = buildResolveLlmTool({ credentialProvider, modelLookup });
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
		const modelLookup = makeModelLookup();
		const tool = buildResolveLlmTool({ credentialProvider, modelLookup });
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
		const modelLookup = makeModelLookup();
		const tool = buildResolveLlmTool({ credentialProvider, modelLookup });
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

	describe('model validation against modelLookup', () => {
		it('skips lookup when no model is requested', async () => {
			const credentialProvider = makeProvider([
				{ id: 'c1', name: 'My Anthropic', type: 'anthropicApi' },
			]);
			const modelLookup = makeModelLookup();
			const tool = buildResolveLlmTool({ credentialProvider, modelLookup });
			const result = await tool.handler!({ provider: 'anthropic' }, {});

			expect(result).toEqual({
				ok: true,
				provider: 'anthropic',
				model: 'claude-sonnet-4-6',
				credentialId: 'c1',
				credentialName: 'My Anthropic',
			});
			expect(modelLookup.list).not.toHaveBeenCalled();
		});

		it('skips lookup for providers without modelLookup configured (e.g. Cohere)', async () => {
			const credentialProvider = makeProvider([{ id: 'c1', name: 'My Cohere', type: 'cohereApi' }]);
			const modelLookup = makeModelLookup();
			const tool = buildResolveLlmTool({ credentialProvider, modelLookup });
			const result = await tool.handler!({ provider: 'cohere', model: 'command-x-plus' }, {});

			expect(result).toEqual({
				ok: true,
				provider: 'cohere',
				model: 'command-x-plus',
				credentialId: 'c1',
				credentialName: 'My Cohere',
			});
			expect(modelLookup.list).not.toHaveBeenCalled();
		});

		it('returns the canonical model id when the requested model matches the lookup', async () => {
			const credentialProvider = makeProvider([
				{ id: 'c1', name: 'My Anthropic', type: 'anthropicApi' },
			]);
			const modelLookup = makeModelLookup(async () => [
				{ name: 'Claude Haiku 4.5', value: 'claude-haiku-4-5-20250101' },
				{ name: 'Claude Sonnet 4.6', value: 'claude-sonnet-4-6' },
			]);
			const tool = buildResolveLlmTool({ credentialProvider, modelLookup });
			const result = await tool.handler!(
				{ provider: 'anthropic', model: 'CLAUDE-HAIKU-4-5-20250101' },
				{},
			);

			expect(result).toEqual({
				ok: true,
				provider: 'anthropic',
				model: 'claude-haiku-4-5-20250101',
				credentialId: 'c1',
				credentialName: 'My Anthropic',
			});
			expect(modelLookup.list).toHaveBeenCalledWith(
				'c1',
				'anthropicApi',
				expect.objectContaining({ kind: 'listSearch', methodName: 'searchModels' }),
			);
		});

		it('uniquely-substring-matches a partial requested model id', async () => {
			const credentialProvider = makeProvider([
				{ id: 'c1', name: 'My Anthropic', type: 'anthropicApi' },
			]);
			const modelLookup = makeModelLookup(async () => [
				{ name: 'Claude Haiku 4.5', value: 'claude-haiku-4-5-20250101' },
				{ name: 'Claude Sonnet 4.6', value: 'claude-sonnet-4-6' },
			]);
			const tool = buildResolveLlmTool({ credentialProvider, modelLookup });
			const result = await tool.handler!({ provider: 'anthropic', model: 'claude-haiku-4-5' }, {});

			expect(result).toEqual({
				ok: true,
				provider: 'anthropic',
				model: 'claude-haiku-4-5-20250101',
				credentialId: 'c1',
				credentialName: 'My Anthropic',
			});
		});

		it('uniquely-substring-matches against the model display name', async () => {
			const credentialProvider = makeProvider([
				{ id: 'c1', name: 'My Anthropic', type: 'anthropicApi' },
			]);
			const modelLookup = makeModelLookup(async () => [
				{ name: 'Claude Haiku 4.5', value: 'claude-haiku-4-5-20250101' },
				{ name: 'Claude Sonnet 4.6', value: 'claude-sonnet-4-6-20251001' },
			]);
			const tool = buildResolveLlmTool({ credentialProvider, modelLookup });
			const result = await tool.handler!({ provider: 'anthropic', model: 'haiku 4.5' }, {});

			expect(result).toEqual({
				ok: true,
				provider: 'anthropic',
				model: 'claude-haiku-4-5-20250101',
				credentialId: 'c1',
				credentialName: 'My Anthropic',
			});
		});

		it('returns unknown_model with availableModels when nothing matches', async () => {
			const credentialProvider = makeProvider([
				{ id: 'c1', name: 'My Anthropic', type: 'anthropicApi' },
			]);
			const available = [{ name: 'Claude Sonnet 4.6', value: 'claude-sonnet-4-6' }];
			const modelLookup = makeModelLookup(async () => available);
			const tool = buildResolveLlmTool({ credentialProvider, modelLookup });
			const result = await tool.handler!({ provider: 'anthropic', model: 'gpt-9000' }, {});

			expect(result).toEqual({
				ok: false,
				reason: 'unknown_model',
				provider: 'anthropic',
				requestedModel: 'gpt-9000',
				availableModels: available,
			});
		});

		it('returns unknown_model with the candidate matches when the substring is ambiguous', async () => {
			const credentialProvider = makeProvider([
				{ id: 'c1', name: 'My Anthropic', type: 'anthropicApi' },
			]);
			const modelLookup = makeModelLookup(async () => [
				{ name: 'Claude Haiku 4.5', value: 'claude-haiku-4-5-20250101' },
				{ name: 'Claude Haiku 4.0', value: 'claude-haiku-4-0-20240101' },
				{ name: 'Claude Sonnet 4.6', value: 'claude-sonnet-4-6' },
			]);
			const tool = buildResolveLlmTool({ credentialProvider, modelLookup });
			const result = await tool.handler!({ provider: 'anthropic', model: 'haiku' }, {});

			expect(result).toEqual({
				ok: false,
				reason: 'unknown_model',
				provider: 'anthropic',
				requestedModel: 'haiku',
				availableModels: [
					{ name: 'Claude Haiku 4.5', value: 'claude-haiku-4-5-20250101' },
					{ name: 'Claude Haiku 4.0', value: 'claude-haiku-4-0-20240101' },
				],
			});
		});

		it('returns model_lookup_failed when the lookup throws', async () => {
			const credentialProvider = makeProvider([
				{ id: 'c1', name: 'My Anthropic', type: 'anthropicApi' },
			]);
			const modelLookup = makeModelLookup(async () => {
				throw new Error('credentials invalid');
			});
			const tool = buildResolveLlmTool({ credentialProvider, modelLookup });
			const result = await tool.handler!({ provider: 'anthropic', model: 'claude-haiku-4-5' }, {});

			expect(result).toEqual({
				ok: false,
				reason: 'model_lookup_failed',
				provider: 'anthropic',
				requestedModel: 'claude-haiku-4-5',
				error: 'credentials invalid',
			});
		});
	});
});
