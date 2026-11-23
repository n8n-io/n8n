import nock from 'nock';
import assert from 'node:assert';
import { once } from 'node:events';
import { createServer, type Server } from 'node:http';
import { Readable } from 'node:stream';

import { OpenAIChatModel } from './fixtures/openai';
import { mockFinalResponse, mockToolCallResponse } from './fixtures/openai.fixtures';
import {
	baseURL,
	userMessage,
	createModel,
	sseEvents,
	collect,
	createMockHttpRequests,
	sseReply,
} from './fixtures/openai.helpers';

describe('OpenAIChatModel', () => {
	const apiErrorMessage = 'model crashed';
	const traceId = 'trace-1';

	afterEach(() => {
		nock.abortPendingRequests();
		nock.cleanAll();
	});

	describe('abort signal', () => {
		it('should cancel a pending generate request', async () => {
			nock(baseURL).post('/responses').delay(10_000).reply(200, mockFinalResponse);
			const controller = new AbortController();

			const result = createModel().generate([userMessage], { abortSignal: controller.signal });
			controller.abort();

			await expect(result).rejects.toThrow('canceled');
		});

		it('should cancel an open stream', async () => {
			const stalled = new Readable({ read() {} });
			stalled.push(
				`data: ${JSON.stringify({ type: 'response.output_text.delta', delta: 'Hello' })}\n\n`,
			);
			nock(baseURL)
				.post('/responses')
				.reply(200, () => stalled, { 'Content-Type': 'text/event-stream' });
			const controller = new AbortController();

			const stream = createModel().stream([userMessage], { abortSignal: controller.signal });
			const iterator = stream[Symbol.asyncIterator]();
			await expect(iterator.next()).resolves.toMatchObject({ value: { delta: 'Hello' } });
			controller.abort();

			await expect(iterator.next()).rejects.toThrow('canceled');
		});

		describe('with a silent server', () => {
			let server: Server;
			let closed: Promise<void>;
			let model: OpenAIChatModel;

			const listen = async (sendHeaders: boolean) => {
				let onClose = () => {};
				closed = new Promise((resolve) => (onClose = resolve));
				server = createServer((_request, response) => {
					response.on('close', onClose);
					if (sendHeaders) {
						response.writeHead(200, { 'Content-Type': 'text/event-stream' });
						response.flushHeaders();
					}
				});
				server.listen(0, '127.0.0.1');
				await once(server, 'listening');
				const address = server.address();
				assert(address !== null && typeof address === 'object');
				model = new OpenAIChatModel('gpt-4o', createMockHttpRequests(), {
					baseURL: `http://127.0.0.1:${address.port}`,
				});
			};

			const closedWithin = async (ms: number) =>
				await Promise.race([
					closed.then(() => true),
					new Promise<boolean>((resolve) => setTimeout(() => resolve(false), ms)),
				]);

			afterEach(() => {
				server.closeAllConnections();
				server.close();
			});

			it.each([
				['after the headers arrive', true],
				['before the headers arrive', false],
			])('should close the connection when a silent stream is aborted %s', async (_, headers) => {
				await listen(headers);
				const controller = new AbortController();
				const stream = model.stream([userMessage], { abortSignal: controller.signal });
				const next = stream[Symbol.asyncIterator]().next();
				await new Promise((resolve) => setTimeout(resolve, 100));

				controller.abort();

				const rejected = expect(next).rejects.toThrow();
				await expect(closedWithin(500)).resolves.toBe(true);
				await rejected;
			});

			it('should close the connection when a generate request is aborted', async () => {
				await listen(false);
				const controller = new AbortController();
				const result = model.generate([userMessage], { abortSignal: controller.signal });
				await new Promise((resolve) => setTimeout(resolve, 100));

				controller.abort();

				const rejected = expect(result).rejects.toThrow();
				await expect(closedWithin(500)).resolves.toBe(true);
				await rejected;
			});
		});
	});

	describe('failed responses', () => {
		it('should throw when a response has the failed status', async () => {
			nock(baseURL)
				.post('/responses')
				.reply(200, {
					...mockFinalResponse,
					status: 'failed',
					output: [],
					error: { code: 'server_error', message: apiErrorMessage },
				});

			await expect(createModel().generate([userMessage])).rejects.toThrow(
				`The model response failed: ${apiErrorMessage}`,
			);
		});

		it('should throw on a response.failed stream event', async () => {
			nock(baseURL)
				.post('/responses')
				.reply(
					...sseEvents(
						{ type: 'response.output_text.delta', delta: 'Hel' },
						{
							type: 'response.failed',
							response: { status: 'failed', error: { message: apiErrorMessage } },
						},
					),
				);

			await expect(collect(createModel().stream([userMessage]))).rejects.toThrow(
				`The model response failed: ${apiErrorMessage}`,
			);
		});

		it('should throw on an error stream event', async () => {
			nock(baseURL)
				.post('/responses')
				.reply(...sseEvents({ type: 'error', code: 'server_error', message: 'overloaded' }));

			await expect(collect(createModel().stream([userMessage]))).rejects.toThrow(
				'The model stream failed: overloaded',
			);
		});
	});

	it('should keep the default provider tools when a call sets them to undefined', async () => {
		let sent: Record<string, unknown> = {};
		nock(baseURL)
			.post('/responses', (body: Record<string, unknown>) => {
				sent = body;
				return true;
			})
			.reply(200, mockFinalResponse);
		const model = new OpenAIChatModel('gpt-4o', createMockHttpRequests(), {
			baseURL,
			providerTools: [{ type: 'provider', name: 'web_search', args: {} }],
		});

		await model.generate([userMessage], { providerTools: undefined });

		expect(sent.tools).toEqual([{ type: 'web_search' }]);
	});

	it('should send the supported call options and headers', async () => {
		let sent: Record<string, unknown> = {};
		nock(baseURL)
			.post('/responses', (body: Record<string, unknown>) => {
				sent = body;
				return true;
			})
			.matchHeader('x-trace-id', traceId)
			.reply(200, mockFinalResponse);

		await createModel().generate([userMessage], {
			maxTokens: 50,
			temperature: 0.2,
			topP: 0.9,
			toolChoice: 'required',
			headers: { 'x-trace-id': traceId, 'x-unset': undefined },
			stopSequences: ['END'],
			seed: 42,
			topK: 5,
			presencePenalty: 0.5,
			frequencyPenalty: 0.5,
		});

		expect(sent, 'stop sequences, seed and top-k have no Responses API parameter').toEqual({
			model: 'gpt-4o',
			input: 'Hi',
			max_output_tokens: 50,
			temperature: 0.2,
			top_p: 0.9,
			presence_penalty: 0.5,
			frequency_penalty: 0.5,
			tools: [],
			tool_choice: 'required',
			parallel_tool_calls: true,
			store: false,
			stream: false,
			include: ['reasoning.encrypted_content'],
		});
	});

	describe('finish reason', () => {
		it.each([
			[{ status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' } }, 'length'],
			[
				{ status: 'incomplete', incomplete_details: { reason: 'content_filter' } },
				'content-filter',
			],
			[{ status: 'completed' }, 'stop'],
		])('should map %j to %s', async (fields, finishReason) => {
			nock(baseURL)
				.post('/responses')
				.reply(200, { ...mockFinalResponse, ...fields });

			const result = await createModel().generate([userMessage]);

			expect(result.finishReason).toBe(finishReason);
		});

		it('should report tool calls', async () => {
			nock(baseURL).post('/responses').reply(200, mockToolCallResponse);

			const result = await createModel().generate([userMessage]);

			expect(result.finishReason).toBe('tool-calls');
		});

		it('should report a truncated stream as length', async () => {
			nock(baseURL)
				.post('/responses')
				.reply(
					...sseEvents(
						{ type: 'response.output_text.delta', delta: 'Hel' },
						{
							type: 'response.incomplete',
							response: {
								status: 'incomplete',
								incomplete_details: { reason: 'max_output_tokens' },
							},
						},
					),
				);

			const chunks = await collect(createModel().stream([userMessage]));

			expect(chunks.at(-1)).toMatchObject({ type: 'finish', finishReason: 'length' });
		});

		it('should read usage from the top level of a response.done event', async () => {
			nock(baseURL)
				.post('/responses')
				.reply(
					...sseEvents({
						type: 'response.done',
						usage: { input_tokens: 3, output_tokens: 2, total_tokens: 5 },
					}),
				);

			const chunks = await collect(createModel().stream([userMessage]));

			expect(chunks.at(-1)).toMatchObject({
				type: 'finish',
				usage: { promptTokens: 3, completionTokens: 2, totalTokens: 5 },
			});
		});
	});

	it.each([
		['malformed JSON', '{"id": "resp_bad", "output": ['],
		['a body without output', { id: 'resp_bad', status: 'completed' }],
		[
			'a message without content',
			{ ...mockFinalResponse, output: [{ type: 'message', role: 'assistant' }] },
		],
		[
			'a function call without arguments',
			{ ...mockFinalResponse, output: [{ type: 'function_call', name: 'get_weather' }] },
		],
		['an output item without a type', { ...mockFinalResponse, output: [{ id: 'item_1' }] }],
		[
			'a reasoning item with a malformed summary',
			{
				...mockFinalResponse,
				output: [{ type: 'reasoning', id: 'rs_1', summary: [{ type: 'summary_text', text: 1 }] }],
			},
		],
	])('should throw a clear error for %s', async (_, body) => {
		nock(baseURL).post('/responses').reply(200, body, { 'Content-Type': 'application/json' });

		await expect(createModel().generate([userMessage])).rejects.toThrow(
			'Unexpected response from the Responses API: the output is missing or malformed',
		);
	});

	it('should ignore output item types that the model does not use', async () => {
		const webSearchCall = { type: 'web_search_call', id: 'ws_1', status: 'completed' };
		nock(baseURL)
			.post('/responses')
			.reply(200, { ...mockFinalResponse, output: [webSearchCall, ...mockFinalResponse.output] });

		const result = await createModel().generate([userMessage]);

		expect(result.message.content).toEqual([{ type: 'text', text: "It's always sunny in Tokyo!" }]);
	});

	describe('refusals', () => {
		const refusal = "I can't help with that.";

		it('should return a refusal as the answer text', async () => {
			const refusalMessage = {
				type: 'message',
				role: 'assistant',
				content: [{ type: 'refusal', refusal }],
			};
			nock(baseURL)
				.post('/responses')
				.reply(200, { ...mockFinalResponse, output: [refusalMessage] });

			const result = await createModel().generate([userMessage]);

			expect(result.message.content).toEqual([{ type: 'text', text: refusal }]);
		});

		it('should stream a refusal as text', async () => {
			nock(baseURL)
				.post('/responses')
				.reply(
					...sseEvents(
						{ type: 'response.refusal.delta', delta: refusal },
						{ type: 'response.completed', response: { status: 'completed' } },
					),
				);

			const chunks = await collect(createModel().stream([userMessage]));

			expect(chunks[0]).toEqual({ type: 'text-delta', delta: refusal });
		});
	});

	it('should end a stream that has no events', async () => {
		nock(baseURL)
			.post('/responses')
			.reply(() => sseReply([]));

		const chunks = await collect(createModel().stream([userMessage]));

		expect(chunks).toEqual([]);
	});

	it.each([
		['malformed JSON', '{"city":'],
		['a JSON array', '["Tokyo"]'],
	])('should throw when the function call arguments are %s', async (_, args) => {
		const functionCall = {
			type: 'function_call',
			call_id: 'call_1',
			name: 'get_weather',
			arguments: args,
		};
		nock(baseURL)
			.post('/responses')
			.reply(200, { ...mockFinalResponse, output: [functionCall] });

		await expect(createModel().generate([userMessage])).rejects.toThrow(
			`Failed to parse function call arguments: ${args}`,
		);
	});

	it('should skip stream data that is not an event object', async () => {
		const lines = [
			'data: null\n\n',
			'data: {"type":"response.output_text.delta","delta":"Hello"}\n\n',
			'data: {"type":"response.completed","response":{"status":"completed"}}\n\n',
		];
		nock(baseURL)
			.post('/responses')
			.reply(200, () => Readable.from(lines), { 'Content-Type': 'text/event-stream' });

		const chunks = await collect(createModel().stream([userMessage]));

		expect(chunks).toEqual([
			{ type: 'text-delta', delta: 'Hello' },
			{ type: 'finish', finishReason: 'stop', usage: undefined },
		]);
	});

	it('should give a streamed tool call without an ID a generated one and send it back', async () => {
		const functionCall = {
			type: 'function_call',
			name: 'get_weather',
			arguments: '{"city":"Tokyo"}',
		};
		nock(baseURL)
			.post('/responses')
			.reply(
				...sseEvents(
					{ type: 'response.output_item.added', output_index: 0, item: functionCall },
					{ type: 'response.output_item.done', output_index: 0, item: functionCall },
					{ type: 'response.completed', response: { status: 'completed' } },
				),
			);
		let input: unknown;
		nock(baseURL)
			.post('/responses', (body: { input: unknown }) => {
				input = body.input;
				return true;
			})
			.reply(200, mockFinalResponse);
		const model = createModel();

		const chunks = await collect(model.stream([userMessage]));
		const id = chunks.find((chunk) => chunk.type === 'tool-call-delta')?.id;
		expect(id).toMatch(/^call_/);
		assert(id);

		await model.generate([
			userMessage,
			{
				role: 'assistant',
				content: [{ type: 'tool-call', toolCallId: id, toolName: 'get_weather', input: '{}' }],
			},
			{ role: 'tool', content: [{ type: 'tool-result', toolCallId: id, result: 'sunny' }] },
		]);

		expect(input).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: 'function_call', call_id: id }),
				expect.objectContaining({ type: 'function_call_output', call_id: id }),
			]),
		);
	});
});
