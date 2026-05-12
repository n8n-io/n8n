import { expect, it, vi } from 'vitest';
import { z } from 'zod';

import {
	describeIf,
	getModel,
	collectStreamChunks,
	chunksOfType,
	findAllToolResults,
	collectTextDeltas,
} from './helpers';
import { Agent, filterLlmMessages, Tool } from '../../index';

const describe = describeIf('anthropic');

describe('toModelOutput integration', () => {
	it('sends the transformed output to the LLM while preserving raw output in toolCalls', async () => {
		const handlerSpy = vi.fn();

		const searchTool = new Tool('search_db')
			.description('Search the database and return matching records')
			.input(z.object({ query: z.string().describe('Search query') }))
			.output(
				z.object({
					records: z.array(z.object({ id: z.number(), name: z.string(), data: z.string() })),
					total: z.number(),
				}),
			)
			.handler(async ({ query }) => {
				handlerSpy(query);
				return {
					records: [
						{ id: 1, name: 'Widget A', data: 'x'.repeat(200) },
						{ id: 2, name: 'Widget B', data: 'y'.repeat(200) },
						{ id: 3, name: 'Gadget C', data: 'z'.repeat(200) },
					],
					total: 3,
				};
			})
			.toModelOutput((output) => ({
				summary: `Found ${output.total} records: ${output.records.map((r) => r.name).join(', ')}`,
			}));

		const agent = new Agent('to-model-output-test')
			.model(getModel('anthropic'))
			.instructions(
				'You are a database assistant. Use search_db to find records. Be concise in your response.',
			)
			.tool(searchTool);

		const result = await agent.generate('Search for widgets in the database');

		expect(handlerSpy).toHaveBeenCalled();

		// toolCalls on GenerateResult stores the raw output
		expect(result.toolCalls).toBeDefined();
		const searchEntry = result.toolCalls!.find((tc) => tc.tool === 'search_db');
		expect(searchEntry).toBeDefined();
		const rawOutput = searchEntry!.output as {
			records: Array<{ id: number; name: string; data: string }>;
			total: number;
		};
		expect(rawOutput.total).toBe(3);
		expect(rawOutput.records[0].data).toBe('x'.repeat(200));

		// ContentToolResult in messages stores the transformed output (what the LLM saw)
		const toolResults = findAllToolResults(result.messages);
		const searchToolResult = toolResults.find((tr) => tr.toolName === 'search_db');
		expect(searchToolResult).toBeDefined();
		const modelOutput = searchToolResult!.result as { summary: string };
		expect(modelOutput.summary).toContain('Found 3 records');
		expect(modelOutput.summary).toContain('Widget A');
	});

	it('works with stream() — LLM receives transformed output', async () => {
		const fetchTool = new Tool('fetch_report')
			.description('Fetch a detailed report by ID')
			.input(z.object({ reportId: z.string().describe('Report ID') }))
			.output(
				z.object({
					id: z.string(),
					title: z.string(),
					body: z.string(),
					metadata: z.object({ pages: z.number(), author: z.string() }),
				}),
			)
			.handler(async ({ reportId }) => ({
				id: reportId,
				title: 'Q4 Sales Report',
				body: 'Detailed analysis spanning multiple pages...'.repeat(10),
				metadata: { pages: 42, author: 'Jane Doe' },
			}))
			.toModelOutput((output) => ({
				id: output.id,
				title: output.title,
				pageCount: output.metadata.pages,
			}));

		const agent = new Agent('to-model-output-stream-test')
			.model(getModel('anthropic'))
			.instructions(
				'You are a report assistant. Use fetch_report to retrieve reports. Mention the title and page count. Be concise.',
			)
			.tool(fetchTool);

		const { stream } = await agent.stream('Get report RPT-001');
		const chunks = await collectStreamChunks(stream);

		// The tool result messages in the stream contain the transformed output
		const messageChunks = chunksOfType(chunks, 'message');
		const toolResults = findAllToolResults(messageChunks.map((c) => c.message));

		const reportResult = toolResults.find((tr) => tr.toolName === 'fetch_report');
		expect(reportResult).toBeDefined();

		// The model output (transformed) should have the truncated fields
		const modelOutput = reportResult!.result as { id: string; title: string; pageCount: number };
		expect(modelOutput.id).toBe('RPT-001');
		expect(modelOutput.title).toBe('Q4 Sales Report');
		expect(modelOutput.pageCount).toBe(42);
		// The body should NOT be in the model output (it was stripped by toModelOutput)
		expect((modelOutput as Record<string, unknown>).body).toBeUndefined();

		const text = collectTextDeltas(chunks);
		expect(text).toBeTruthy();
		expect(text).toMatch(/Q4 Sales Report/i);
	});

	it('does not affect the LLM output when toModelOutput is not set', async () => {
		const echoTool = new Tool('echo')
			.description('Echo back the input message')
			.input(z.object({ message: z.string().describe('Message to echo') }))
			.output(z.object({ echoed: z.string() }))
			.handler(async ({ message }) => ({ echoed: message }));

		const agent = new Agent('no-to-model-output-test')
			.model(getModel('anthropic'))
			.instructions('You are a simple echo bot. Use echo tool and repeat the result. Be concise.')
			.tool(echoTool);

		const result = await agent.generate('Echo the message "hello world"');

		// Without toModelOutput, tool result in messages should have the raw output
		const toolResults = findAllToolResults(result.messages);
		const echoResult = toolResults.find((tr) => tr.toolName === 'echo');
		expect(echoResult).toBeDefined();
		expect((echoResult!.result as { echoed: string }).echoed).toBe('hello world');

		// And toolCalls should also have the same raw output
		expect(result.toolCalls).toBeDefined();
		const echoEntry = result.toolCalls!.find((tc) => tc.tool === 'echo');
		expect(echoEntry).toBeDefined();
		expect((echoEntry!.output as { echoed: string }).echoed).toBe('hello world');
	});

	it('works alongside toMessage — both transforms apply independently', async () => {
		const calcTool = new Tool('multiply')
			.description('Multiply two numbers')
			.input(
				z.object({
					a: z.number().describe('First number'),
					b: z.number().describe('Second number'),
				}),
			)
			.output(z.object({ result: z.number() }))
			.handler(async ({ a, b }) => ({ result: a * b }))
			.toModelOutput((output) => ({
				answer: output.result,
				note: 'multiplication complete',
			}))
			.toMessage((output) => ({
				type: 'custom',
				data: {
					dummy: `Product is ${output.result}`,
				},
			}));

		const agent = new Agent('both-transforms-test')
			.model(getModel('anthropic'))
			.instructions('You are a calculator. Use multiply to multiply numbers. Be concise.')
			.tool(calcTool);

		const result = await agent.generate('What is 7 times 8?');

		// Custom message from toMessage should be present (uses raw output)
		const customMessages = result.messages.filter((m) => m.type === 'custom') as Array<{
			type: 'custom';
			data: { dummy: string };
		}>;
		expect(customMessages.length).toBeGreaterThan(0);
		expect(customMessages[0].data.dummy).toBe('Product is 56');

		// toolCalls stores the raw output
		expect(result.toolCalls).toBeDefined();
		const multiplyEntry = result.toolCalls!.find((tc) => tc.tool === 'multiply');
		expect(multiplyEntry).toBeDefined();
		expect((multiplyEntry!.output as { result: number }).result).toBe(56);

		// Tool result in messages stores the transformed output for the LLM
		const toolResults = findAllToolResults(result.messages);
		const multiplyToolResult = toolResults.find((tr) => tr.toolName === 'multiply');
		expect(multiplyToolResult).toBeDefined();
		const modelOutput = multiplyToolResult!.result as { answer: number; note: string };
		expect(modelOutput.answer).toBe(56);
		expect(modelOutput.note).toBe('multiplication complete');

		// The custom messages should be filtered out for the LLM
		const llmMessages = filterLlmMessages(result.messages);
		expect(llmMessages.length).toBeLessThan(result.messages.length);
	});
});
