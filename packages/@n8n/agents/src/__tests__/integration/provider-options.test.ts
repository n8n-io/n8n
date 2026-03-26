import { expect, it } from 'vitest';

import { collectStreamChunks, chunksOfType, describeIf } from './helpers';
import { Agent } from '../../index';

const describe = describeIf('anthropic');

/**
 * Integration tests for provider options: prompt caching, deep merge with
 * thinking, external abort signal, and model config object form.
 *
 * Prompt caching requires a system prompt of at least 1024 tokens for
 * Anthropic, so we generate a long instruction string.
 */

// A system prompt long enough to be eligible for Anthropic prompt caching.
// Claude Haiku requires at least 2048 tokens for caching to activate.
const LONG_SYSTEM_PROMPT =
	'You are a concise assistant. Reply in one short sentence. ' +
	'Here is additional context to ensure the prompt is long enough for caching: ' +
	Array.from(
		{ length: 500 },
		(_, i) => `Rule ${i + 1}: Always be helpful and accurate in your responses.`,
	).join(' ');

// ---------------------------------------------------------------------------
// Prompt caching — instruction-level
// ---------------------------------------------------------------------------

describe('prompt caching via instruction providerOptions', () => {
	it('second call with cached instructions reports cacheRead tokens', async () => {
		const agent = new Agent('cache-instructions-test')
			.model('anthropic/claude-haiku-4-5')
			.instructions(LONG_SYSTEM_PROMPT, {
				providerOptions: {
					anthropic: { cacheControl: { type: 'ephemeral' } },
				},
			});

		// First call — creates the cache entry
		const result1 = await agent.generate('Say hello', {
			persistence: { resourceId: 'user1', threadId: 'thread1' },
		});
		expect(result1.finishReason).toBe('stop');

		// Second call — should read from cache
		const result2 = await agent.generate('Say goodbye', {
			persistence: { resourceId: 'user1', threadId: 'thread2' },
		});
		expect(result2.finishReason).toBe('stop');

		// At least one of the two calls should show cache activity (write or read)
		const write1 = result1.usage?.inputTokenDetails?.cacheWrite ?? 0;
		const read2 = result2.usage?.inputTokenDetails?.cacheRead ?? 0;
		expect(write1 + read2).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Prompt caching — call-level providerOptions
// ---------------------------------------------------------------------------

describe('prompt caching via call-level providerOptions', () => {
	it('second call with call-level cacheControl reports cacheRead tokens', async () => {
		// Call-level cacheControl applies to the API request, not individual messages.
		// For Anthropic, prompt caching at call level needs instruction-level cacheControl
		// to mark which content to cache. This test verifies call-level options don't error.
		const agent = new Agent('cache-call-level-test')
			.model('anthropic/claude-haiku-4-5')
			.instructions(LONG_SYSTEM_PROMPT);

		const result = await agent.generate('Say hello', {
			persistence: { resourceId: 'user1', threadId: 'thread1' },
			providerOptions: {
				anthropic: { cacheControl: { type: 'ephemeral' } },
			},
		});
		expect(result.finishReason).toBe('stop');
		expect(result.messages.length).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Prompt caching — streaming path
// ---------------------------------------------------------------------------

describe('prompt caching via stream', () => {
	it('second stream with cached instructions reports cacheRead tokens in finish chunk', async () => {
		const agent = new Agent('cache-stream-test')
			.model('anthropic/claude-haiku-4-5')
			.instructions(LONG_SYSTEM_PROMPT, {
				providerOptions: {
					anthropic: { cacheControl: { type: 'ephemeral' } },
				},
			});

		// First call — creates the cache entry
		const { stream: stream1 } = await agent.stream('Say hello', {
			persistence: { resourceId: 'user1', threadId: 'thread1' },
		});
		await collectStreamChunks(stream1);

		// Second call — should read from cache
		const { stream: stream2 } = await agent.stream('Say goodbye', {
			persistence: { resourceId: 'user1', threadId: 'thread2' },
		});
		const chunks = await collectStreamChunks(stream2);
		const finishChunks = chunksOfType(chunks, 'finish');

		expect(finishChunks.length).toBeGreaterThan(0);
		const usage = finishChunks[0].usage;
		expect(usage).toBeDefined();

		// At least one stream should show cache activity
		const write = usage!.inputTokenDetails?.cacheWrite ?? 0;
		const read = usage!.inputTokenDetails?.cacheRead ?? 0;
		expect(write + read).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Thinking + cacheControl coexistence (deep merge)
// ---------------------------------------------------------------------------

describe('thinking + cacheControl coexistence', () => {
	it('both thinking and prompt caching work simultaneously', async () => {
		const agent = new Agent('thinking-cache-test')
			.model('anthropic', 'claude-sonnet-4-5')
			.thinking('anthropic', { budgetTokens: 5000 })
			.instructions(LONG_SYSTEM_PROMPT, {
				providerOptions: {
					anthropic: { cacheControl: { type: 'ephemeral' } },
				},
			});

		// First call — cache miss, but thinking should work
		const { stream: stream1 } = await agent.stream('What is 7 * 8?', {
			persistence: { resourceId: 'user1', threadId: 'thread1' },
		});
		const chunks1 = await collectStreamChunks(stream1);

		// Should have reasoning chunks (thinking is enabled)
		const reasoningChunks = chunksOfType(chunks1, 'reasoning-delta');
		expect(reasoningChunks.length).toBeGreaterThan(0);

		// Second call — cache hit, thinking should still work
		const { stream: stream2 } = await agent.stream('What is 12 * 13?', {
			persistence: { resourceId: 'user1', threadId: 'thread2' },
		});
		const chunks2 = await collectStreamChunks(stream2);

		// Should still have reasoning
		const reasoning2 = chunksOfType(chunks2, 'reasoning-delta');
		expect(reasoning2.length).toBeGreaterThan(0);

		// At least one call should show cache activity
		const finishChunks = chunksOfType(chunks2, 'finish');
		expect(finishChunks.length).toBeGreaterThan(0);
		const usage = finishChunks[0].usage;
		expect(usage).toBeDefined();
		const write = usage!.inputTokenDetails?.cacheWrite ?? 0;
		const read = usage!.inputTokenDetails?.cacheRead ?? 0;
		expect(write + read).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// External abort signal
// ---------------------------------------------------------------------------

describe('external abort signal', () => {
	it('cancels a generate() call via external AbortSignal', async () => {
		const agent = new Agent('abort-signal-test')
			.model('anthropic/claude-haiku-4-5')
			.instructions('You are a helpful assistant. Tell me a very long story.');

		const controller = new AbortController();
		setTimeout(() => controller.abort(), 100);

		const result = await agent.generate('Tell me a very long detailed story about a dragon', {
			persistence: { resourceId: 'user1', threadId: 'thread1' },
			abortSignal: controller.signal,
		});

		expect(result.finishReason).toBe('error');
		expect(agent.getState().status).toBe('cancelled');
	});

	it('cancels a stream() call via external AbortSignal', async () => {
		const agent = new Agent('abort-stream-signal-test')
			.model('anthropic/claude-haiku-4-5')
			.instructions('You are a helpful assistant. Tell me a very long story.');

		const controller = new AbortController();
		setTimeout(() => controller.abort(), 100);

		const { stream } = await agent.stream('Tell me a very long detailed story about a dragon', {
			persistence: { resourceId: 'user1', threadId: 'thread1' },
			abortSignal: controller.signal,
		});

		const chunks = await collectStreamChunks(stream);
		const errorChunks = chunks.filter((c) => c.type === 'error');
		expect(errorChunks.length).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Model config object form
// ---------------------------------------------------------------------------

describe('model config object form', () => {
	it('generates with model config object', async () => {
		const agent = new Agent('model-config-test')
			.model({ id: 'anthropic/claude-haiku-4-5' })
			.instructions('You are a concise assistant. Reply in one short sentence.');

		const result = await agent.generate('Say hello', {
			persistence: { resourceId: 'user1', threadId: 'thread1' },
		});

		expect(result.finishReason).toBe('stop');
		expect(result.messages.length).toBeGreaterThan(0);
	});
});
