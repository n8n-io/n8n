import {
	acceptedMimeTypesFromCapabilities,
	getModelServiceTierCapability,
	resolvePromptCaching,
} from '../provider-capabilities';

describe('acceptedMimeTypesFromCapabilities', () => {
	it('joins every accepted media-type family', () => {
		expect(acceptedMimeTypesFromCapabilities({ image: true, pdf: true, audio: true })).toBe(
			'image/png,image/jpeg,image/gif,image/webp,application/pdf,audio/*',
		);
	});

	it('returns an empty string when nothing is accepted', () => {
		expect(acceptedMimeTypesFromCapabilities({ image: false, pdf: false, audio: false })).toBe('');
	});
});

describe('resolvePromptCaching', () => {
	it('strips (returns undefined) for an unsupported provider regardless of current config', () => {
		expect(resolvePromptCaching(undefined, false)).toBeUndefined();
		expect(resolvePromptCaching({ enabled: true }, false)).toBeUndefined();
		expect(resolvePromptCaching({ enabled: false }, false)).toBeUndefined();
	});

	it('enables OpenAI (capability `true`) by default and keeps an explicit opt-out', () => {
		expect(resolvePromptCaching(undefined, true)).toEqual({ enabled: true });
		expect(resolvePromptCaching({ enabled: true }, true)).toEqual({ enabled: true });
		expect(resolvePromptCaching({ enabled: false }, true)).toEqual({ enabled: false });
	});

	it('drops any Anthropic ttl carried over from a prior config when the capability is plain `true`', () => {
		expect(resolvePromptCaching({ enabled: true, anthropic: { ttl: '5m' } }, true)).toEqual({
			enabled: true,
		});
	});

	it('enables Anthropic (capability `ttl`) by default and keeps an explicit opt-out', () => {
		expect(resolvePromptCaching(undefined, 'ttl')).toEqual({ enabled: true });
		expect(resolvePromptCaching({ enabled: false }, 'ttl')).toEqual({ enabled: false });
	});

	it('preserves an explicit Anthropic ttl across the resolve', () => {
		expect(resolvePromptCaching({ enabled: true, anthropic: { ttl: '5m' } }, 'ttl')).toEqual({
			enabled: true,
			anthropic: { ttl: '5m' },
		});
		expect(resolvePromptCaching({ enabled: false, anthropic: { ttl: '1h' } }, 'ttl')).toEqual({
			enabled: false,
			anthropic: { ttl: '1h' },
		});
	});

	it('does not carry over an empty anthropic sub-object with no ttl', () => {
		expect(resolvePromptCaching({ enabled: true, anthropic: {} }, 'ttl')).toEqual({
			enabled: true,
		});
	});
});

describe('getModelServiceTierCapability', () => {
	it.each(['openai/gpt-6.1-sol', 'openai/gpt-5.1'])('is on for %s', (modelId) => {
		expect(getModelServiceTierCapability(modelId)).toBe(true);
	});

	it.each([
		'anthropic/claude-sonnet-4-5',
		'google/gemini-2.5-pro',
		'azure-openai/my-deployment',
		'openrouter/openai/gpt-5.1',
		'unknown/model',
	])('is off for %s', (modelId) => {
		expect(getModelServiceTierCapability(modelId)).toBe(false);
	});
});
