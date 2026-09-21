import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import nock from 'nock';
import { z } from 'zod';

import type { ModelConfig } from '../../types';
import { AgentRuntime } from '../loop/agent-runtime';
import { InMemoryMemory } from '../memory/memory-store';

const baseURL = 'https://kimi.example/v1';
const reasoning = 'List the workflows before inspecting one.';
const requestSchema = z.object({
	messages: z.array(
		z.object({ role: z.string(), reasoning_content: z.string().optional() }).passthrough(),
	),
});
const toolCall = {
	id: 'call_1',
	type: 'function',
	function: { name: 'list_workflows', arguments: '{}' },
};

const models: Array<{ name: string; createModel: () => ModelConfig }> = [
	{
		name: 'Moonshot credentials',
		createModel: () => ({ id: 'moonshotai/kimi-k3', apiKey: 'test', url: baseURL }),
	},
	{
		name: 'Kimi proxy',
		createModel: () =>
			createOpenAICompatible({ name: 'moonshotai', apiKey: 'test', baseURL })('kimi-k3'),
	},
];

function streamResponse(deltas: Array<Record<string, unknown>>, finishReason: string): string {
	return (
		[
			...deltas.map((delta) => ({ delta, finish_reason: null })),
			{ delta: {}, finish_reason: finishReason },
		]
			.map((choice) =>
				JSON.stringify({
					id: 'completion_1',
					model: 'kimi-k3',
					choices: [{ index: 0, ...choice }],
				}),
			)
			.map((chunk) => `data: ${chunk}\n\n`)
			.join('') + 'data: [DONE]\n\n'
	);
}

function generateResponse() {
	return {
		id: 'completion_1',
		model: 'kimi-k3',
		choices: [
			{
				index: 0,
				message: { role: 'assistant', content: 'I can help.', reasoning_content: reasoning },
				finish_reason: 'stop',
			},
		],
		usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
	};
}

beforeAll(() => nock.disableNetConnect());
afterAll(() => nock.enableNetConnect());
afterEach(() => nock.cleanAll());

describe.each(models)('Kimi reasoning replay — $name', ({ createModel }) => {
	it('sends the original reasoning with a streamed tool result', async () => {
		const requests: unknown[] = [];
		const captureRequest = (body: unknown) => {
			requests.push(body);
			return true;
		};
		const scope = nock(baseURL)
			.post('/chat/completions', captureRequest)
			.reply(
				200,
				streamResponse(
					[
						{ role: 'assistant', reasoning_content: reasoning },
						{ tool_calls: [{ index: 0, ...toolCall }] },
					],
					'tool_calls',
				),
				{ 'Content-Type': 'text/event-stream' },
			)
			.post('/chat/completions', captureRequest)
			.reply(200, streamResponse([{ content: 'No workflows found.' }], 'stop'), {
				'Content-Type': 'text/event-stream',
			});
		const handler = vi.fn().mockResolvedValue([]);
		const runtime = new AgentRuntime({
			name: 'kimi-test',
			model: createModel(),
			modelCost: { input: 0, output: 0 },
			instructions: 'Help with workflows.',
			tools: [
				{
					name: 'list_workflows',
					description: 'List workflows.',
					inputSchema: z.object({}),
					handler,
				},
			],
		});

		const { stream } = await runtime.stream('List my workflows.');
		for await (const chunk of stream) {
			expect(chunk.type).not.toBe('error');
		}

		expect(scope.isDone()).toBe(true);
		expect(handler).toHaveBeenCalledOnce();
		expect(requests).toHaveLength(2);
		const sent = requestSchema.parse(requests[1]);
		const assistant = sent.messages.find((message) => message.role === 'assistant');
		expect(assistant?.reasoning_content).toBe(reasoning);
		expect(assistant?.tool_calls).toEqual([toolCall]);
		expect(sent.messages.find((message) => message.role === 'tool')).toEqual({
			role: 'tool',
			tool_call_id: 'call_1',
			content: '[]',
		});
	});

	it.each(['generate', 'stream'] as const)(
		'sends reasoning from saved history in a new runtime with %s',
		async (mode) => {
			const requests: unknown[] = [];
			const scope = nock(baseURL)
				.post('/chat/completions', (body: unknown) => {
					requests.push(body);
					return true;
				})
				.twice()
				.reply(
					200,
					mode === 'generate'
						? generateResponse()
						: streamResponse(
								[{ role: 'assistant', reasoning_content: reasoning }, { content: 'I can help.' }],
								'stop',
							),
					{ 'Content-Type': mode === 'generate' ? 'application/json' : 'text/event-stream' },
				);
			const memory = new InMemoryMemory();
			const options = { persistence: { threadId: 'thread_1', resourceId: 'user_1' } };
			const config = {
				name: 'kimi-test',
				model: createModel(),
				modelCost: { input: 0, output: 0 },
				instructions: 'Help with workflows.',
				memory,
			};

			for (const input of ['Hello.', 'Please continue.']) {
				const runtime = new AgentRuntime(config);
				if (mode === 'generate') {
					const result = await runtime.generate(input, options);
					expect(result.finishReason).toBe('stop');
				} else {
					const { stream } = await runtime.stream(input, options);
					for await (const chunk of stream) {
						expect(chunk.type).not.toBe('error');
					}
				}
			}

			expect(scope.isDone()).toBe(true);
			expect(requests).toHaveLength(2);
			const sent = requestSchema.parse(requests[1]);
			const assistant = sent.messages.find((message) => message.role === 'assistant');
			expect(assistant?.reasoning_content).toBe(reasoning);
			expect(assistant?.content).toBe('I can help.');
			expect(sent.messages.at(-1)).toEqual({
				role: 'user',
				content: 'Please continue.',
			});
		},
	);
});
