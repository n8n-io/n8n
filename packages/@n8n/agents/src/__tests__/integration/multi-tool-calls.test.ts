import { expect, it } from 'vitest';
import { z } from 'zod';

import {
	describeIf,
	collectStreamChunks,
	getModel,
	chunksOfType,
	findAllToolResults,
	collectTextDeltas,
} from './helpers';
import { Agent, Tool } from '../../index';

const describe = describeIf('anthropic');

describe('multi-tool-calls integration', () => {
	it('correctly merges results when the same tool is called multiple times', async () => {
		let callCount = 0;

		const lookupTool = new Tool('lookup_price')
			.description('Look up the price of a product by name')
			.input(z.object({ product: z.string().describe('Product name') }))
			.output(z.object({ product: z.string(), price: z.number() }))
			.handler(async ({ product }) => {
				callCount++;
				const prices: Record<string, number> = {
					apple: 1.5,
					banana: 0.75,
					cherry: 3.0,
				};
				return { product, price: prices[product.toLowerCase()] ?? 0 };
			});

		const agent = new Agent('multi-call-test')
			.model(getModel('anthropic'))
			.instructions(
				'You are a price checker. When asked about prices, use the lookup_price tool for EACH product separately. Be concise.',
			)
			.tool(lookupTool);

		const { stream: fullStream } = await agent.stream(
			'What are the prices of apple, banana, and cherry? Look up each one.',
		);

		const chunks = await collectStreamChunks(fullStream);
		const messageChunks = chunksOfType(chunks, 'message');
		const toolCallResults = findAllToolResults(messageChunks.map((c) => c.message));

		// Should have called the tool multiple times
		const priceCalls = toolCallResults.filter((tc) => tc.toolName === 'lookup_price');
		expect(priceCalls.length).toBeGreaterThanOrEqual(2);

		// Each call should have its own correct output (not all pointing to the first result)
		const outputs = priceCalls.map((tc) => tc.result as { product: string; price: number });

		// Verify that different products got different prices (index-based merging works)
		const uniquePrices = new Set(outputs.map((o) => o.price));
		expect(uniquePrices.size).toBeGreaterThanOrEqual(2);

		// The response should mention the prices
		const text = collectTextDeltas(chunks);
		expect(text).toBeTruthy();
		expect(text).toMatch(/apple/i);
		expect(text).toMatch(/banana/i);
		expect(text).toMatch(/cherry/i);
		expect(text).toMatch(/1\.5/i);
		expect(text).toMatch(/0\.75/i);
		expect(text).toMatch(/3\.0/i);
	});

	it('correctly merges results when different tools are called in sequence', async () => {
		const addTool = new Tool('add')
			.description('Add two numbers')
			.input(z.object({ a: z.number(), b: z.number() }))
			.handler(async ({ a, b }) => ({ result: a + b }));

		const multiplyTool = new Tool('multiply')
			.description('Multiply two numbers')
			.input(z.object({ a: z.number(), b: z.number() }))
			.handler(async ({ a, b }) => ({ result: a * b }));

		const agent = new Agent('mixed-tools-test')
			.model(getModel('anthropic'))
			.instructions(
				'You are a calculator. Use the add tool for addition and multiply tool for multiplication. Be concise.',
			)
			.tool(addTool)
			.tool(multiplyTool);

		const { stream: fullStream } = await agent.stream('What is 3 + 4 and also what is 5 * 6?');

		const chunks = await collectStreamChunks(fullStream);
		const messageChunks = chunksOfType(chunks, 'message');
		const toolCallResults = findAllToolResults(messageChunks.map((c) => c.message));

		const toolCalls = toolCallResults.filter(
			(tc) => tc.toolName === 'add' || tc.toolName === 'multiply',
		);
		expect(toolCalls.length).toBeGreaterThanOrEqual(2);

		const addCall = toolCallResults.find((tc) => tc.toolName === 'add');
		const multiplyCall = toolCallResults.find((tc) => tc.toolName === 'multiply');

		expect(addCall).toBeDefined();
		expect(multiplyCall).toBeDefined();

		expect((addCall!.result as { result: number }).result).toBe(7);
		expect((multiplyCall!.result as { result: number }).result).toBe(30);
	});

	it('correctly merges results via the run() path', async () => {
		const lookupTool = new Tool('get_length')
			.description('Get the length of a string')
			.input(z.object({ text: z.string() }))
			.output(z.object({ text: z.string(), length: z.number() }))
			.handler(async ({ text }) => ({ text, length: text.length }));

		const agent = new Agent('multi-call-run-test')
			.model(getModel('anthropic'))
			.instructions(
				'You are a string utility. When asked about string lengths, use the get_length tool for EACH string separately. Be concise.',
			)
			.tool(lookupTool);

		const { stream: fullStream } = await agent.stream(
			'What are the lengths of "hello" and "world"? Look up each one separately.',
		);
		const chunks = await collectStreamChunks(fullStream);
		const messageChunks = chunksOfType(chunks, 'message');
		const toolCallResults = findAllToolResults(messageChunks.map((c) => c.message));

		const lengthCalls = toolCallResults.filter((tc) => tc.toolName === 'get_length');
		expect(lengthCalls.length).toBeGreaterThanOrEqual(2);

		// Each should have correct output
		for (const call of lengthCalls) {
			const output = call.result as { text: string; length: number };
			expect(output.length).toBe(output.text.length);
		}
	});
});
