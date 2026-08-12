import { expect, it } from 'vitest';

import { describeIf, collectStreamChunks, getModel, chunksOfType } from './helpers';
import { Agent } from '../../index';

const describe = describeIf('anthropic');

describe('provider metadata integration', () => {
	it('includes finishReason in finish chunks', async () => {
		const agent = new Agent('metadata-test')
			.model(getModel('anthropic'))
			.instructions('Reply with exactly: "OK". Nothing else.');

		const { stream: fullStream } = await agent.stream('Acknowledge');

		const chunks = await collectStreamChunks(fullStream);
		const finishChunks = chunksOfType(chunks, 'finish');

		expect(finishChunks.length).toBeGreaterThan(0);

		for (const chunk of finishChunks) {
			if (chunk.type === 'finish') {
				expect(chunk.finishReason).toBeDefined();
				expect(['stop', 'length', 'content-filter', 'tool-calls', 'error', 'other']).toContain(
					chunk.finishReason,
				);
			}
		}
	});

	it('finish reason is "stop" for a normal completion', async () => {
		const agent = new Agent('stop-reason-test')
			.model(getModel('anthropic'))
			.instructions('Reply with exactly: "Done". Nothing else.');

		const { stream: fullStream } = await agent.stream('Say done');

		const chunks = await collectStreamChunks(fullStream);
		const finishChunks = chunksOfType(chunks, 'finish');

		// The last finish chunk should be 'stop'
		const lastFinish = finishChunks[finishChunks.length - 1];
		expect(lastFinish).toBeDefined();
		if (lastFinish?.type === 'finish') {
			expect(lastFinish.finishReason).toBe('stop');
		}
	});

	it('result contains usage metadata from the provider', async () => {
		const agent = new Agent('usage-metadata-test')
			.model(getModel('anthropic'))
			.instructions('You are a helpful assistant. Be concise.');

		const { stream: fullStream } = await agent.stream('What is 1+1?');
		const chunks = await collectStreamChunks(fullStream);
		const finishChunks = chunksOfType(chunks, 'finish');
		const usage = finishChunks[0].usage;

		expect(usage).toBeDefined();
		expect(typeof usage!.promptTokens).toBe('number');
		expect(typeof usage!.completionTokens).toBe('number');
		expect(typeof usage!.totalTokens).toBe('number');
		expect(usage!.totalTokens).toBeGreaterThan(0);
	});
});
