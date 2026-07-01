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

	it('preserves an explicit opt-out across a switch between supported providers (e.g. OpenAI -> Anthropic)', () => {
		const result = normalizePromptCachingForModelChange(
			{ promptCaching: { enabled: false } },
			true,
		);
		expect(result.config?.promptCaching).toEqual({ enabled: false });
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
});
