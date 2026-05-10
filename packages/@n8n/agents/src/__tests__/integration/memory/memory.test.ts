import { expect, it } from 'vitest';
import { z } from 'zod';

import { Agent, Memory, Tool } from '../../../index';
import { describeIf, findLastTextContent, findLastToolCallContent, getModel } from '../helpers';

const describe = describeIf('anthropic');

describe('memory integration', () => {
	it('recalls previous messages within the same thread', async () => {
		const memory = new Memory().storage('memory').lastMessages(10);

		const agent = new Agent('memory-test')
			.model(getModel('anthropic'))
			.instructions('You are a helpful assistant. Be concise.')
			.memory(memory);

		const threadId = `test-thread-${Date.now()}`;
		const options = { persistence: { threadId, resourceId: 'test-user' } };

		const result1 = await agent.generate(
			'My favorite color is purple. Just acknowledge this.',
			options,
		);
		expect(findLastTextContent(result1.messages)).toBeTruthy();

		const result2 = await agent.generate('What is my favorite color?', options);

		expect(findLastTextContent(result2.messages)?.toLowerCase()).toContain('purple');
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

		await agent.generate('Remember this secret code: ALPHA-7. Just acknowledge.', {
			persistence: { threadId: thread1, resourceId: 'test-user' },
		});

		const result2 = await agent.generate('What is the secret code I told you?', {
			persistence: { threadId: thread2, resourceId: 'test-user' },
		});

		expect(findLastTextContent(result2.messages)?.toLowerCase()).not.toContain('alpha-7');
	});

	it('recalls tool results with generate()', async () => {
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
			}));

		const agent = new Agent('store-results-run-test')
			.model(getModel('anthropic'))
			.instructions(
				'You are an inventory assistant. Use the lookup_inventory tool when asked about stock. Be concise.',
			)
			.tool(lookupTool)
			.memory(memory);

		const threadId = `test-store-results-run-${Date.now()}`;
		const options = { persistence: { threadId, resourceId: 'test-user' } };

		// Turn 1: trigger the tool via generate()
		const result1 = await agent.generate('How many widgets do we have in stock?', options);
		expect(findLastTextContent(result1.messages)).toBeTruthy();
		expect(findLastToolCallContent(result1.messages)).toBeTruthy();

		// Turn 2: ask about the tool result without re-triggering the tool
		const result2 = await agent.generate(
			'Which warehouse are the widgets stored in? Do NOT call any tools — answer from what you already know.',
			options,
		);

		expect(findLastTextContent(result2.messages)?.toLowerCase()).toContain('building-7');
		expect(findLastToolCallContent(result2.messages)).toBeUndefined();
	});

	it('recalls tool results with stream()', async () => {
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
			}));

		const agent = new Agent('store-results-stream-test')
			.model(getModel('anthropic'))
			.instructions(
				'You are an inventory assistant. Use the lookup_inventory tool when asked about stock. Be concise.',
			)
			.tool(lookupTool)
			.memory(memory);

		const threadId = `test-store-results-stream-${Date.now()}`;
		const options = { persistence: { threadId, resourceId: 'test-user' } };

		// Turn 1: trigger the tool via stream()
		const { stream: stream1 } = await agent.stream(
			'How many widgets do we have in stock?',
			options,
		);
		// Must consume the stream AND call getResult() to trigger saveToolResultsToMemory
		const reader = stream1.getReader();
		while (true) {
			const { done } = await reader.read();
			if (done) break;
		}
		const result1 = await agent.generate('How many widgets do we have in stock?', options);
		expect(findLastToolCallContent(result1.messages)).toBeTruthy();

		// Turn 2: ask about the tool result
		const result2 = await agent.generate(
			'Which warehouse are the widgets stored in? Do NOT call any tools — answer from what you already know.',
			options,
		);

		expect(findLastTextContent(result2.messages)?.toLowerCase()).toContain('building-7');
		expect(findLastToolCallContent(result2.messages)).toBeUndefined();
	});
});
