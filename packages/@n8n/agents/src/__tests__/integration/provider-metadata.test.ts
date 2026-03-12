import { expect, it } from 'vitest';

import { describeIf, collectStreamChunks, getModel } from './helpers';
import { Agent } from '../../index';

const describe = describeIf('anthropic');

describe('provider metadata integration', () => {
	it('includes finishReason in finish chunks', async () => {
		const agent = new Agent('metadata-test')
			.model(getModel('anthropic'))
			.instructions('Reply with exactly: "OK". Nothing else.');

		const { fullStream } = await agent.streamText('Acknowledge');

		const chunks = await collectStreamChunks(fullStream);
		const finishChunks = chunks.filter((c) => c.type === 'finish');

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

		const { fullStream } = await agent.streamText('Say done');

		const chunks = await collectStreamChunks(fullStream);
		const finishChunks = chunks.filter((c) => c.type === 'finish');

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

		const { fullStream, getResult } = await agent.streamText('What is 1+1?');
		await collectStreamChunks(fullStream);
		const result = await getResult();

		expect(result.usage).toBeDefined();
		expect(typeof result.usage!.promptTokens).toBe('number');
		expect(typeof result.usage!.completionTokens).toBe('number');
		expect(typeof result.usage!.totalTokens).toBe('number');
		expect(result.usage!.totalTokens).toBeGreaterThan(0);
	});

	it('result reports steps count after tool use', async () => {
		const { createAgentWithAddTool } = await import('./helpers');
		const agent = createAgentWithAddTool('anthropic');

		const { fullStream, getResult } = await agent.streamText('What is 2 + 3?');
		await collectStreamChunks(fullStream);
		const result = await getResult();

		// With a tool call, should have at least 1 step
		expect(result.steps).toBeDefined();
		expect(result.steps).toBeGreaterThanOrEqual(1);
	});
});
