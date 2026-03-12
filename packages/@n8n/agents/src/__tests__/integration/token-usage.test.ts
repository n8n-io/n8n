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

		const { fullStream, getResult } = await agent.streamText('Say hello');

		await collectStreamChunks(fullStream);
		const result = await getResult();

		expect(result.usage).toBeDefined();
		expect(result.usage!.promptTokens).toBeGreaterThan(0);
		expect(result.usage!.completionTokens).toBeGreaterThan(0);
		expect(result.usage!.totalTokens).toBe(
			result.usage!.promptTokens + result.usage!.completionTokens,
		);
	});

	it('reports token usage on a simple text response via run()', async () => {
		const agent = new Agent('token-run-test')
			.model(getModel('anthropic'))
			.instructions('Reply with exactly: "Hello". Nothing else.');

		const run = agent.run('Say hello');
		const result = await run.result;

		expect(result.usage).toBeDefined();
		expect(result.usage!.promptTokens).toBeGreaterThan(0);
		expect(result.usage!.completionTokens).toBeGreaterThan(0);
		expect(result.usage!.totalTokens).toBe(
			result.usage!.promptTokens + result.usage!.completionTokens,
		);
	});

	it('reports token usage after a multi-step tool call', async () => {
		const agent = createAgentWithAddTool('anthropic');

		const { fullStream, getResult } = await agent.streamText('What is 7 + 13?');

		await collectStreamChunks(fullStream);
		const result = await getResult();

		// Should have used at least 1 step (tool call + response)
		expect(result.steps).toBeGreaterThanOrEqual(1);

		expect(result.usage).toBeDefined();
		// Multi-step should use more tokens than a simple response
		expect(result.usage!.promptTokens).toBeGreaterThan(0);
		expect(result.usage!.completionTokens).toBeGreaterThan(0);
		expect(result.usage!.totalTokens).toBe(
			result.usage!.promptTokens + result.usage!.completionTokens,
		);
	});

	it('emits finish chunks with token usage in the stream', async () => {
		const agent = new Agent('finish-chunk-test')
			.model(getModel('anthropic'))
			.instructions('Reply with exactly: "OK". Nothing else.');

		const { fullStream } = await agent.streamText('Acknowledge');

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
		const short = await agent.streamText('Hi');
		await collectStreamChunks(short.fullStream);
		const shortResult = await short.getResult();

		// Longer prompt
		const long = await agent.streamText(
			'Explain the difference between TCP and UDP networking protocols. Include at least three key differences.',
		);
		await collectStreamChunks(long.fullStream);
		const longResult = await long.getResult();

		// Longer prompt should use more completion tokens (longer response)
		expect(longResult.usage!.completionTokens).toBeGreaterThan(shortResult.usage!.completionTokens);
	});
});
