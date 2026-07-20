import { describe, it, expect } from 'vitest';

import { applyToolProviderOptionDefaults, getProviderQuirks } from '../model/provider-quirks';

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

	it('anthropic: adaptive mode defaults display to summarized', () => {
		expect(
			getProviderQuirks('anthropic').thinkingToProviderOptions?.({ mode: 'adaptive' }),
		).toEqual({
			anthropic: { thinking: { type: 'adaptive', display: 'summarized' } },
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

	it('openai: defaults reasoningEffort to medium', () => {
		expect(getProviderQuirks('openai').thinkingToProviderOptions?.({})).toEqual({
			openai: { reasoningEffort: 'medium' },
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
});
