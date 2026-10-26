import { getModelPromptCachingCapability } from '../provider-capabilities';

describe('getModelPromptCachingCapability', () => {
	it.each<[string, 'ttl' | boolean]>([
		['anthropic/claude-sonnet-4-5', 'ttl'],
		['google-vertex-anthropic/claude-sonnet-4-5', 'ttl'],
		['google-vertex/claude-opus-5@default', 'ttl'],
		['openrouter/anthropic/claude-sonnet-4.5', 'ttl'],
		['openrouter/anthropic/claude-sonnet-4.5:beta', 'ttl'],
		['azure-openai/anthropic/my-claude', 'ttl'],
		['azure-openai/my-chat', false],
		['openai/gpt-5', true],
		['google-vertex/gemini-2.5-pro', false],
		['google-vertex/meta/llama-4-maas', false],
		['openrouter/google/gemini-2.5-pro', false],
		['openrouter/openai/gpt-5', false],
		['openrouter/claude-sonnet-4.5', false],
		['custom/anthropic/claude-sonnet-4.5', false],
		['claude-sonnet-4-5', false],
		['', false],
	])('resolves %s to %s', (modelId, expected) => {
		expect(getModelPromptCachingCapability(modelId)).toBe(expected);
	});
});
