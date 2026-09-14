import { findVerifiedModelId, normalizeProviderModelId } from '../provider-model-id';

describe('normalizeProviderModelId', () => {
	it('unwraps google models/ ids', () => {
		expect(normalizeProviderModelId('google', 'models/gemini-3.7-flash')).toBe('gemini-3.7-flash');
	});

	it('leaves already-bare google ids alone', () => {
		expect(normalizeProviderModelId('google', 'gemini-3.7-flash')).toBe('gemini-3.7-flash');
	});

	it('does not touch other providers, whose ids may contain slashes', () => {
		expect(normalizeProviderModelId('openrouter', 'anthropic/claude-sonnet-5')).toBe(
			'anthropic/claude-sonnet-5',
		);
		expect(normalizeProviderModelId('groq', 'openai/gpt-oss-120b')).toBe('openai/gpt-oss-120b');
	});
});

describe('findVerifiedModelId', () => {
	it('matches exactly', () => {
		expect(findVerifiedModelId('openai', 'gpt-5.6-terra', ['gpt-5.6-terra', 'gpt-5-mini'])).toBe(
			'gpt-5.6-terra',
		);
	});

	it('matches case-insensitively but returns the provider casing', () => {
		expect(findVerifiedModelId('minimax', 'minimax-m3', ['MiniMax-M3'])).toBe('MiniMax-M3');
	});

	it('matches a versionless default against a dated snapshot', () => {
		expect(
			findVerifiedModelId('anthropic', 'claude-sonnet-4-6', ['claude-sonnet-4-6-20251001']),
		).toBe('claude-sonnet-4-6-20251001');
	});

	it('matches across the google models/ prefix in either direction', () => {
		expect(findVerifiedModelId('google', 'gemini-3.7-flash', ['models/gemini-3.7-flash'])).toBe(
			'gemini-3.7-flash',
		);
		expect(findVerifiedModelId('google', 'models/gemini-3.7-flash', ['gemini-3.7-flash'])).toBe(
			'gemini-3.7-flash',
		);
	});

	it('returns undefined when the list cannot serve the model', () => {
		expect(
			findVerifiedModelId('google', 'gemini-3.6-flash', [
				'models/gemini-3.7-flash',
				'models/gemini-3.5-flash',
			]),
		).toBeUndefined();
	});

	it('does not treat a substring as a match', () => {
		expect(
			findVerifiedModelId('google', 'gemini-3.7', ['models/gemini-3.7-flash']),
		).toBeUndefined();
	});

	it('returns undefined for an empty wanted model', () => {
		expect(findVerifiedModelId('openai', '  ', ['gpt-5-mini'])).toBeUndefined();
	});
});
