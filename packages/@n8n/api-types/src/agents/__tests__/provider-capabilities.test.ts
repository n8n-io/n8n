import { resolvePromptCaching } from '../provider-capabilities';

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

	it('does not carry over an empty anthropic sub-object with no ttl', () => {
		expect(resolvePromptCaching({ enabled: true, anthropic: {} }, 'ttl')).toEqual({
			enabled: true,
		});
	});
});
