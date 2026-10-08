import {
	isAnthropicMessagesModel,
	promptCachingCapabilityForModel,
	resolvePromptCaching,
} from '../provider-capabilities';

describe('resolvePromptCaching', () => {
	it('strips (returns undefined) for an unsupported provider regardless of current config', () => {
		expect(resolvePromptCaching(undefined, false)).toBeUndefined();
		expect(resolvePromptCaching({ enabled: true }, false)).toBeUndefined();
		expect(resolvePromptCaching({ enabled: false }, false)).toBeUndefined();
	});

	it('force-enables for OpenAI (capability `true`) even when the config already opted out', () => {
		expect(resolvePromptCaching(undefined, true)).toEqual({ enabled: true });
		expect(resolvePromptCaching({ enabled: false }, true)).toEqual({ enabled: true });
	});

	it('drops any Anthropic ttl carried over from a prior config when the capability is plain `true`', () => {
		expect(resolvePromptCaching({ enabled: true, anthropic: { ttl: '5m' } }, true)).toEqual({
			enabled: true,
		});
	});

	it('force-enables for Anthropic (capability `ttl`) with no prior ttl', () => {
		expect(resolvePromptCaching(undefined, 'ttl')).toEqual({ enabled: true });
		expect(resolvePromptCaching({ enabled: false }, 'ttl')).toEqual({ enabled: true });
	});

	it('preserves an explicit Anthropic ttl across the resolve', () => {
		expect(resolvePromptCaching({ enabled: true, anthropic: { ttl: '5m' } }, 'ttl')).toEqual({
			enabled: true,
			anthropic: { ttl: '5m' },
		});
		expect(resolvePromptCaching({ enabled: false, anthropic: { ttl: '1h' } }, 'ttl')).toEqual({
			enabled: true,
			anthropic: { ttl: '1h' },
		});
	});

	it('treats Claude on OpenRouter as an Anthropic Messages model with a TTL', () => {
		expect(isAnthropicMessagesModel('openrouter/anthropic/claude-opus-5.5')).toBe(true);
		expect(promptCachingCapabilityForModel('openrouter/anthropic/claude-opus-5.5')).toBe('ttl');
		expect(isAnthropicMessagesModel('anthropic/claude-sonnet-4-5')).toBe(true);
		expect(isAnthropicMessagesModel('google-vertex-anthropic/claude-opus-4-8')).toBe(true);
	});

	it('keeps other OpenRouter routes without prompt caching', () => {
		expect(isAnthropicMessagesModel('openrouter/openai/gpt-4o')).toBe(false);
		expect(promptCachingCapabilityForModel('openrouter/openai/gpt-4o')).toBe(false);
		expect(promptCachingCapabilityForModel('openai/gpt-5.1')).toBe(true);
	});

	it('does not carry over an empty anthropic sub-object with no ttl', () => {
		expect(resolvePromptCaching({ enabled: true, anthropic: {} }, 'ttl')).toEqual({
			enabled: true,
		});
	});
});
