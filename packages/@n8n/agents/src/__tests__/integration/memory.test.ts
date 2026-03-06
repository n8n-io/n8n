import { expect, it } from 'vitest';
import { z } from 'zod';

import { describeIf, findTextContent, getModel } from './helpers';
import { Agent, Memory, Tool } from '../../index';

const describe = describeIf('anthropic');

describe('memory integration', () => {
	it('recalls previous messages within the same thread', async () => {
		const memory = new Memory().storage('memory').lastMessages(10);

		const agent = new Agent('memory-test')
			.model(getModel('anthropic'))
			.instructions('You are a helpful assistant. Be concise.')
			.memory(memory);

		const threadId = `test-thread-${Date.now()}`;
		const options = { threadId, resourceId: 'test-user' };

		const run1 = agent.run('My favorite color is purple. Just acknowledge this.', options);
		const result1 = await run1.result;
		expect(findTextContent(result1.messages)).toBeTruthy();

		const run2 = agent.run('What is my favorite color?', options);
		const result2 = await run2.result;

		expect(findTextContent(result2.messages)?.toLowerCase()).toContain('purple');
	});

	it('isolates separate threads', async () => {
		const memory = new Memory().storage('memory').lastMessages(10);

		const agent = new Agent('thread-isolation-test')
			.model(getModel('anthropic'))
			.instructions(
				'You are a helpful assistant. Be concise. If you do not know something, say "I don\'t know".',
			)
			.memory(memory);

		const thread1 = `test-thread-1-${Date.now()}`;
		const thread2 = `test-thread-2-${Date.now()}`;

		const run1 = agent.run('Remember this secret code: ALPHA-7. Just acknowledge.', {
			threadId: thread1,
			resourceId: 'test-user',
		});
		await run1.result;

		const run2 = agent.run('What is the secret code I told you?', {
			threadId: thread2,
			resourceId: 'test-user',
		});
		const result2 = await run2.result;

		expect(findTextContent(result2.messages)?.toLowerCase()).not.toContain('alpha-7');
	});

	it('recalls tool results when .storeResults() is enabled (via run)', async () => {
		const memory = new Memory().storage('memory').lastMessages(20);

		const lookupTool = new Tool('lookup_inventory')
			.description('Look up the current inventory count for a product')
			.input(
				z.object({
					product: z.string().describe('Product name'),
				}),
			)
			.handler(async ({ product }) => ({
				product,
				count: 42,
				warehouse: 'Building-7',
			}))
			.storeResults();

		const agent = new Agent('store-results-run-test')
			.model(getModel('anthropic'))
			.instructions(
				'You are an inventory assistant. Use the lookup_inventory tool when asked about stock. Be concise.',
			)
			.tool(lookupTool)
			.memory(memory);

		const threadId = `test-store-results-run-${Date.now()}`;
		const options = { threadId, resourceId: 'test-user' };

		// Turn 1: trigger the tool via run()
		const run1 = agent.run('How many widgets do we have in stock?', options);
		const result1 = await run1.result;
		expect(findTextContent(result1.messages)).toBeTruthy();
		expect(result1.toolCalls?.length).toBeGreaterThan(0);

		// Turn 2: ask about the tool result without re-triggering the tool
		const run2 = agent.run(
			'Which warehouse are the widgets stored in? Do NOT call any tools — answer from what you already know.',
			options,
		);
		const result2 = await run2.result;

		expect(findTextContent(result2.messages)?.toLowerCase()).toContain('building-7');
		expect(result2.toolCalls?.length).toBe(0);
	});

	it('recalls tool results when .storeResults() is enabled (via streamText)', async () => {
		const memory = new Memory().storage('memory').lastMessages(20);

		const lookupTool = new Tool('lookup_inventory')
			.description('Look up the current inventory count for a product')
			.input(
				z.object({
					product: z.string().describe('Product name'),
				}),
			)
			.handler(async ({ product }) => ({
				product,
				count: 42,
				warehouse: 'Building-7',
			}))
			.storeResults();

		const agent = new Agent('store-results-stream-test')
			.model(getModel('anthropic'))
			.instructions(
				'You are an inventory assistant. Use the lookup_inventory tool when asked about stock. Be concise.',
			)
			.tool(lookupTool)
			.memory(memory);

		const threadId = `test-store-results-stream-${Date.now()}`;
		const options = { threadId, resourceId: 'test-user' };

		// Turn 1: trigger the tool via streamText() — same path as the playground
		const stream1 = await agent.streamText('How many widgets do we have in stock?', options);
		// Must consume the stream AND call getResult() to trigger saveToolResultsToMemory
		const reader = stream1.fullStream.getReader();
		while (true) {
			const { done } = await reader.read();
			if (done) break;
		}
		const result1 = await stream1.getResult();
		expect(result1.toolCalls?.length).toBeGreaterThan(0);

		// Turn 2: ask about the tool result
		const run2 = agent.run(
			'Which warehouse are the widgets stored in? Do NOT call any tools — answer from what you already know.',
			options,
		);
		const result2 = await run2.result;

		expect(findTextContent(result2.messages)?.toLowerCase()).toContain('building-7');
		expect(result2.toolCalls?.length).toBe(0);
	});
});
