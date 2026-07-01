import {
	buildCallPromptCacheOptions,
	buildInstructionPromptCacheOptions,
	createOpenAIPromptCacheKey,
	getAnthropicCacheTtl,
	mergeProviderOptions,
} from '../prompt-cache';

describe('buildInstructionPromptCacheOptions — Anthropic', () => {
	it('defaults to a 1h cache breakpoint when enabled with no ttl override', () => {
		expect(
			buildInstructionPromptCacheOptions({ enabled: true }, 'anthropic/claude-sonnet-4-5'),
		).toEqual({
			anthropic: { cacheControl: { type: 'ephemeral', ttl: '1h' } },
		});
	});

	it('respects an explicit 5m ttl override', () => {
		expect(
			buildInstructionPromptCacheOptions(
				{ anthropic: { ttl: '5m' } },
				'anthropic/claude-sonnet-4-5',
			),
		).toEqual({
			anthropic: { cacheControl: { type: 'ephemeral', ttl: '5m' } },
		});
	});

	it('returns undefined for a non-Anthropic model', () => {
		expect(buildInstructionPromptCacheOptions({ enabled: true }, 'openai/gpt-5.1')).toBeUndefined();
	});

	it('returns undefined when config is disabled', () => {
		expect(
			buildInstructionPromptCacheOptions({ enabled: false }, 'anthropic/claude-sonnet-4-5'),
		).toBeUndefined();
	});

	it('returns undefined when anthropic scope is disabled', () => {
		expect(
			buildInstructionPromptCacheOptions({ anthropic: false }, 'anthropic/claude-sonnet-4-5'),
		).toBeUndefined();
	});

	it('returns undefined when config is not set', () => {
		expect(
			buildInstructionPromptCacheOptions(undefined, 'anthropic/claude-sonnet-4-5'),
		).toBeUndefined();
	});
});

describe('buildCallPromptCacheOptions — OpenAI', () => {
	const context = { agentName: 'assistant', instructions: 'You are a helpful assistant.' };

	it('defaults to 24h retention and an auto-generated key when enabled with no overrides', () => {
		const result = buildCallPromptCacheOptions({ enabled: true }, 'openai/gpt-5.1', context);

		expect(result?.openai).toMatchObject({ promptCacheRetention: '24h' });
		expect(typeof (result?.openai as { promptCacheKey: string }).promptCacheKey).toBe('string');
	});

	it('passes through an explicit promptCacheKey and promptCacheRetention unchanged', () => {
		expect(
			buildCallPromptCacheOptions(
				{ openai: { promptCacheKey: 'assistant-v1', promptCacheRetention: 'in_memory' } },
				'openai/gpt-5.1',
				context,
			),
		).toEqual({
			openai: { promptCacheKey: 'assistant-v1', promptCacheRetention: 'in_memory' },
		});
	});

	it('returns undefined for a non-OpenAI model', () => {
		expect(
			buildCallPromptCacheOptions({ enabled: true }, 'anthropic/claude-sonnet-4-5', context),
		).toBeUndefined();
	});

	it('returns undefined when openai scope is disabled', () => {
		expect(
			buildCallPromptCacheOptions({ openai: false }, 'openai/gpt-5.1', context),
		).toBeUndefined();
	});

	it('returns undefined when config is not set', () => {
		expect(buildCallPromptCacheOptions(undefined, 'openai/gpt-5.1', context)).toBeUndefined();
	});
});

describe('createOpenAIPromptCacheKey', () => {
	const input = {
		agentName: 'assistant',
		modelId: 'openai/gpt-5.1',
		instructions: 'You are a helpful assistant with very specific secret instructions.',
	};

	it('is deterministic for the same agent, model, and instructions', () => {
		expect(createOpenAIPromptCacheKey(input)).toBe(createOpenAIPromptCacheKey({ ...input }));
	});

	it('changes when the instructions change (per-agent-version granularity)', () => {
		expect(createOpenAIPromptCacheKey(input)).not.toBe(
			createOpenAIPromptCacheKey({ ...input, instructions: 'Different instructions.' }),
		);
	});

	it('never embeds the raw instructions text', () => {
		expect(createOpenAIPromptCacheKey(input)).not.toContain('secret instructions');
	});
});

describe('getAnthropicCacheTtl', () => {
	it('defaults to 1h when config is set with no ttl override', () => {
		expect(getAnthropicCacheTtl({ enabled: true })).toBe('1h');
	});

	it('defaults to 1h when config is unset', () => {
		expect(getAnthropicCacheTtl(undefined)).toBe('1h');
	});

	it('returns an explicit 5m override', () => {
		expect(getAnthropicCacheTtl({ anthropic: { ttl: '5m' } })).toBe('5m');
	});
});

describe('mergeProviderOptions', () => {
	it('returns undefined when every argument is undefined', () => {
		expect(mergeProviderOptions(undefined, undefined)).toBeUndefined();
	});

	it('preserves unrelated providers from different arguments', () => {
		expect(
			mergeProviderOptions({ anthropic: { thinking: { type: 'enabled' } } }, { openai: { a: 1 } }),
		).toEqual({
			anthropic: { thinking: { type: 'enabled' } },
			openai: { a: 1 },
		});
	});

	it('lets later arguments win on conflicting keys within the same provider', () => {
		expect(
			mergeProviderOptions(
				{ anthropic: { cacheControl: { type: 'ephemeral', ttl: '5m' } } },
				{ anthropic: { cacheControl: { type: 'ephemeral', ttl: '1h' } } },
			),
		).toEqual({
			anthropic: { cacheControl: { type: 'ephemeral', ttl: '1h' } },
		});
	});
});
