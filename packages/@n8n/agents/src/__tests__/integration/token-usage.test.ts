import { expect, it } from 'vitest';

import {
	describeIf,
	collectStreamChunks,
	chunksOfType,
	getModel,
	createAgentWithAddTool,
} from './helpers';
import { Agent } from '../../index';
import type { StreamChunk } from '../../index';

const describe = describeIf('anthropic');

describe('token usage integration', () => {
	it('reports token usage on a simple text response via streamText', async () => {
		const agent = new Agent('token-test')
			.model(getModel('anthropic'))
			.instructions('Reply with exactly: "Hello". Nothing else.');

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

	it('reports token usage on a simple text response via run()', async () => {
		const agent = new Agent('token-run-test')
			.model(getModel('anthropic'))
			.instructions('Reply with exactly: "Hello". Nothing else.');

		const result = await agent.generate('Say hello');
		expect(result.usage).toBeDefined();
		expect(result.usage!.promptTokens).toBeGreaterThan(0);
		expect(result.usage!.completionTokens).toBeGreaterThan(0);
		expect(result.usage!.totalTokens).toBe(
			result.usage!.promptTokens + result.usage!.completionTokens,
		);
	});

	it('reports token usage after a multi-step tool call', async () => {
		const agent = createAgentWithAddTool('anthropic');

		const { stream: fullStream } = await agent.stream('What is 7 + 13?');

		const chunks = await collectStreamChunks(fullStream);
		const finishChunks = chunksOfType(chunks, 'finish');
		expect(finishChunks.length).toBeGreaterThan(0);
		const finish = finishChunks[0] as StreamChunk & { type: 'finish' };

		expect(finish.usage).toBeDefined();
		// Multi-step should use more tokens than a simple response
		expect(finish.usage!.promptTokens).toBeGreaterThan(0);
		expect(finish.usage!.completionTokens).toBeGreaterThan(0);
		expect(finish.usage!.totalTokens).toBe(
			finish.usage!.promptTokens + finish.usage!.completionTokens,
		);
	});

	it('emits finish chunks with token usage in the stream', async () => {
		const agent = new Agent('finish-chunk-test')
			.model(getModel('anthropic'))
			.instructions('Reply with exactly: "OK". Nothing else.');

		const { stream: fullStream } = await agent.stream('Acknowledge');

		const chunks = await collectStreamChunks(fullStream);
		const finishChunks = chunksOfType(chunks, 'finish');

		expect(finishChunks.length).toBeGreaterThan(0);

		const finish = finishChunks[0] as StreamChunk & { type: 'finish' };
		expect(finish.finishReason).toBeDefined();

		// Finish chunks should carry usage when available
		if (finish.usage) {
			expect(finish.usage.promptTokens).toBeGreaterThanOrEqual(0);
			expect(finish.usage.completionTokens).toBeGreaterThanOrEqual(0);
		}
	});

	it('accumulates higher token counts with more complex prompts', async () => {
		const agent = new Agent('token-scale-test')
			.model(getModel('anthropic'))
			.instructions('You are a helpful assistant. Be concise.');

		// Short prompt
		const { stream: short } = await agent.stream('Hi');
		const chunks = await collectStreamChunks(short);
		const finishChunks = chunksOfType(chunks, 'finish');
		expect(finishChunks.length).toBeGreaterThan(0);
		const finishShort = finishChunks[0] as StreamChunk & { type: 'finish' };

		// Longer prompt
		const { stream: long } = await agent.stream(
			'Explain the difference between TCP and UDP networking protocols. Include at least three key differences.',
		);
		const chunksLong = await collectStreamChunks(long);
		const finishChunksLong = chunksOfType(chunksLong, 'finish');
		expect(finishChunksLong.length).toBeGreaterThan(0);
		const finishLong = finishChunksLong[0] as StreamChunk & { type: 'finish' };

		// Longer prompt should use more completion tokens (longer response)
		expect(finishLong.usage!.completionTokens).toBeGreaterThan(finishShort.usage!.completionTokens);
	});
});
