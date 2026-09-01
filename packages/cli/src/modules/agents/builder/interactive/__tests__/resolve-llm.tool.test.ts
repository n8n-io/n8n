import type { CredentialListItem, CredentialProvider } from '@n8n/agents';
import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';
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

/**
 * A live list that contains the provider's maintained default, i.e. the happy
 * path where the credential can actually reach it.
 */
function makeModelLookupServingDefault(credentialType: string) {
	const { defaultModel } = LLM_PROVIDER_DEFAULTS[credentialType];
	return makeModelLookup(async () => [{ name: defaultModel, value: defaultModel }]);
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
		const modelLookup = makeModelLookupServingDefault('openAiApi');
		const tool = buildResolveLlmTool({
			credentialProvider,
			modelLookup,
			freeCredits: makeFreeCredits(),
		});
		const result = await tool.handler!({}, {});

		expect(result).toEqual({
			ok: true,
			provider: 'openai',
			model: 'gpt-5.6-terra',
			credentialId: 'c1',
			credentialName: 'My OpenAI',
		});
		// The default is verified against the credential's live list, not trusted.
		expect(modelLookup.list).toHaveBeenCalledWith('c1', 'openAiApi', 'openai');
	});

	it('auto-resolves the requested provider when multiple LLM-provider credentials exist', async () => {
		const credentialProvider = makeProvider([
			{ id: 'c1', name: 'My Anthropic', type: 'anthropicApi' },
			{ id: 'c2', name: 'My OpenRouter', type: 'openRouterApi' },
		]);
		const modelLookup = makeModelLookupServingDefault('openRouterApi');
		const tool = buildResolveLlmTool({
			credentialProvider,
			modelLookup,
			freeCredits: makeFreeCredits(),
		});
		const result = await tool.handler!({ provider: 'openrouter' }, {});

		expect(result).toEqual({
			ok: true,
			provider: 'openrouter',
			model: 'anthropic/claude-sonnet-5',
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
			const modelLookup = makeModelLookupServingDefault('openRouterApi');
			const tool = buildResolveLlmTool({
				credentialProvider,
				modelLookup,
				freeCredits: makeFreeCredits(),
			});
			const result = await tool.handler!({ credentialId: 'c2' }, {});

			expect(result).toEqual({
				ok: true,
				provider: 'openrouter',
				model: 'anthropic/claude-sonnet-5',
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
			const modelLookup = makeModelLookupServingDefault('anthropicApi');
			const tool = buildResolveLlmTool({
				credentialProvider,
				modelLookup,
				freeCredits: makeFreeCredits(),
			});
			const result = await tool.handler!({}, {});

			expect(result).toEqual({
				ok: true,
				provider: 'anthropic',
				model: 'claude-sonnet-5',
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

	// INS-1263: resolve_llm returned the maintained default without checking it
	// against the credential, so a model the provider does not serve shipped into
	// the agent config and every call then failed with `404 Not Found`.
	describe('provider default verification for own credentials', () => {
		const googleCredential = { id: 'g1', name: 'My Gemini', type: 'googlePalmApi' };

		it('reports unknown_model instead of a default the credential cannot reach', async () => {
			const modelLookup = makeModelLookup(async () => [
				{ name: 'models/gemini-3.5-flash', value: 'models/gemini-3.5-flash' },
				{ name: 'models/gemini-2.5-flash', value: 'models/gemini-2.5-flash' },
			]);
			const tool = buildResolveLlmTool({
				credentialProvider: makeProvider([googleCredential]),
				modelLookup,
				freeCredits: makeFreeCredits(),
			});
			const result = await tool.handler!({ provider: 'google' }, {});

			expect(result).toMatchObject({
				ok: false,
				reason: 'unknown_model',
				provider: 'google',
				requestedModel: LLM_PROVIDER_DEFAULTS.googlePalmApi.defaultModel,
			});
		});

		it('never falls back to an arbitrary model from a provider catalog', async () => {
			const modelLookup = makeModelLookup(async () => [
				{ name: 'models/gemini-1.0-pro-vision', value: 'models/gemini-1.0-pro-vision' },
			]);
			const tool = buildResolveLlmTool({
				credentialProvider: makeProvider([googleCredential]),
				modelLookup,
				freeCredits: makeFreeCredits(),
			});
			const result = await tool.handler!({ provider: 'google' }, {});

			// Unlike the short curated gateway allowlist, the first entry of a
			// provider's own catalog is arbitrary — the agent must choose.
			expect(result).toMatchObject({ ok: false, reason: 'unknown_model' });
		});

		it('surfaces available models as callable ids so the agent can retry', async () => {
			const modelLookup = makeModelLookup(async () => [
				{ name: 'models/gemini-3.5-flash', value: 'models/gemini-3.5-flash' },
			]);
			const tool = buildResolveLlmTool({
				credentialProvider: makeProvider([googleCredential]),
				modelLookup,
				freeCredits: makeFreeCredits(),
			});
			const result = await tool.handler!({ provider: 'google' }, {});

			// The `models/` prefix must be stripped: it passes config validation and
			// then fails at run time.
			expect(result).toMatchObject({
				availableModels: [{ name: 'gemini-3.5-flash', value: 'gemini-3.5-flash' }],
			});
		});

		it('resolves the default from a models/-prefixed google list', async () => {
			const { defaultModel } = LLM_PROVIDER_DEFAULTS.googlePalmApi;
			const modelLookup = makeModelLookup(async () => [
				{ name: `models/${defaultModel}`, value: `models/${defaultModel}` },
			]);
			const tool = buildResolveLlmTool({
				credentialProvider: makeProvider([googleCredential]),
				modelLookup,
				freeCredits: makeFreeCredits(),
			});
			const result = await tool.handler!({ provider: 'google' }, {});

			expect(result).toMatchObject({ ok: true, provider: 'google', model: defaultModel });
		});

		it('returns a requested google model as a callable id', async () => {
			const modelLookup = makeModelLookup(async () => [
				{ name: 'models/gemini-3.5-flash', value: 'models/gemini-3.5-flash' },
			]);
			const tool = buildResolveLlmTool({
				credentialProvider: makeProvider([googleCredential]),
				modelLookup,
				freeCredits: makeFreeCredits(),
			});
			const result = await tool.handler!({ provider: 'google', model: 'gemini-3.5-flash' }, {});

			expect(result).toMatchObject({ ok: true, model: 'gemini-3.5-flash' });
		});

		it('returns model_lookup_failed rather than an unverified default', async () => {
			const modelLookup = makeModelLookup(async () => {
				throw new Error('credentials invalid');
			});
			const tool = buildResolveLlmTool({
				credentialProvider: makeProvider([googleCredential]),
				modelLookup,
				freeCredits: makeFreeCredits(),
			});
			const result = await tool.handler!({ provider: 'google' }, {});

			expect(result).toMatchObject({
				ok: false,
				reason: 'model_lookup_failed',
				provider: 'google',
				error: 'credentials invalid',
			});
		});
	});

	describe('model validation against modelLookup', () => {
		it('verifies the provider default against the lookup when no model is requested', async () => {
			const credentialProvider = makeProvider([
				{ id: 'c1', name: 'My Anthropic', type: 'anthropicApi' },
			]);
			const modelLookup = makeModelLookupServingDefault('anthropicApi');
			const tool = buildResolveLlmTool({
				credentialProvider,
				modelLookup,
				freeCredits: makeFreeCredits(),
			});
			const result = await tool.handler!({ provider: 'anthropic' }, {});

			expect(result).toEqual({
				ok: true,
				provider: 'anthropic',
				model: 'claude-sonnet-5',
				credentialId: 'c1',
				credentialName: 'My Anthropic',
			});
			expect(modelLookup.list).toHaveBeenCalledWith('c1', 'anthropicApi', 'anthropic');
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

	describe('n8n Connect managed credentials', () => {
		it('defaults to n8n Connect with the provider default when the gateway allowlists it', async () => {
			const modelLookup = makeModelLookup(async () => [
				{ name: 'Claude Sonnet 4.6', value: 'claude-sonnet-4-6' },
				{ name: 'Claude Haiku 4.5', value: 'claude-haiku-4-5' },
			]);
			const tool = buildResolveLlmTool({
				credentialProvider: makeProvider([]),
				modelLookup,
				isProviderServedByGateway: async (provider) => provider === 'anthropic',
				freeCredits: makeFreeCredits(),
			});
			const result = await tool.handler!({ provider: 'anthropic' }, {});

			// Default model resolved against the gateway allowlist, not blindly from the static default.
			expect(result).toEqual({
				ok: true,
				provider: 'anthropic',
				model: 'claude-sonnet-4-6',
				credentialId: AI_GATEWAY_MANAGED_TAG,
				credentialName: 'Gateway credits',
			});
			expect(modelLookup.list).toHaveBeenCalledWith(
				AI_GATEWAY_MANAGED_TAG,
				'anthropicApi',
				'anthropic',
			);
		});

		it('falls back to the first allowlisted model when the gateway does not serve the static default', async () => {
			// Gateway serves the provider but not the provider's static default model.
			const modelLookup = makeModelLookup(async () => [
				{ name: 'Claude Haiku 4.5', value: 'claude-haiku-4-5' },
			]);
			const tool = buildResolveLlmTool({
				credentialProvider: makeProvider([]),
				modelLookup,
				isProviderServedByGateway: async (provider) => provider === 'anthropic',
				freeCredits: makeFreeCredits(),
			});
			const result = await tool.handler!({ provider: 'anthropic' }, {});

			expect(result).toMatchObject({
				ok: true,
				provider: 'anthropic',
				model: 'claude-haiku-4-5',
				credentialId: AI_GATEWAY_MANAGED_TAG,
			});
		});

		it('does not auto-resolve to an un-allowlisted default: reports unknown_model when the gateway lists nothing', async () => {
			const tool = buildResolveLlmTool({
				credentialProvider: makeProvider([]),
				modelLookup: makeModelLookup(async () => []),
				isProviderServedByGateway: async (provider) => provider === 'anthropic',
				freeCredits: makeFreeCredits(),
			});
			const result = await tool.handler!({ provider: 'anthropic' }, {});

			expect(result).toMatchObject({
				ok: false,
				reason: 'unknown_model',
				provider: 'anthropic',
			});
		});

		it('returns missing_credential when no own credential and the gateway does not serve the provider', async () => {
			const tool = buildResolveLlmTool({
				credentialProvider: makeProvider([]),
				modelLookup: makeModelLookup(),
				isProviderServedByGateway: async () => false,
				freeCredits: makeFreeCredits(),
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
				freeCredits: makeFreeCredits(),
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
					// Two keys for the top-priority provider (anthropic) keep the result
					// ambiguous, so the full credential list is returned instead of an auto-pick.
					{ id: 'cred-1', name: 'My Anthropic', type: 'anthropicApi' },
					{ id: 'cred-1b', name: 'My Anthropic 2', type: 'anthropicApi' },
					{ id: 'cred-2', name: 'My xAI', type: 'xAiApi' },
				]),
				modelLookup: makeModelLookup(),
				isProviderServedByGateway: async (provider) => served.has(provider),
				freeCredits: makeFreeCredits(),
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
				name: 'Gateway credits',
				type: 'openAiApi',
				provider: 'openai',
			});
			expect(creds).toContainEqual({
				id: AI_GATEWAY_MANAGED_TAG,
				name: 'Gateway credits',
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
				freeCredits: makeFreeCredits(),
			});
			const result = await tool.handler!({ provider: 'openai', model: 'gpt-5-mini' }, {});

			expect(result).toMatchObject({
				ok: true,
				model: 'gpt-5-mini',
				credentialId: AI_GATEWAY_MANAGED_TAG,
			});
			expect(modelLookup.list).toHaveBeenCalledWith(AI_GATEWAY_MANAGED_TAG, 'openAiApi', 'openai');
		});

		it('uses the provider to disambiguate repeated managed credential ids', async () => {
			const modelLookup = makeModelLookup(async (_credentialId, _credentialType, provider) =>
				provider === 'google'
					? [{ name: 'Gemini 2.5 Pro', value: 'gemini-2.5-pro' }]
					: [{ name: 'GPT-5 mini', value: 'gpt-5-mini' }],
			);
			const tool = buildResolveLlmTool({
				credentialProvider: makeProvider([]),
				modelLookup,
				isProviderServedByGateway: async (provider) =>
					provider === 'openai' || provider === 'google',
				freeCredits: makeFreeCredits(),
			});
			const result = await tool.handler!(
				{ provider: 'google', credentialId: AI_GATEWAY_MANAGED_TAG },
				{},
			);

			expect(result).toEqual({
				ok: true,
				provider: 'google',
				model: 'gemini-2.5-pro',
				credentialId: AI_GATEWAY_MANAGED_TAG,
				credentialName: 'Gateway credits',
			});
			expect(modelLookup.list).toHaveBeenCalledWith(
				AI_GATEWAY_MANAGED_TAG,
				'googlePalmApi',
				'google',
			);
		});

		it('stays ambiguous for a passed-back managed tag when no provider disambiguates it', async () => {
			const tool = buildResolveLlmTool({
				credentialProvider: makeProvider([]),
				modelLookup: makeModelLookup(),
				isProviderServedByGateway: async (provider) =>
					provider === 'openai' || provider === 'google',
				freeCredits: makeFreeCredits(),
			});
			// Several managed entries share the tag; without a provider the tool must not
			// silently pick the first one.
			const result = await tool.handler!({ credentialId: AI_GATEWAY_MANAGED_TAG }, {});

			expect(result).toMatchObject({ ok: false, reason: 'ambiguous_credential' });
			const { credentials } = result as {
				credentials: Array<{ id: string; type: string; provider: string }>;
			};
			expect(credentials).toContainEqual({
				id: AI_GATEWAY_MANAGED_TAG,
				name: 'Gateway credits',
				type: 'openAiApi',
				provider: 'openai',
			});
			expect(credentials).toContainEqual({
				id: AI_GATEWAY_MANAGED_TAG,
				name: 'Gateway credits',
				type: 'googlePalmApi',
				provider: 'google',
			});
		});

		it('returns unsupported_provider when the passed-back managed tag is paired with an unknown provider', async () => {
			const tool = buildResolveLlmTool({
				credentialProvider: makeProvider([]),
				modelLookup: makeModelLookup(),
				isProviderServedByGateway: async (provider) =>
					provider === 'openai' || provider === 'google',
				freeCredits: makeFreeCredits(),
			});
			const result = await tool.handler!(
				{ provider: 'not-a-provider', credentialId: AI_GATEWAY_MANAGED_TAG },
				{},
			);

			expect(result).toMatchObject({ ok: false, reason: 'unsupported_provider' });
		});

		it('does not accept a lone managed entry for a provider the gateway does not serve', async () => {
			// Only OpenAI is managed, so the tag can only mean OpenAI. Asking for Anthropic
			// with that tag must not silently resolve to OpenAI.
			const tool = buildResolveLlmTool({
				credentialProvider: makeProvider([]),
				modelLookup: makeModelLookup(),
				isProviderServedByGateway: async (provider) => provider === 'openai',
				freeCredits: makeFreeCredits(),
			});
			const result = await tool.handler!(
				{ provider: 'anthropic', credentialId: AI_GATEWAY_MANAGED_TAG },
				{},
			);

			expect(result).toMatchObject({ ok: false, reason: 'ambiguous_credential' });
		});

		it('stays ambiguous when the provider is valid but matches no repeated managed entry', async () => {
			const tool = buildResolveLlmTool({
				credentialProvider: makeProvider([]),
				modelLookup: makeModelLookup(),
				// Anthropic is a known provider but not served here, so no managed entry
				// matches it — the tag stays ambiguous rather than resolving wrongly.
				isProviderServedByGateway: async (provider) =>
					provider === 'openai' || provider === 'google',
				freeCredits: makeFreeCredits(),
			});
			const result = await tool.handler!(
				{ provider: 'anthropic', credentialId: AI_GATEWAY_MANAGED_TAG },
				{},
			);

			expect(result).toMatchObject({ ok: false, reason: 'ambiguous_credential' });
		});
	});

	describe('explicit Gateway credits request (useGatewayCredits)', () => {
		it('resolves Gateway credits for the requested provider even when the user has their own credential', async () => {
			const modelLookup = makeModelLookup(async () => [
				{ name: 'GPT-5 mini', value: 'gpt-5-mini' },
			]);
			const tool = buildResolveLlmTool({
				// User has their own OpenAI key — the implicit path would suppress n8n
				// credits, but an explicit request wins.
				credentialProvider: makeProvider([{ id: 'own-1', name: 'My OpenAI', type: 'openAiApi' }]),
				modelLookup,
				isProviderServedByGateway: async (provider) => provider === 'openai',
				freeCredits: makeFreeCredits(),
			});
			const result = await tool.handler!({ provider: 'openai', useGatewayCredits: true }, {});

			expect(result).toEqual({
				ok: true,
				provider: 'openai',
				model: 'gpt-5-mini',
				credentialId: AI_GATEWAY_MANAGED_TAG,
				credentialName: 'Gateway credits',
			});
		});

		it('resolves the sole served provider when none is named', async () => {
			const modelLookup = makeModelLookup(async () => [
				{ name: 'GPT-5 mini', value: 'gpt-5-mini' },
			]);
			const tool = buildResolveLlmTool({
				credentialProvider: makeProvider([]),
				modelLookup,
				isProviderServedByGateway: async (provider) => provider === 'openai',
				freeCredits: makeFreeCredits(),
			});
			const result = await tool.handler!({ useGatewayCredits: true }, {});

			expect(result).toMatchObject({
				ok: true,
				provider: 'openai',
				credentialId: AI_GATEWAY_MANAGED_TAG,
				credentialName: 'Gateway credits',
			});
		});

		it('reports gateway_credits_unsupported_provider when the gateway does not serve the requested provider', async () => {
			const tool = buildResolveLlmTool({
				credentialProvider: makeProvider([]),
				modelLookup: makeModelLookup(),
				isProviderServedByGateway: async (provider) => provider === 'openai',
				freeCredits: makeFreeCredits(),
			});
			const result = await tool.handler!({ provider: 'anthropic', useGatewayCredits: true }, {});

			expect(result).toMatchObject({
				ok: false,
				reason: 'gateway_credits_unsupported_provider',
				provider: 'anthropic',
			});
		});

		it('reports ambiguous_gateway_credits_provider with the served providers when none is named', async () => {
			const served = new Set(['openai', 'google']);
			const tool = buildResolveLlmTool({
				credentialProvider: makeProvider([]),
				modelLookup: makeModelLookup(),
				isProviderServedByGateway: async (provider) => served.has(provider),
				freeCredits: makeFreeCredits(),
			});
			const result = await tool.handler!({ useGatewayCredits: true }, {});

			expect(result).toMatchObject({ ok: false, reason: 'ambiguous_gateway_credits_provider' });
			const { providers } = result as { providers: string[] };
			expect(providers).toEqual(expect.arrayContaining(['openai', 'google']));
		});

		it('reports gateway_credits_unavailable when the gateway serves no provider', async () => {
			const tool = buildResolveLlmTool({
				credentialProvider: makeProvider([]),
				modelLookup: makeModelLookup(),
				isProviderServedByGateway: async () => false,
				freeCredits: makeFreeCredits(),
			});
			const result = await tool.handler!({ useGatewayCredits: true }, {});

			// No providers list — there is nothing for the caller to pick from.
			expect(result).toEqual({ ok: false, reason: 'gateway_credits_unavailable' });
		});

		it('surfaces the allowlisted models on unknown_model so the agent can retry', async () => {
			const modelLookup = makeModelLookup(async () => [
				{ name: 'GPT-5 mini', value: 'gpt-5-mini' },
			]);
			const tool = buildResolveLlmTool({
				credentialProvider: makeProvider([]),
				modelLookup,
				isProviderServedByGateway: async (provider) => provider === 'openai',
				freeCredits: makeFreeCredits(),
			});
			const result = await tool.handler!(
				{ provider: 'openai', model: 'gpt-nonexistent', useGatewayCredits: true },
				{},
			);

			expect(result).toMatchObject({
				ok: false,
				reason: 'unknown_model',
				provider: 'openai',
				availableModels: [{ name: 'GPT-5 mini', value: 'gpt-5-mini' }],
			});
		});
	});
});
