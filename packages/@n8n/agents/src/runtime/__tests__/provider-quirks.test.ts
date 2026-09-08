import { describe, it, expect } from 'vitest';

import {
	HIGH_REASONING_DEFAULT_MAX_OUTPUT_TOKENS,
	applyToolProviderOptionDefaults,
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
	it('anthropic: budget-thinking model defaults budgetTokens to 10000', () => {
		expect(
			getProviderQuirks('anthropic').thinkingToProviderOptions?.({}, 'anthropic/claude-sonnet-4-5'),
		).toEqual({
			anthropic: { thinking: { type: 'enabled', budgetTokens: 10000 } },
		});
	});

	it('anthropic: adaptive mode defaults display to summarized and effort to medium', () => {
		expect(
			getProviderQuirks('anthropic').thinkingToProviderOptions?.(
				{ mode: 'adaptive' },
				'anthropic/claude-sonnet-5',
			),
		).toEqual({
			anthropic: {
				thinking: { type: 'adaptive', display: 'summarized' },
				effort: 'medium',
			},
		});
	});

	it('anthropic: adaptive mode forwards explicit effort', () => {
		expect(
			getProviderQuirks('anthropic').thinkingToProviderOptions?.(
				{ mode: 'adaptive', effort: 'high' },
				'anthropic/claude-sonnet-5',
			),
		).toEqual({
			anthropic: {
				thinking: { type: 'adaptive', display: 'summarized' },
				effort: 'high',
			},
		});
	});

	// The APIs are mutually exclusive: sending the config's shape rather than the
	// model's is a rejected request, not a degraded one.
	it('anthropic: sends adaptive to an adaptive model even when a token budget was configured', () => {
		expect(
			getProviderQuirks('anthropic').thinkingToProviderOptions?.(
				{ budgetTokens: 4000 },
				'anthropic/claude-sonnet-5',
			),
		).toEqual({
			anthropic: {
				thinking: { type: 'adaptive', display: 'summarized' },
				effort: 'medium',
			},
		});
	});

	it('anthropic: sends a budget to a budget-thinking model even when adaptive was configured', () => {
		expect(
			getProviderQuirks('anthropic').thinkingToProviderOptions?.(
				{ mode: 'adaptive' },
				'anthropic/claude-sonnet-4-5',
			),
		).toEqual({
			anthropic: { thinking: { type: 'enabled', budgetTokens: 10000 } },
		});
	});

	it('anthropic: enabled mode with effort keeps default budgetTokens', () => {
		expect(
			getProviderQuirks('anthropic').thinkingToProviderOptions?.(
				{ mode: 'enabled', effort: 'medium' },
				'anthropic/claude-sonnet-4-5',
			),
		).toEqual({
			anthropic: {
				thinking: { type: 'enabled', budgetTokens: 10000 },
				effort: 'medium',
			},
		});
	});

	it('anthropic: enabled mode with effort forwards explicit budgetTokens', () => {
		expect(
			getProviderQuirks('anthropic').thinkingToProviderOptions?.(
				{ mode: 'enabled', effort: 'medium', budgetTokens: 5000 },
				'anthropic/claude-sonnet-4-5',
			),
		).toEqual({
			anthropic: {
				thinking: { type: 'enabled', budgetTokens: 5000 },
				effort: 'medium',
			},
		});
	});

	it('google-vertex-anthropic: emits Anthropic adaptive thinking under the anthropic namespace', () => {
		expect(
			getProviderQuirks('google-vertex-anthropic').thinkingToProviderOptions?.(
				{ mode: 'adaptive', effort: 'medium' },
				'google-vertex-anthropic/claude-opus-4-8',
			),
		).toEqual({
			anthropic: {
				thinking: { type: 'adaptive', display: 'summarized' },
				effort: 'medium',
			},
		});
	});

	it('google-vertex-anthropic: tool defaults land under the anthropic namespace', () => {
		expect(getProviderQuirks('google-vertex-anthropic').providerOptionsNamespace).toBe('anthropic');
		expect(applyToolProviderOptionDefaults(undefined)).toEqual({
			anthropic: { eagerInputStreaming: false },
		});
	});

	it('openai: defaults reasoningEffort to medium', () => {
		expect(getProviderQuirks('openai').thinkingToProviderOptions?.({}, 'openai/gpt-5')).toEqual({
			openai: { reasoningEffort: 'medium', reasoningSummary: null },
		});
	});

	it('openai: forwards GPT-5.6 Sol compatible reasoningEffort values', () => {
		expect(
			getProviderQuirks('openai').thinkingToProviderOptions?.(
				{ reasoningEffort: 'medium' },
				'openai/gpt-5.6-sol',
			),
		).toEqual({
			openai: { reasoningEffort: 'medium', reasoningSummary: null },
		});
		expect(
			getProviderQuirks('openai').thinkingToProviderOptions?.(
				{ reasoningEffort: 'xhigh' },
				'openai/gpt-5.6-sol',
			),
		).toEqual({
			openai: { reasoningEffort: 'xhigh', reasoningSummary: null },
		});
	});

	it('google: forwards thinkingBudget and thinkingLevel when set', () => {
		expect(
			getProviderQuirks('google').thinkingToProviderOptions?.(
				{ thinkingBudget: 2048, thinkingLevel: 'high' },
				'google/gemini-3-pro',
			),
		).toEqual({
			google: { thinkingConfig: { thinkingBudget: 2048, thinkingLevel: 'high' } },
		});
	});

	it('xai: defaults reasoningEffort to high', () => {
		expect(getProviderQuirks('xai').thinkingToProviderOptions?.({}, 'xai/grok-4')).toEqual({
			xai: { reasoningEffort: 'high' },
		});
	});

	it('custom: maps reasoningEffort to providerOptions.custom', () => {
		expect(
			getProviderQuirks('custom').thinkingToProviderOptions?.(
				{
					reasoningEffort: 'high',
				},
				'custom/Kimi-K3',
			),
		).toEqual({
			custom: { reasoningEffort: 'high' },
		});
	});

	it('custom: omits reasoning effort when unset', () => {
		expect(getProviderQuirks('custom').thinkingToProviderOptions?.({}, 'custom/Kimi-K3')).toEqual(
			{},
		);
	});

	it('moonshotai: maps reasoningEffort to providerOptions.moonshotai', () => {
		expect(
			getProviderQuirks('moonshotai').thinkingToProviderOptions?.(
				{
					reasoningEffort: 'low',
				},
				'moonshotai/kimi-k3',
			),
		).toEqual({
			moonshotai: { reasoningEffort: 'low' },
		});
	});
});

describe('resolveDefaultMaxOutputTokens', () => {
	it.each([
		'custom/accounts/fireworks/models/kimi-k3',
		'openrouter/moonshotai/kimi-k3',
		'moonshotai/kimi-k3',
		'custom/Kimi-K3',
	] as const)('raises the output cap to the Kimi K3 default for %s', (modelId) => {
		expect(resolveDefaultMaxOutputTokens(modelId)).toBe(HIGH_REASONING_DEFAULT_MAX_OUTPUT_TOKENS);
	});

	it('leaves unrelated models unset', () => {
		expect(resolveDefaultMaxOutputTokens('custom/deepseek-ai/DeepSeek-V4-Pro')).toBeUndefined();
		expect(resolveDefaultMaxOutputTokens('anthropic/claude-sonnet-4-5')).toBeUndefined();
	});
});
