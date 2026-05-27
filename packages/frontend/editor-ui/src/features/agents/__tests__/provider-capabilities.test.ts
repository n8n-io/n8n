import { describe, expect, it } from 'vitest';

import { PROVIDER_CAPABILITIES, REASONING_EFFORT_OPTIONS } from '../provider-capabilities';

describe('provider-capabilities', () => {
	it('keeps the canonical reasoning-effort order', () => {
		// AgentAdvancedPanel renders these as a select in this exact order; flipping
		// the order would shift the default the user sees.
		expect([...REASONING_EFFORT_OPTIONS]).toEqual(['low', 'medium', 'high']);
	});

	it('uses budget-tokens for Anthropic and reasoning-effort for OpenAI', () => {
		expect(PROVIDER_CAPABILITIES.anthropic.thinking).toBe('budgetTokens');
		expect(PROVIDER_CAPABILITIES.openai.thinking).toBe('reasoningEffort');
	});

	it('marks providers without thinking support as `false`', () => {
		const noThinking = [
			'google',
			'xai',
			'groq',
			'deepseek',
			'mistral',
			'openrouter',
			'cohere',
			'ollama',
		];
		for (const provider of noThinking) {
			expect(PROVIDER_CAPABILITIES[provider]?.thinking).toBe(false);
		}
	});

	it('uses lowercase provider names', () => {
		// The Advanced panel parses `model` strings of the form `<provider>/<name>`
		// and indexes this map directly; any uppercase keys would silently fall
		// back to the default-no-thinking branch.
		for (const key of Object.keys(PROVIDER_CAPABILITIES)) {
			expect(key).toBe(key.toLowerCase());
		}
	});
});
