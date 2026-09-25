import { resolveAIAPromptCaching, resolveAIAReasoning } from '../aia-model-defaults';

describe('resolveAIAPromptCaching', () => {
	it('returns a 5m Anthropic TTL for Anthropic models', () => {
		expect(resolveAIAPromptCaching('anthropic/claude-sonnet-4-6')).toEqual({
			enabled: true,
			anthropic: { ttl: '5m' },
		});
	});

	it('returns a 5m Anthropic TTL for Vertex Anthropic models', () => {
		expect(resolveAIAPromptCaching('google-vertex-anthropic/claude-opus-4-8')).toEqual({
			enabled: true,
			anthropic: { ttl: '5m' },
		});
	});

	it('returns enabled caching for OpenAI models', () => {
		expect(resolveAIAPromptCaching('openai/gpt-5.6-sol')).toEqual({ enabled: true });
	});

	it('returns undefined when the provider does not support prompt caching', () => {
		expect(resolveAIAPromptCaching('moonshotai/kimi-k3')).toBeUndefined();
		expect(resolveAIAPromptCaching('google/gemini-2.5-pro')).toBeUndefined();
		expect(
			resolveAIAPromptCaching({
				provider: 'moonshotai',
				modelId: 'kimi-k3',
			} as never),
		).toBeUndefined();
	});
});

describe('resolveAIAReasoning', () => {
	it('returns low for Kimi K3 model ids', () => {
		expect(resolveAIAReasoning('moonshotai/kimi-k3')).toBe('low');
		expect(resolveAIAReasoning('custom/Kimi-K3')).toBe('low');
		expect(
			resolveAIAReasoning({
				provider: 'moonshotai',
				modelId: 'kimi-k3',
			} as never),
		).toBe('low');
	});

	it('returns medium for models without a mapped effort', () => {
		expect(resolveAIAReasoning('anthropic/claude-sonnet-4-6')).toBe('medium');
		expect(resolveAIAReasoning('openai/gpt-5.6-sol')).toBe('medium');
		expect(resolveAIAReasoning('google/gemini-2.5-pro')).toBe('medium');
	});
});
