import { expect, it } from 'vitest';

import { describeIf, collectStreamChunks, chunksOfType, getModel } from './helpers';
import { Agent } from '../../index';
import type { StreamChunk } from '../../index';

const describeAnthropic = describeIf('anthropic');

describeAnthropic('usage and cost (Anthropic)', () => {
	it('returns token usage on generate result', async () => {
		const agent = new Agent('usage-test').model(getModel('anthropic')).instructions('Be concise.');

		const result = await agent.generate('Say hello');

		expect(result.usage).toBeDefined();
		expect(result.usage!.promptTokens).toBeGreaterThan(0);
		expect(result.usage!.completionTokens).toBeGreaterThan(0);
		expect(result.usage!.totalTokens).toBe(
			result.usage!.promptTokens + result.usage!.completionTokens,
		);
	});

	it('returns token usage on stream finish chunk', async () => {
		const agent = new Agent('usage-stream-test')
			.model(getModel('anthropic'))
			.instructions('Be concise.');

		const { stream: fullStream } = await agent.stream('Say hello');
		const chunks = await collectStreamChunks(fullStream);
		const finishChunks = chunksOfType(chunks, 'finish');

		expect(finishChunks.length).toBeGreaterThan(0);
		const finish = finishChunks[0] as StreamChunk & { type: 'finish' };
		expect(finish.usage).toBeDefined();
		expect(finish.usage!.promptTokens).toBeGreaterThan(0);
		expect(finish.usage!.completionTokens).toBeGreaterThan(0);
		expect(finish.usage!.totalTokens).toBe(
			finish.usage!.promptTokens + finish.usage!.completionTokens,
		);
	});

	it('includes estimated cost from models.dev pricing', async () => {
		const agent = new Agent('cost-test').model(getModel('anthropic')).instructions('Be concise.');

		const result = await agent.generate('Say hello');

		expect(result.usage).toBeDefined();
		expect(result.usage!.cost).toBeDefined();
		expect(result.usage!.cost).toBeGreaterThan(0);

		// Sanity check: a simple "say hello" should cost less than $0.01
		expect(result.usage!.cost!).toBeLessThan(0.01);
	});

	it('includes model ID in generate result', async () => {
		const agent = new Agent('model-test').model(getModel('anthropic')).instructions('Be concise.');

		const result = await agent.generate('Say hello');
		expect(result.model).toBe(getModel('anthropic'));
	});

	it('includes cost in stream finish chunk', async () => {
		const agent = new Agent('cost-stream-test')
			.model(getModel('anthropic'))
			.instructions('Be concise.');

		const { stream: fullStream } = await agent.stream('Say hello');
		const chunks = await collectStreamChunks(fullStream);
		const finishChunks = chunksOfType(chunks, 'finish');

		expect(finishChunks.length).toBeGreaterThan(0);
		const finish = finishChunks[0] as StreamChunk & { type: 'finish' };
		expect(finish.usage).toBeDefined();
		expect(finish.usage!.cost).toBeDefined();
		expect(finish.usage!.cost).toBeGreaterThan(0);
	});
});

const describeOpenAI = describeIf('openai');

describeOpenAI('usage and cost (OpenAI)', () => {
	it('returns token usage and cost on generate result', async () => {
		const agent = new Agent('openai-usage-test')
			.model(getModel('openai'))
			.instructions('Be concise.');

		const result = await agent.generate('Say hello');

		expect(result.usage).toBeDefined();
		expect(result.usage!.promptTokens).toBeGreaterThan(0);
		expect(result.usage!.completionTokens).toBeGreaterThan(0);
		expect(result.usage!.cost).toBeDefined();
		expect(result.usage!.cost).toBeGreaterThan(0);
	});
});
