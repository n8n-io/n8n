import type { CredentialListItem, CredentialProvider } from '@n8n/agents';
import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';
import type { Mock } from 'vitest';

import type { ModelLookup } from '../resolve-llm.tool';
import { buildResolveLlmTool } from '../resolve-llm.tool';

function makeProvider(creds: CredentialListItem[]): CredentialProvider {
	return {
		list: vi.fn(async () => creds),
		resolve: vi.fn(async () => ({})),
	};
}

function makeModelLookup(impl?: ModelLookup['list']): ModelLookup & { list: Mock } {
	return {
		list: vi.fn(impl ?? (async () => [])),
	};
}

describe('resolve_llm tool', () => {
	it('auto-resolves when exactly one LLM-provider credential exists', async () => {
		const credentialProvider = makeProvider([
			{ id: 'c1', name: 'My OpenAI', type: 'openAiApi' },
			{ id: 'c2', name: 'My Slack', type: 'slackApi' },
		]);
		const modelLookup = makeModelLookup();
		const tool = buildResolveLlmTool({ credentialProvider, modelLookup });
		const result = await tool.handler!({}, {});

		expect(result).toEqual({
			ok: true,
			provider: 'openai',
			model: 'gpt-5-mini',
			credentialId: 'c1',
			credentialName: 'My OpenAI',
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
		const modelLookup = makeModelLookup(async () => [
			{ name: 'Grok 4 Fast', value: 'grok-4-fast' },
			{ name: 'Grok 4', value: 'grok-4' },
		]);
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

		it('validates the requested model against the lookup for Cohere', async () => {
			const credentialProvider = makeProvider([{ id: 'c1', name: 'My Cohere', type: 'cohereApi' }]);
			const modelLookup = makeModelLookup(async () => [
				{ name: 'Command R+', value: 'command-r-plus' },
				{ name: 'Command R', value: 'command-r' },
			]);
			const tool = buildResolveLlmTool({ credentialProvider, modelLookup });
			const result = await tool.handler!({ provider: 'cohere', model: 'command-r-plus' }, {});

			expect(result).toEqual({
				ok: true,
				provider: 'cohere',
				model: 'command-r-plus',
				credentialId: 'c1',
				credentialName: 'My Cohere',
			});
			expect(modelLookup.list).toHaveBeenCalledWith('c1', 'cohereApi', 'cohere');
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
			expect(modelLookup.list).toHaveBeenCalledWith('c1', 'anthropicApi', 'anthropic');
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

	describe('n8n Connect managed credentials', () => {
		it('defaults to n8n Connect when there is no own credential and the gateway serves the provider', async () => {
			const tool = buildResolveLlmTool({
				credentialProvider: makeProvider([]),
				modelLookup: makeModelLookup(),
				isProviderServedByGateway: async (provider) => provider === 'anthropic',
			});
			const result = await tool.handler!({ provider: 'anthropic' }, {});

			expect(result).toEqual({
				ok: true,
				provider: 'anthropic',
				model: 'claude-sonnet-4-6',
				credentialId: AI_GATEWAY_MANAGED_TAG,
				credentialName: 'n8n Connect',
			});
		});

		it('returns missing_credential when no own credential and the gateway does not serve the provider', async () => {
			const tool = buildResolveLlmTool({
				credentialProvider: makeProvider([]),
				modelLookup: makeModelLookup(),
				isProviderServedByGateway: async () => false,
			});
			const result = await tool.handler!({ provider: 'anthropic' }, {});

			expect(result).toMatchObject({
				ok: false,
				reason: 'missing_credential',
				provider: 'anthropic',
			});
		});

		it('does not offer n8n Connect for a provider the user already has credentials for', async () => {
			const tool = buildResolveLlmTool({
				credentialProvider: makeProvider([
					{ id: 'cred-1', name: 'Anthropic A', type: 'anthropicApi' },
					{ id: 'cred-2', name: 'Anthropic B', type: 'anthropicApi' },
				]),
				modelLookup: makeModelLookup(),
				isProviderServedByGateway: async () => true,
			});
			const result = await tool.handler!({ provider: 'anthropic' }, {});

			// The user has Anthropic keys, so n8n Connect is not offered for Anthropic —
			// only their own credentials are ambiguous.
			expect(result).toMatchObject({
				ok: false,
				reason: 'ambiguous_credential',
				credentials: [
					{ id: 'cred-1', name: 'Anthropic A' },
					{ id: 'cred-2', name: 'Anthropic B' },
				],
			});
		});

		it('additively appends n8n Connect options for gateway providers the user has no key for', async () => {
			const served = new Set(['openai', 'anthropic', 'google']);
			const tool = buildResolveLlmTool({
				credentialProvider: makeProvider([
					{ id: 'cred-1', name: 'My Anthropic', type: 'anthropicApi' },
					{ id: 'cred-2', name: 'My xAI', type: 'xAiApi' },
				]),
				modelLookup: makeModelLookup(),
				isProviderServedByGateway: async (provider) => served.has(provider),
			});
			const result = (await tool.handler!({}, {})) as {
				credentials?: Array<{ id: string; name: string; type: string; provider: string }>;
			};

			const creds = result.credentials ?? [];
			// Own credential preserved.
			expect(creds).toContainEqual({
				id: 'cred-1',
				name: 'My Anthropic',
				type: 'anthropicApi',
				provider: 'anthropic',
			});
			// n8n Connect options appended for supported providers without an own key (openai, google).
			expect(creds).toContainEqual({
				id: AI_GATEWAY_MANAGED_TAG,
				name: 'n8n Connect',
				type: 'openAiApi',
				provider: 'openai',
			});
			expect(creds).toContainEqual({
				id: AI_GATEWAY_MANAGED_TAG,
				name: 'n8n Connect',
				type: 'googlePalmApi',
				provider: 'google',
			});
			// No n8n Connect entry for Anthropic — the user already has a key for it.
			expect(
				creds.filter((c) => c.provider === 'anthropic' && c.id === AI_GATEWAY_MANAGED_TAG),
			).toHaveLength(0);
		});

		it('validates a requested managed model against the gateway allowlist', async () => {
			const modelLookup = makeModelLookup(async () => [
				{ name: 'GPT-5 mini', value: 'gpt-5-mini' },
			]);
			const tool = buildResolveLlmTool({
				credentialProvider: makeProvider([]),
				modelLookup,
				isProviderServedByGateway: async (provider) => provider === 'openai',
			});
			const result = await tool.handler!({ provider: 'openai', model: 'gpt-5-mini' }, {});

			expect(result).toMatchObject({
				ok: true,
				model: 'gpt-5-mini',
				credentialId: AI_GATEWAY_MANAGED_TAG,
			});
			expect(modelLookup.list).toHaveBeenCalledWith(AI_GATEWAY_MANAGED_TAG, 'openAiApi', 'openai');
		});
	});
});
