import type { ModelMessage, SystemModelMessage, ToolSet } from 'ai';

import {
	applyRuntimeCacheBreakpoints,
	buildCallPromptCacheOptions,
	buildInstructionPromptCacheOptions,
	getEffectiveAnthropicCacheTtl,
	mergeProviderOptions,
} from '../prompt-cache';

const ANTHROPIC_CACHE_CONTROL = { anthropic: { cacheControl: { type: 'ephemeral' as const } } };

const anthropicSystem: SystemModelMessage = {
	role: 'system',
	content: 'Base instructions',
	providerOptions: ANTHROPIC_CACHE_CONTROL,
};

const plainSystem: SystemModelMessage = { role: 'system', content: 'Base instructions' };

function makeUserMessage(text: string, providerOptions?: Record<string, unknown>): ModelMessage {
	return { role: 'user', content: [{ type: 'text', text }], providerOptions } as ModelMessage;
}

function makeTool(providerOptions?: Record<string, unknown>): ToolSet[string] {
	return { inputSchema: {}, providerOptions } as ToolSet[string];
}

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

describe('createOpenAIPromptCacheKey (via buildCallPromptCacheOptions)', () => {
	const modelId = 'openai/gpt-5.1';
	const context = {
		agentName: 'assistant',
		instructions: 'You are a helpful assistant with very specific secret instructions.',
	};

	function generatedKey(instructions: string): string {
		const result = buildCallPromptCacheOptions({ enabled: true }, modelId, {
			...context,
			instructions,
		});
		return (result?.openai as { promptCacheKey: string }).promptCacheKey;
	}

	it('is deterministic for the same agent, model, and instructions', () => {
		expect(generatedKey(context.instructions)).toBe(generatedKey(context.instructions));
	});

	it('changes when the instructions change (per-agent-version granularity)', () => {
		expect(generatedKey(context.instructions)).not.toBe(generatedKey('Different instructions.'));
	});

	it('never embeds the raw instructions text', () => {
		expect(generatedKey(context.instructions)).not.toContain('secret instructions');
	});
});

