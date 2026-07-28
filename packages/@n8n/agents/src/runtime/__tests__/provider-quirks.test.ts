import { describe, it, expect } from 'vitest';

import {
	ANTHROPIC_PROXY_MAX_OUTPUT_TOKENS,
	FIREWORKS_ANTHROPIC_THINKING_BUDGET_TOKENS,
	GLM_52_DEFAULT_MAX_OUTPUT_TOKENS,
	KIMI_K3_DEFAULT_MAX_OUTPUT_TOKENS,
	applyToolProviderOptionDefaults,
	buildCallProviderOptionDefaults,
	getProviderQuirks,
	resolveDefaultMaxOutputTokens,
} from '../model/provider-quirks';

describe('getProviderQuirks', () => {
	it('returns an empty object for an unknown provider', () => {
		expect(getProviderQuirks('some-unknown-provider')).toEqual({});
	});
});

describe('applyToolProviderOptionDefaults', () => {
	it('merges the anthropic default into tools with no providerOptions', () => {
		expect(applyToolProviderOptionDefaults(undefined)).toEqual({
			anthropic: { eagerInputStreaming: false },
		});
	});

	it('keeps an explicit per-tool override over the default', () => {
		expect(applyToolProviderOptionDefaults({ anthropic: { eagerInputStreaming: true } })).toEqual({
			anthropic: { eagerInputStreaming: true },
		});
	});

	it('leaves other providers untouched', () => {
		expect(applyToolProviderOptionDefaults({ openai: { strict: true } })).toEqual({
			openai: { strict: true },
			anthropic: { eagerInputStreaming: false },
		});
	});
});

describe('thinkingToProviderOptions', () => {
	it('anthropic: enabled mode defaults budgetTokens to 10000', () => {
		expect(getProviderQuirks('anthropic').thinkingToProviderOptions?.({})).toEqual({
			anthropic: { thinking: { type: 'enabled', budgetTokens: 10000 } },
		});
	});

	it('anthropic: adaptive mode defaults display to summarized and effort to medium', () => {
		expect(
			getProviderQuirks('anthropic').thinkingToProviderOptions?.({ mode: 'adaptive' }),
		).toEqual({
			anthropic: {
				thinking: { type: 'adaptive', display: 'summarized' },
				effort: 'medium',
			},
		});
	});

	it('anthropic: adaptive mode forwards explicit effort', () => {
		expect(
			getProviderQuirks('anthropic').thinkingToProviderOptions?.({
				mode: 'adaptive',
				effort: 'high',
			}),
		).toEqual({
			anthropic: {
				thinking: { type: 'adaptive', display: 'summarized' },
				effort: 'high',
			},
		});
	});

	it('anthropic: adaptive mode forwards effort when set', () => {
		expect(
			getProviderQuirks('anthropic').thinkingToProviderOptions?.({
				mode: 'adaptive',
				effort: 'low',
			}),
		).toEqual({
			anthropic: {
				thinking: { type: 'adaptive', display: 'summarized' },
				effort: 'low',
			},
		});
	});

	it('anthropic: enabled mode with effort keeps default budgetTokens', () => {
		expect(
			getProviderQuirks('anthropic').thinkingToProviderOptions?.({
				mode: 'enabled',
				effort: 'medium',
			}),
		).toEqual({
			anthropic: {
				thinking: { type: 'enabled', budgetTokens: 10000 },
				effort: 'medium',
			},
		});
	});

	it('anthropic: enabled mode with effort forwards explicit budgetTokens', () => {
		expect(
			getProviderQuirks('anthropic').thinkingToProviderOptions?.({
				mode: 'enabled',
				effort: 'medium',
				budgetTokens: 5000,
			}),
		).toEqual({
			anthropic: {
				thinking: { type: 'enabled', budgetTokens: 5000 },
				effort: 'medium',
			},
		});
	});

	it('openai: defaults reasoningEffort to medium (AI SDK providerOptions form)', () => {
		expect(getProviderQuirks('openai').thinkingToProviderOptions?.({})).toEqual({
			openai: { reasoningEffort: 'medium', reasoningSummary: null },
		});
	});

	it('openai: forwards GPT-5.6 Sol compatible reasoningEffort values', () => {
		expect(
			getProviderQuirks('openai').thinkingToProviderOptions?.({
				reasoningEffort: 'medium',
			}),
		).toEqual({
			openai: { reasoningEffort: 'medium', reasoningSummary: null },
		});
		expect(
			getProviderQuirks('openai').thinkingToProviderOptions?.({
				reasoningEffort: 'xhigh',
			}),
		).toEqual({
			openai: { reasoningEffort: 'xhigh', reasoningSummary: null },
		});
	});

	it('google: forwards thinkingBudget and thinkingLevel when set', () => {
		expect(
			getProviderQuirks('google').thinkingToProviderOptions?.({
				thinkingBudget: 2048,
				thinkingLevel: 'high',
			}),
		).toEqual({
			google: { thinkingConfig: { thinkingBudget: 2048, thinkingLevel: 'high' } },
		});
	});

	it('xai: defaults reasoningEffort to high', () => {
		expect(getProviderQuirks('xai').thinkingToProviderOptions?.({})).toEqual({
			xai: { reasoningEffort: 'high' },
		});
	});

	it('openrouter: maps reasoningEffort to reasoning.effort', () => {
		expect(
			getProviderQuirks('openrouter').thinkingToProviderOptions?.({
				reasoningEffort: 'low',
			}),
		).toEqual({
			openrouter: { reasoning: { effort: 'low' } },
		});
	});

	it('openrouter: defaults reasoning effort to medium', () => {
		expect(getProviderQuirks('openrouter').thinkingToProviderOptions?.({})).toEqual({
			openrouter: { reasoning: { effort: 'medium' } },
		});
	});

	it('baseten: maps reasoningEffort to providerOptions.baseten', () => {
		expect(
			getProviderQuirks('baseten').thinkingToProviderOptions?.({
				reasoningEffort: 'high',
			}),
		).toEqual({
			baseten: { reasoningEffort: 'high' },
		});
	});

	it('baseten: defaults reasoning effort to medium', () => {
		expect(getProviderQuirks('baseten').thinkingToProviderOptions?.({})).toEqual({
			baseten: { reasoningEffort: 'medium' },
		});
	});

	it('fireworks: defaults service_tier to priority', () => {
		expect(getProviderQuirks('fireworks').callProviderOptionDefaults).toEqual({
			service_tier: 'priority',
		});
	});

	it('fireworks: defaults reasoning effort to medium', () => {
		expect(getProviderQuirks('fireworks').thinkingToProviderOptions?.({})).toEqual({
			fireworks: { reasoningEffort: 'medium' },
		});
	});

	it('fireworks: maps reasoningEffort to providerOptions.fireworks', () => {
		expect(
			getProviderQuirks('fireworks').thinkingToProviderOptions?.({
				reasoningEffort: 'high',
			}),
		).toEqual({
			fireworks: { reasoningEffort: 'high' },
		});
	});
});

