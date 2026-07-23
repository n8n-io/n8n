import type { CredentialListItem, CredentialProvider } from '@n8n/agents';
import type { Mock } from 'vitest';

import { LLM_PROVIDER_DEFAULTS, LLM_PROVIDER_PRIORITY } from '../../../llm-provider-defaults';
import type { FreeCreditsProvisioner, ModelLookup } from '../resolve-llm.tool';
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

function makeFreeCredits(
	isEligibleImpl?: FreeCreditsProvisioner['isEligible'],
	claimImpl?: FreeCreditsProvisioner['claim'],
): FreeCreditsProvisioner & { isEligible: Mock; claim: Mock } {
	return {
		isEligible: vi.fn(isEligibleImpl ?? (() => false)),
		claim: vi.fn(
			claimImpl ??
				(async () => {
					throw new Error('makeFreeCredits: claim() called without an implementation');
				}),
		),
	};
}

describe('resolve_llm tool', () => {
	it('auto-resolves when exactly one LLM-provider credential exists', async () => {
		const credentialProvider = makeProvider([
			{ id: 'c1', name: 'My OpenAI', type: 'openAiApi' },
			{ id: 'c2', name: 'My Slack', type: 'slackApi' },
		]);
		const modelLookup = makeModelLookup();
		const tool = buildResolveLlmTool({
			credentialProvider,
			modelLookup,
			freeCredits: makeFreeCredits(),
		});
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
		const tool = buildResolveLlmTool({
			credentialProvider,
			modelLookup,
			freeCredits: makeFreeCredits(),
		});
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
		const tool = buildResolveLlmTool({
			credentialProvider,
			modelLookup,
			freeCredits: makeFreeCredits(),
		});
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
		const tool = buildResolveLlmTool({
			credentialProvider,
			modelLookup,
			freeCredits: makeFreeCredits(),
		});
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
		const tool = buildResolveLlmTool({
			credentialProvider,
			modelLookup,
			freeCredits: makeFreeCredits(),
		});
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

	it('returns ambiguous_provider_or_credential when the top-priority provider has multiple credentials', async () => {
		const credentialProvider = makeProvider([
			{ id: 'c1', name: 'Personal Anthropic', type: 'anthropicApi' },
			{ id: 'c2', name: 'Work Anthropic', type: 'anthropicApi' },
			{ id: 'c3', name: 'My OpenAI', type: 'openAiApi' },
		]);
		const modelLookup = makeModelLookup();
		const tool = buildResolveLlmTool({
			credentialProvider,
			modelLookup,
			freeCredits: makeFreeCredits(),
		});
		const result = await tool.handler!({}, {});

		expect(result).toEqual({
			ok: false,
			reason: 'ambiguous_provider_or_credential',
			credentials: [
				{ id: 'c1', name: 'Personal Anthropic', type: 'anthropicApi', provider: 'anthropic' },
				{ id: 'c2', name: 'Work Anthropic', type: 'anthropicApi', provider: 'anthropic' },
				{ id: 'c3', name: 'My OpenAI', type: 'openAiApi', provider: 'openai' },
			],
		});
	});

	it('does not auto-pick when a model is requested without a provider', async () => {
		const credentialProvider = makeProvider([
			{ id: 'c1', name: 'My Anthropic', type: 'anthropicApi' },
			{ id: 'c2', name: 'My OpenAI', type: 'openAiApi' },
		]);
		const modelLookup = makeModelLookup();
		const tool = buildResolveLlmTool({
			credentialProvider,
			modelLookup,
			freeCredits: makeFreeCredits(),
		});
		const result = await tool.handler!({ model: 'gpt-5-mini' }, {});

		expect(result).toEqual({
			ok: false,
			reason: 'ambiguous_provider_or_credential',
			credentials: [
				{ id: 'c1', name: 'My Anthropic', type: 'anthropicApi', provider: 'anthropic' },
				{ id: 'c2', name: 'My OpenAI', type: 'openAiApi', provider: 'openai' },
			],
		});
	});

	describe('free OpenAI credits', () => {
		it('claims free OpenAI credits when no LLM credentials exist and the user is eligible', async () => {
			const credentialProvider = makeProvider([]);
			const modelLookup = makeModelLookup();
			const freeCredits = makeFreeCredits(
				() => true,
				async () => ({ credentialId: 'free-1', credentialName: 'n8n free OpenAI API credits' }),
			);
			const tool = buildResolveLlmTool({ credentialProvider, modelLookup, freeCredits });
			const result = await tool.handler!({}, {});

			expect(result).toEqual({
				ok: true,
				provider: 'openai',
				model: 'gpt-5-mini',
				credentialId: 'free-1',
				credentialName: 'n8n free OpenAI API credits',
				claimedFreeOpenAiCredits: true,
			});
		});

		it('returns missing_credential when no LLM credentials exist and free credits are not eligible', async () => {
			const credentialProvider = makeProvider([]);
			const modelLookup = makeModelLookup();
			const freeCredits = makeFreeCredits();
			const tool = buildResolveLlmTool({ credentialProvider, modelLookup, freeCredits });
			const result = await tool.handler!({}, {});

			expect(result).toEqual({ ok: false, reason: 'missing_credential', credentials: [] });
			expect(freeCredits.claim).not.toHaveBeenCalled();
		});

		it('falls back to missing_credential when the free-credits claim fails', async () => {
			const credentialProvider = makeProvider([]);
			const modelLookup = makeModelLookup();
			const freeCredits = makeFreeCredits(
				() => true,
				async () => {
					throw new Error('Already claimed');
				},
			);
			const tool = buildResolveLlmTool({ credentialProvider, modelLookup, freeCredits });
			const result = await tool.handler!({}, {});

			expect(result).toEqual({ ok: false, reason: 'missing_credential', credentials: [] });
		});

		it('claims free credits when openai is requested without a model and no openai credential exists', async () => {
			const credentialProvider = makeProvider([
				{ id: 'c1', name: 'My Anthropic', type: 'anthropicApi' },
			]);
			const modelLookup = makeModelLookup();
			const freeCredits = makeFreeCredits(
				() => true,
				async () => ({ credentialId: 'free-1', credentialName: 'n8n free OpenAI API credits' }),
			);
			const tool = buildResolveLlmTool({ credentialProvider, modelLookup, freeCredits });
			const result = await tool.handler!({ provider: 'openai' }, {});

			expect(result).toEqual({
				ok: true,
				provider: 'openai',
				model: 'gpt-5-mini',
				credentialId: 'free-1',
				credentialName: 'n8n free OpenAI API credits',
				claimedFreeOpenAiCredits: true,
			});
		});

		it('does not claim free credits when openai is requested with a specific model', async () => {
			const credentialProvider = makeProvider([]);
			const modelLookup = makeModelLookup();
			const freeCredits = makeFreeCredits(() => true);
			const tool = buildResolveLlmTool({ credentialProvider, modelLookup, freeCredits });
			const result = await tool.handler!({ provider: 'openai', model: 'gpt-4.1' }, {});

			expect(result).toEqual({
				ok: false,
				reason: 'missing_credential',
				provider: 'openai',
				credentialType: 'openAiApi',
				credentials: [],
			});
			expect(freeCredits.claim).not.toHaveBeenCalled();
		});

		it('does not claim free credits when a model is requested without a provider', async () => {
			const credentialProvider = makeProvider([]);
			const modelLookup = makeModelLookup();
			const freeCredits = makeFreeCredits(() => true);
			const tool = buildResolveLlmTool({ credentialProvider, modelLookup, freeCredits });
			const result = await tool.handler!({ model: 'claude-sonnet-4-6' }, {});

			expect(result).toEqual({ ok: false, reason: 'missing_credential', credentials: [] });
			expect(freeCredits.claim).not.toHaveBeenCalled();
		});
	});

	describe('credentialId', () => {
		it('resolves a specific credential when credentialId is passed', async () => {
			const credentialProvider = makeProvider([
				{ id: 'c1', name: 'Personal OpenRouter', type: 'openRouterApi' },
				{ id: 'c2', name: 'Work OpenRouter', type: 'openRouterApi' },
			]);
			const modelLookup = makeModelLookup();
			const tool = buildResolveLlmTool({
				credentialProvider,
				modelLookup,
				freeCredits: makeFreeCredits(),
			});
			const result = await tool.handler!({ credentialId: 'c2' }, {});

			expect(result).toEqual({
				ok: true,
				provider: 'openrouter',
				model: 'anthropic/claude-sonnet-4.6',
				credentialId: 'c2',
				credentialName: 'Work OpenRouter',
			});
		});

		it('returns unknown_credential for a credentialId that is not an LLM credential', async () => {
			const credentialProvider = makeProvider([
				{ id: 'c1', name: 'My Anthropic', type: 'anthropicApi' },
			]);
			const modelLookup = makeModelLookup();
			const tool = buildResolveLlmTool({
				credentialProvider,
				modelLookup,
				freeCredits: makeFreeCredits(),
			});
			const result = await tool.handler!({ credentialId: 'nope' }, {});

			expect(result).toEqual({
				ok: false,
				reason: 'unknown_credential',
				credentialId: 'nope',
				credentials: [{ id: 'c1', name: 'My Anthropic', type: 'anthropicApi' }],
			});
		});
	});

	describe('cross-provider auto-pick', () => {
		it('auto-picks the highest-priority provider when multiple providers each have one credential', async () => {
			const credentialProvider = makeProvider([
				{ id: 'c1', name: 'My OpenAI', type: 'openAiApi' },
				{ id: 'c2', name: 'My Anthropic', type: 'anthropicApi' },
			]);
			const modelLookup = makeModelLookup();
			const tool = buildResolveLlmTool({
				credentialProvider,
				modelLookup,
				freeCredits: makeFreeCredits(),
			});
			const result = await tool.handler!({}, {});

			expect(result).toEqual({
				ok: true,
				provider: 'anthropic',
				model: 'claude-sonnet-4-6',
				credentialId: 'c2',
				credentialName: 'My Anthropic',
				autoPicked: true,
				otherProviders: ['openai'],
			});
		});

		it('LLM_PROVIDER_PRIORITY covers every provider in LLM_PROVIDER_DEFAULTS', () => {
			const definedProviders = new Set(Object.values(LLM_PROVIDER_DEFAULTS).map((d) => d.provider));
			expect(new Set(LLM_PROVIDER_PRIORITY)).toEqual(definedProviders);
		});
	});

	describe('model validation against modelLookup', () => {
		it('skips lookup when no model is requested', async () => {
			const credentialProvider = makeProvider([
				{ id: 'c1', name: 'My Anthropic', type: 'anthropicApi' },
			]);
			const modelLookup = makeModelLookup();
			const tool = buildResolveLlmTool({
				credentialProvider,
				modelLookup,
				freeCredits: makeFreeCredits(),
			});
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
			const tool = buildResolveLlmTool({
				credentialProvider,
				modelLookup,
				freeCredits: makeFreeCredits(),
			});
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
			const tool = buildResolveLlmTool({
				credentialProvider,
				modelLookup,
				freeCredits: makeFreeCredits(),
			});
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
			const tool = buildResolveLlmTool({
				credentialProvider,
				modelLookup,
				freeCredits: makeFreeCredits(),
			});
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
			const tool = buildResolveLlmTool({
				credentialProvider,
				modelLookup,
				freeCredits: makeFreeCredits(),
			});
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
			const tool = buildResolveLlmTool({
				credentialProvider,
				modelLookup,
				freeCredits: makeFreeCredits(),
			});
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
			const tool = buildResolveLlmTool({
				credentialProvider,
				modelLookup,
				freeCredits: makeFreeCredits(),
			});
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
			const tool = buildResolveLlmTool({
				credentialProvider,
				modelLookup,
				freeCredits: makeFreeCredits(),
			});
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
