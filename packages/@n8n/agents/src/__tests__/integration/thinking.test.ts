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

describeAnthropic('reasoning stream (Anthropic, adaptive thinking)', () => {
	/**
	 * Adaptive-thinking models (Sonnet 5, Opus 4.6+) return thinking blocks with
	 * empty text unless the request asks for `display: 'summarized'`. The cassette
	 * pins the AI SDK's generic reasoning mapping, so an SDK regression that stops
	 * sending the flag fails here instead of silently emptying every trace.
	 *
	 * High effort because adaptive models decide per request whether to think at
	 * all, and at lower effort they routinely answer this prompt without it.
	 */
	it('emits reasoning text from a model that withholds it by default', async () => {
		const agent = new Agent('adaptive-thinking-test')
			.model('anthropic', 'claude-sonnet-5')
			.reasoning('high')
			.instructions('You are a helpful assistant. Think carefully before answering.');

		const { stream: fullStream } = await agent.stream(
			'Three guests pay 10 each for a 30 dollar room. The clerk refunds 5 via a bellhop who keeps 2 and returns 1 each. Each paid 9, so 27, plus the 2 is 29. Where is the missing dollar?',
		);

		const chunks = await collectStreamChunks(fullStream);
		const reasoning = chunksOfType(chunks, 'reasoning-delta')
			.filter((c): c is typeof c & { delta: string } => 'delta' in c)
			.map((c) => c.delta)
			.join('');

		expect(reasoning.length).toBeGreaterThan(0);
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