describe('buildCallProviderOptionDefaults', () => {
	it('returns fireworks priority tier defaults for fireworks models', () => {
		expect(buildCallProviderOptionDefaults('fireworks/accounts/fireworks/models/kimi-k3')).toEqual({
			fireworks: { service_tier: 'priority' },
		});
	});

	it('returns undefined for providers without call defaults', () => {
		expect(buildCallProviderOptionDefaults('anthropic/claude-sonnet-4-6')).toBeUndefined();
	});
});

describe('resolveDefaultMaxOutputTokens', () => {
	it.each([
		'baseten/zai-org/GLM-5.2',
		'baseten/zai-org/GLM-5.2-Fast',
		'openai/zai-org/GLM-5.2',
		'openai/zai-org/GLM-5.2-Fast',
	] as const)('raises the output cap for GLM 5.2 models (%s)', (modelId) => {
		expect(resolveDefaultMaxOutputTokens(modelId)).toBe(GLM_52_DEFAULT_MAX_OUTPUT_TOKENS);
	});

	it.each([
		'fireworks/accounts/fireworks/models/kimi-k3',
		'fireworks/accounts/fireworks/routers/kimi-k3-fast',
		'openrouter/moonshotai/kimi-k3',
	] as const)('raises the output cap to the Kimi K3 default for %s', (modelId) => {
		expect(resolveDefaultMaxOutputTokens(modelId)).toBe(KIMI_K3_DEFAULT_MAX_OUTPUT_TOKENS);
	});

	it.each([
		'anthropic/accounts/fireworks/models/kimi-k3',
		'anthropic/accounts/fireworks/routers/kimi-k3-fast',
	] as const)('leaves room for thinking budget under the Anthropic proxy cap for %s', (modelId) => {
		expect(resolveDefaultMaxOutputTokens(modelId)).toBe(
			ANTHROPIC_PROXY_MAX_OUTPUT_TOKENS - FIREWORKS_ANTHROPIC_THINKING_BUDGET_TOKENS,
		);
	});

	it('leaves unrelated models unset', () => {
		expect(resolveDefaultMaxOutputTokens('baseten/deepseek-ai/DeepSeek-V4-Pro')).toBeUndefined();
		expect(resolveDefaultMaxOutputTokens('anthropic/claude-sonnet-4-5')).toBeUndefined();
	});
});
