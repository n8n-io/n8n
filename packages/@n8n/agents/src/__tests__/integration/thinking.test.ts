import { expect, it } from 'vitest';

import { describeIf, collectStreamChunks, chunksOfType } from './helpers';
import { Agent } from '../../index';

/**
 * Thinking / reasoning stream integration tests.
 *
 * These require models that support extended thinking:
 * - Anthropic: claude-sonnet-4-5 (not haiku — it doesn't support thinking)
 * - OpenAI: gpt-5-mini (reasoning model with streamed summaries)
 */

const describeAnthropic = describeIf('anthropic');

describeAnthropic('reasoning stream (Anthropic)', () => {
	it('emits reasoning-delta chunks when reasoning is enabled', async () => {
		const agent = new Agent('thinking-test')
			.model('anthropic', 'claude-sonnet-4-5')
			.reasoning('medium')
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

describeOpenAI('reasoning stream (OpenAI)', () => {
	it('works with a reasoning model when reasoning is enabled', async () => {
		const agent = new Agent('openai-thinking-test')
			.model('openai', 'gpt-5-mini')
			.reasoning('medium')
			.instructions('You are a helpful assistant. Think carefully before answering.');

		const { stream: fullStream } = await agent.stream(
			'Find the smallest positive integer divisible by every integer from 1 through 15, and explain your method.',
		);

		const chunks = await collectStreamChunks(fullStream);

		const reasoningChunks = chunksOfType(chunks, 'reasoning-delta');
		expect(reasoningChunks.length).toBeGreaterThan(0);
		expect(
			reasoningChunks
				.filter((chunk): chunk is typeof chunk & { delta: string } => 'delta' in chunk)
				.map((chunk) => chunk.delta)
				.join('').length,
		).toBeGreaterThan(0);

		const textChunks = chunksOfType(chunks, 'text-delta');
		expect(textChunks.length).toBeGreaterThan(0);

		const text = textChunks
			.filter((c): c is typeof c & { delta: string } => 'delta' in c)
			.map((c) => c.delta)
			.join('');
		expect(text.length).toBeGreaterThan(0);
	});
});
