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

	it('aggregates sub-agent usage when using asTool()', async () => {
		const subAgent = new Agent('translator')
			.model(getModel('anthropic'))
			.instructions('Translate the input to French. Reply with only the translation.');

		const parentAgent = new Agent('orchestrator')
			.model(getModel('anthropic'))
			.instructions(
				'You are an orchestrator. When asked to translate, use the translator tool. Be concise.',
			)
			.tool(subAgent.asTool('Translate text to French'));

		const result = await parentAgent.generate('Translate "hello world" to French');

		// Parent should have its own usage
		expect(result.usage).toBeDefined();
		expect(result.usage!.promptTokens).toBeGreaterThan(0);
		expect(result.usage!.cost).toBeGreaterThan(0);
		expect(result.model).toBe(getModel('anthropic'));

		// Sub-agent usage should be captured
		expect(result.subAgentUsage).toBeDefined();
		expect(result.subAgentUsage!.length).toBeGreaterThan(0);

		const translatorUsage = result.subAgentUsage!.find((s) => s.agent === 'translator');
		expect(translatorUsage).toBeDefined();
		expect(translatorUsage!.usage.promptTokens).toBeGreaterThan(0);
		expect(translatorUsage!.usage.cost).toBeGreaterThan(0);

		// Total cost should be parent + sub-agent
		expect(result.totalCost).toBeDefined();
		expect(result.totalCost!).toBeGreaterThan(result.usage!.cost!);
		expect(result.totalCost!).toBeCloseTo(result.usage!.cost! + translatorUsage!.usage.cost!, 6);
	});

	it('aggregates sub-agent usage via stream()', async () => {
		const subAgent = new Agent('stream-translator')
			.model(getModel('anthropic'))
			.instructions('Translate the input to French. Reply with only the translation.');

		const parentAgent = new Agent('stream-orchestrator')
			.model(getModel('anthropic'))
			.instructions(
				'You are an orchestrator. When asked to translate, use the stream-translator tool. Be concise.',
			)
			.tool(subAgent.asTool('Translate text to French'));

		const { stream: fullStream } = await parentAgent.stream('Translate "goodbye" to French');
		const chunks = await collectStreamChunks(fullStream);
		const finishChunks = chunksOfType(chunks, 'finish');

		expect(finishChunks.length).toBeGreaterThan(0);
		const finish = finishChunks[finishChunks.length - 1] as StreamChunk & { type: 'finish' };

		// Should have usage with cost
		expect(finish.usage).toBeDefined();
		expect(finish.usage!.cost).toBeGreaterThan(0);

		// Should include model
		expect(finish.model).toBe(getModel('anthropic'));

		// Should include sub-agent usage
		expect(finish.subAgentUsage).toBeDefined();
		expect(finish.subAgentUsage!.length).toBeGreaterThan(0);

		const translatorUsage = finish.subAgentUsage!.find((s) => s.agent === 'stream-translator');
		expect(translatorUsage).toBeDefined();
		expect(translatorUsage!.usage.promptTokens).toBeGreaterThan(0);
		expect(translatorUsage!.usage.cost).toBeGreaterThan(0);

		// Total cost should include parent + sub-agent
		expect(finish.totalCost).toBeDefined();
		expect(finish.totalCost!).toBeGreaterThan(finish.usage!.cost!);
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
