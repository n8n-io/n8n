import { describe, expect, it } from 'vitest';

import { normalizePromptCachingForModelChange } from '../utils/promptCaching';

describe('normalizePromptCachingForModelChange', () => {
	it('defaults to enabled when switching to a supported provider with no prior config', () => {
		const result = normalizePromptCachingForModelChange(undefined, true);
		expect(result.config?.promptCaching).toEqual({ enabled: true });
	});

	it('defaults to enabled when switching to a supported provider with prior config missing promptCaching', () => {
		const result = normalizePromptCachingForModelChange({ toolCallConcurrency: 3 }, true);
		expect(result.config).toEqual({ toolCallConcurrency: 3, promptCaching: { enabled: true } });
	});

	it('re-enables when the prior config was already enabled', () => {
		const result = normalizePromptCachingForModelChange({ promptCaching: { enabled: true } }, true);
		expect(result.config?.promptCaching).toEqual({ enabled: true });
	});

	it('force-enables even when the prior config had enabled: false (mandatory, cannot be disabled)', () => {
		const result = normalizePromptCachingForModelChange(
			{ promptCaching: { enabled: false } },
			true,
		);
		expect(result.config?.promptCaching).toEqual({ enabled: true });
	});

	it('strips promptCaching entirely when switching to an unsupported provider', () => {
		const result = normalizePromptCachingForModelChange(
			{ toolCallConcurrency: 3, promptCaching: { enabled: true } },
			false,
		);
		expect(result.config).toEqual({ toolCallConcurrency: 3 });
	});

	it('clears the config object when promptCaching was the only sub-config key', () => {
		const result = normalizePromptCachingForModelChange(
			{ promptCaching: { enabled: true } },
			false,
		);
		// Key present so the parent's Object.assign strips it; value undefined so it
		// serializes away instead of persisting an empty `{}`.
		expect('config' in result).toBe(true);
		expect(result.config).toBeUndefined();
	});

	it('is a no-op when switching to an unsupported provider with no prior promptCaching', () => {
		const result = normalizePromptCachingForModelChange({ toolCallConcurrency: 3 }, false);
		expect(result).toEqual({});
	});

	it('is a no-op when switching to an unsupported provider with no prior sub-config at all', () => {
		const result = normalizePromptCachingForModelChange(undefined, false);
		expect(result).toEqual({});
	});

	it('defaults to enabled with no ttl when switching to Anthropic with no prior ttl', () => {
		const result = normalizePromptCachingForModelChange(undefined, 'ttl');
		expect(result.config?.promptCaching).toEqual({ enabled: true });
	});

	it('preserves an explicit Anthropic ttl across a switch to Anthropic', () => {
		const result = normalizePromptCachingForModelChange(
			{ promptCaching: { enabled: true, anthropic: { ttl: '5m' } } },
			'ttl',
		);
		expect(result.config?.promptCaching).toEqual({ enabled: true, anthropic: { ttl: '5m' } });
	});

	it('force-enables and preserves ttl even when the prior Anthropic config had enabled: false', () => {
		const result = normalizePromptCachingForModelChange(
			{ promptCaching: { enabled: false, anthropic: { ttl: '1h' } } },
			'ttl',
		);
		expect(result.config?.promptCaching).toEqual({ enabled: true, anthropic: { ttl: '1h' } });
	});

	it('drops a previously-set Anthropic ttl when switching away to a non-ttl supported provider (e.g. OpenAI)', () => {
		const result = normalizePromptCachingForModelChange(
			{ promptCaching: { enabled: true, anthropic: { ttl: '5m' } } },
			true,
		);
		expect(result.config?.promptCaching).toEqual({ enabled: true });
	});
});
