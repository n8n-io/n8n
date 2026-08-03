import { describe, it, expect } from 'vitest';

import type { ReasoningLevel } from '../../types';
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

	it('openai: defaults reasoningEffort to medium', () => {
		expect(getProviderQuirks('openai').thinkingToProviderOptions?.({}, 'openai/gpt-5')).toEqual({
			openai: { reasoningEffort: 'medium', reasoningSummary: null },
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
});

describe('reasoningToProviderOptions', () => {
	const anthropicReasoning = (modelId: string, level: ReasoningLevel = 'medium') =>
		getProviderQuirks('anthropic').reasoningToProviderOptions?.(level, modelId);

	// Adaptive models withhold the thinking text unless display is summarized, so
	// the reasoning level on its own produces empty thinking blocks.
	it.each([
		'anthropic/claude-sonnet-5',
		'anthropic/claude-opus-5',
		'anthropic/claude-opus-4-8',
		'anthropic/claude-sonnet-4-6',
		// Unknown Claude models follow the AI SDK's own adaptive fallback.
		'anthropic/claude-sonnet-7',
	])('asks %s for summarized thinking', (modelId) => {
		expect(anthropicReasoning(modelId)).toEqual({
			anthropic: { thinking: { type: 'adaptive', display: 'summarized' } },
		});
	});

	it.each([
		'anthropic/claude-sonnet-4-5',
		'anthropic/claude-haiku-4-5',
		'anthropic/claude-opus-4-1',
	])('leaves %s to the SDK, which maps the level to a token budget', (modelId) => {
		expect(anthropicReasoning(modelId)).toBeUndefined();
	});

	it.each(['none', 'provider-default'] as const)('adds nothing for reasoning %s', (level) => {
		expect(anthropicReasoning('anthropic/claude-sonnet-5', level)).toBeUndefined();
	});
});