describe('getEffectiveAnthropicCacheTtl', () => {
	it('returns the configured TTL (default 1h) for an Anthropic model with caching enabled', () => {
		expect(getEffectiveAnthropicCacheTtl({ enabled: true }, 'anthropic/claude-sonnet-4-5')).toBe(
			'1h',
		);
	});

	it('returns an explicit 5m override for an Anthropic model', () => {
		expect(
			getEffectiveAnthropicCacheTtl({ anthropic: { ttl: '5m' } }, 'anthropic/claude-sonnet-4-5'),
		).toBe('5m');
	});

	it('returns undefined for an Anthropic model with no promptCaching config', () => {
		expect(getEffectiveAnthropicCacheTtl(undefined, 'anthropic/claude-sonnet-4-5')).toBeUndefined();
	});

	it('returns undefined when the anthropic scope is disabled', () => {
		expect(
			getEffectiveAnthropicCacheTtl({ anthropic: false }, 'anthropic/claude-sonnet-4-5'),
		).toBeUndefined();
	});

	it('returns undefined for a non-Anthropic model even when enabled', () => {
		expect(getEffectiveAnthropicCacheTtl({ enabled: true }, 'openai/gpt-5.1')).toBeUndefined();
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

describe('applyRuntimeCacheBreakpoints', () => {
	it('marks the last conversation message with an Anthropic cache breakpoint', () => {
		const messages = [makeUserMessage('hi'), makeUserMessage('there')];

		const { messages: result } = applyRuntimeCacheBreakpoints({
			system: anthropicSystem,
			messages,
			aiTools: {},
			promptCaching: { enabled: true },
			modelId: 'anthropic/claude-sonnet-4-5',
			staticToolCacheName: undefined,
		});

		expect(result[0].providerOptions).toBeUndefined();
		expect(result[1].providerOptions).toEqual({
			anthropic: { cacheControl: { type: 'ephemeral', ttl: '1h' } },
		});
	});

	it('marks the static tool with a cache breakpoint when staticToolCacheName is provided', () => {
		const aiTools = { tool_a: makeTool(), tool_b: makeTool() };

		const { aiTools: result } = applyRuntimeCacheBreakpoints({
			system: anthropicSystem,
			messages: [],
			aiTools,
			promptCaching: { enabled: true },
			modelId: 'anthropic/claude-sonnet-4-5',
			staticToolCacheName: 'tool_b',
		});

		expect(result.tool_a?.providerOptions).toBeUndefined();
		expect(result.tool_b?.providerOptions).toEqual({
			anthropic: { cacheControl: { type: 'ephemeral', ttl: '1h' } },
		});
	});

	it('is a no-op for non-Anthropic models', () => {
		const messages = [makeUserMessage('hi')];
		const aiTools = { tool_a: makeTool() };

		const result = applyRuntimeCacheBreakpoints({
			system: plainSystem,
			messages,
			aiTools,
			promptCaching: { enabled: true },
			modelId: 'openai/gpt-5.1',
			staticToolCacheName: 'tool_a',
		});

		expect(result.messages).toBe(messages);
		expect(result.aiTools).toBe(aiTools);
	});

	it('is a no-op when Anthropic prompt caching is disabled', () => {
		const messages = [makeUserMessage('hi')];

		const result = applyRuntimeCacheBreakpoints({
			system: plainSystem,
			messages,
			aiTools: {},
			promptCaching: { anthropic: false },
			modelId: 'anthropic/claude-sonnet-4-5',
			staticToolCacheName: undefined,
		});

		expect(result.messages).toBe(messages);
	});

	it('clamps at the 4-breakpoint limit and preserves caller-supplied breakpoints', () => {
		const messages = [
			makeUserMessage('a', ANTHROPIC_CACHE_CONTROL),
			makeUserMessage('b', ANTHROPIC_CACHE_CONTROL),
		];
		const aiTools = { tool_a: makeTool(ANTHROPIC_CACHE_CONTROL), tool_b: makeTool() };

		// Budget already exhausted: system (1) + 2 messages (2) + tool_a (1) = 4.
		const result = applyRuntimeCacheBreakpoints({
			system: anthropicSystem,
			messages,
			aiTools,
			promptCaching: { enabled: true },
			modelId: 'anthropic/claude-sonnet-4-5',
			staticToolCacheName: 'tool_b',
		});

		expect(result.messages).toBe(messages);
		expect(result.aiTools).toBe(aiTools);
		expect(result.aiTools.tool_b?.providerOptions).toBeUndefined();
	});

	it('prioritizes the message breakpoint over the tool breakpoint when only one slot remains', () => {
		const messages = [makeUserMessage('a', ANTHROPIC_CACHE_CONTROL), makeUserMessage('b')];
		const aiTools = { tool_a: makeTool(ANTHROPIC_CACHE_CONTROL), tool_b: makeTool() };

		// Budget before this call: system (1) + first message (1) + tool_a (1) = 3, one slot left.
		const result = applyRuntimeCacheBreakpoints({
			system: anthropicSystem,
			messages,
			aiTools,
			promptCaching: { enabled: true },
			modelId: 'anthropic/claude-sonnet-4-5',
			staticToolCacheName: 'tool_b',
		});

		expect(result.messages[1]?.providerOptions).toEqual({
			anthropic: { cacheControl: { type: 'ephemeral', ttl: '1h' } },
		});
		expect(result.aiTools.tool_b?.providerOptions).toBeUndefined();
	});

	it('does not re-mark or double-count a last message that already carries a marker, leaving room for the tool breakpoint', () => {
		// Existing markers: system (1) + first message (1) + last message (1) = 3.
		// The last message is already an anchor, so the remaining slot must go to
		// the tool. Double-counting the last message would push used to 4 and wrongly
		// suppress the tool breakpoint.
		const messages = [
			makeUserMessage('a', ANTHROPIC_CACHE_CONTROL),
			makeUserMessage('b', ANTHROPIC_CACHE_CONTROL),
		];
		const aiTools = { tool_a: makeTool(), tool_b: makeTool() };

		const result = applyRuntimeCacheBreakpoints({
			system: anthropicSystem,
			messages,
			aiTools,
			promptCaching: { enabled: true },
			modelId: 'anthropic/claude-sonnet-4-5',
			staticToolCacheName: 'tool_b',
		});

		// The last message keeps its original caller marker untouched (not evicted).
		expect(result.messages).toBe(messages);
		expect(result.messages[1]?.providerOptions).toEqual(ANTHROPIC_CACHE_CONTROL);
		// The tool breakpoint is still added — the existing marker was not double-counted.
		expect(result.aiTools.tool_b?.providerOptions).toEqual({
			anthropic: { cacheControl: { type: 'ephemeral', ttl: '1h' } },
		});
	});

	it('leaves a caller-supplied cacheControl on the static tool untouched', () => {
		const aiTools = {
			tool_a: makeTool(),
			tool_b: makeTool({ anthropic: { cacheControl: { type: 'ephemeral', ttl: '5m' } } }),
		};
		const messages = [makeUserMessage('hi')];

		const result = applyRuntimeCacheBreakpoints({
			system: plainSystem,
			messages,
			aiTools,
			promptCaching: { enabled: true },
			modelId: 'anthropic/claude-sonnet-4-5',
			staticToolCacheName: 'tool_b',
		});

		// The caller's 5m marker on the static tool must survive untouched, not be
		// overwritten by the runtime's (1h default) marker.
		expect(result.aiTools.tool_b?.providerOptions).toEqual({
			anthropic: { cacheControl: { type: 'ephemeral', ttl: '5m' } },
		});
		// The message breakpoint is unaffected by the tool already being marked.
		expect(result.messages[0]?.providerOptions).toEqual({
			anthropic: { cacheControl: { type: 'ephemeral', ttl: '1h' } },
		});
	});

	it('skips a marker already on the last content part (not just message-level)', () => {
		// The marker lives on the last content part; a message-level marker from the
		// runtime would land on the same part, so it must not be added or counted.
		const partMarked = {
			role: 'user',
			content: [{ type: 'text', text: 'b', providerOptions: ANTHROPIC_CACHE_CONTROL }],
		} as ModelMessage;
		const messages = [makeUserMessage('a', ANTHROPIC_CACHE_CONTROL), partMarked];
		const aiTools = { tool_a: makeTool(), tool_b: makeTool() };

		const result = applyRuntimeCacheBreakpoints({
			system: anthropicSystem,
			messages,
			aiTools,
			promptCaching: { enabled: true },
			modelId: 'anthropic/claude-sonnet-4-5',
			staticToolCacheName: 'tool_b',
		});

		expect(result.messages).toBe(messages);
		expect(result.aiTools.tool_b?.providerOptions).toEqual({
			anthropic: { cacheControl: { type: 'ephemeral', ttl: '1h' } },
		});
	});
});
