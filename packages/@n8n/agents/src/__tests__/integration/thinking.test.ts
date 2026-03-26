import { expect, it } from 'vitest';

import { describeIf, collectStreamChunks, chunksOfType } from './helpers';
import { Agent } from '../../index';

/**
 * Thinking / reasoning stream integration tests.
 *
 * These require models that support extended thinking:
 * - Anthropic: claude-sonnet-4-5 (not haiku — it doesn't support thinking)
 * - OpenAI: o3-mini (reasoning model)
 */

const describeAnthropic = describeIf('anthropic');

describeAnthropic('thinking stream (Anthropic)', () => {
	it('emits reasoning-delta chunks when thinking is enabled', async () => {
		const agent = new Agent('thinking-test')
			.model('anthropic', 'claude-sonnet-4-5')
			.thinking('anthropic', { budgetTokens: 5000 })
			.instructions('You are a helpful assistant. Think carefully before answering.');

		const { stream: fullStream } = await agent.stream('What is 17 * 23?');

		const chunks = await collectStreamChunks(fullStream);
		const reasoningChunks = chunksOfType(chunks, 'reasoning-delta');

		expect(reasoningChunks.length).toBeGreaterThan(0);

		// Verify reasoning chunks have non-empty delta content
		const deltas = reasoningChunks
			.filter((c): c is typeof c & { delta: string } => 'delta' in c)
			.map((c) => c.delta);
		const fullReasoning = deltas.join('');
		expect(fullReasoning.length).toBeGreaterThan(0);

		// Should also have text-delta chunks (the actual answer)
		const textChunks = chunksOfType(chunks, 'text-delta');
		expect(textChunks.length).toBeGreaterThan(0);
	});
});

const describeOpenAI = describeIf('openai');

describeOpenAI('thinking stream (OpenAI)', () => {
	it('works with reasoning model and .thinking() enabled', async () => {
		const agent = new Agent('openai-thinking-test')
			.model('openai', 'o3-mini')
			.thinking('openai', { reasoningEffort: 'medium' })
			.instructions('You are a helpful assistant.');

		const { stream: fullStream } = await agent.stream('What is 17 * 23?');

		const chunks = await collectStreamChunks(fullStream);

		// OpenAI reasoning models do internal reasoning but don't expose it
		// as streamed chunks — verify the agent produces a text response.
		const textChunks = chunksOfType(chunks, 'text-delta');
		expect(textChunks.length).toBeGreaterThan(0);

		const text = textChunks
			.filter((c): c is typeof c & { delta: string } => 'delta' in c)
			.map((c) => c.delta)
			.join('');
		expect(text).toContain('391');
	});
});
