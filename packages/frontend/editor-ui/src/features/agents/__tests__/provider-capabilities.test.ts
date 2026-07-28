import { describe, expect, it } from 'vitest';

import { PROVIDER_CAPABILITIES, ANTHROPIC_CACHE_TTL_OPTIONS } from '../provider-capabilities';

describe('provider-capabilities', () => {
	it('keeps the canonical Anthropic cache-ttl order', () => {
		// AgentAdvancedPanel renders this as a select in this exact order.
		expect([...ANTHROPIC_CACHE_TTL_OPTIONS]).toEqual(['5m', '1h']);
	});

	it('enables native web search for Anthropic and OpenAI', () => {
		expect(PROVIDER_CAPABILITIES.anthropic.webSearch).toBe('anthropic.web_search');
		expect(PROVIDER_CAPABILITIES.openai.webSearch).toBe('openai.web_search');
	});

	it('marks providers without native web search support as `false`', () => {
		const noWebSearch = [
			'google',
			'xai',
			'groq',
			'deepseek',
			'mistral',
			'openrouter',
			'cohere',
			'ollama',
		];
		for (const provider of noWebSearch) {
			expect(PROVIDER_CAPABILITIES[provider]?.webSearch).toBe(false);
		}
	});

	it('uses lowercase provider names', () => {
		// The Advanced panel parses `model` strings of the form `<provider>/<name>`
		// and indexes this map directly.
		for (const key of Object.keys(PROVIDER_CAPABILITIES)) {
			expect(key).toBe(key.toLowerCase());
		}
	});
});
