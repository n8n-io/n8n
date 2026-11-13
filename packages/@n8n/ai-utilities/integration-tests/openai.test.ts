import { createAgent, HumanMessage } from 'langchain';
import nock from 'nock';
import assert from 'node:assert';
import { Readable } from 'node:stream';

import { LangchainChatModelAdapter } from 'src';
import type { Message, StreamChunk } from 'src';

import { OpenAIChatModel } from './openai';
import {
	createMockHttpRequests,
	createSSEStream,
	mockFinalResponse,
	mockStreamFinalResponseEvents,
	mockStreamToolCallEvents,
	mockToolCallResponse,
	weatherTool,
} from './openai.fixtures';

describe('OpenAI Integration with Langchain Agent', () => {
	const baseURL = 'https://api.openai.com/v1';

	beforeEach(() => {
		nock.cleanAll();
	});

	afterEach(() => {
		nock.cleanAll();
	});

	it('should execute agent with tool calling through langchain adapter', async () => {
		nock(baseURL)
			.post('/responses', (body) => {
				expect(body).toMatchObject({
					model: 'gpt-4o',
					input: 'What is the weather in tokyo?',
					tools: [
						{
							type: 'function',
							name: 'get_weather',
							description: 'Get weather for a given city.',
							parameters: {
								type: 'object',
								properties: {
									city: {
										type: 'string',
									},
								},
								required: ['city'],
								additionalProperties: false,
							},
						},
					],
					parallel_tool_calls: true,
					store: false,
					stream: false,
				});
				return true;
			})
			.reply(200, mockToolCallResponse);

		nock(baseURL)
			.post('/responses', (body) => {
				expect(body).toMatchObject({
					model: 'gpt-4o',
					input: expect.arrayContaining([
						{ role: 'user', content: 'What is the weather in tokyo?' },
						{
							type: 'message',
							role: 'assistant',
							content: [{ type: 'output_text', text: '' }],
						},
						{
							type: 'function_call',
							call_id: 'call_YONsRdkCKu8Sh8WGkUiXqlYW',
							name: 'get_weather',
							arguments: '{"city":"Tokyo"}',
						},
						{
							type: 'function_call_output',
							call_id: 'call_YONsRdkCKu8Sh8WGkUiXqlYW',
							output: "It's always sunny in Tokyo!",
						},
					]),
					parallel_tool_calls: true,
					store: false,
					stream: false,
				});
				return true;
			})
			.reply(200, mockFinalResponse);

		const openaiChatModel = new OpenAIChatModel('gpt-4o', createMockHttpRequests(), { baseURL });
		const chatModel = new LangchainChatModelAdapter(openaiChatModel);
		const agent = createAgent({
			model: chatModel,
			tools: [weatherTool],
		});

		const result = await agent.invoke({
			messages: [new HumanMessage('What is the weather in tokyo?')],
		});

		expect(result).toBeDefined();
		expect(result.messages).toHaveLength(4);

		expect(result.messages[0]).toMatchObject({
			content: 'What is the weather in tokyo?',
		});

		expect(result.messages[1]).toMatchObject({
			id: 'resp_02a127c1e73b5fe4016989e989cb188195a27d4911084e4223',
			tool_calls: [
				{
					type: 'tool_call',
					id: 'call_YONsRdkCKu8Sh8WGkUiXqlYW',
					name: 'get_weather',
					args: {
						city: 'Tokyo',
					},
				},
			],
		});

		expect(result.messages[2]).toMatchObject({
			content: "It's always sunny in Tokyo!",
			name: 'get_weather',
			tool_call_id: 'call_YONsRdkCKu8Sh8WGkUiXqlYW',
		});

		expect(result.messages[3]).toMatchObject({
			id: 'resp_00a8729c01103919016989e98b13888190bca486b9676ce0cd',
			content: [
				{
					type: 'text',
					text: "It's always sunny in Tokyo!",
				},
			],
		});

		expect(nock.isDone()).toBe(true);
	});

	it('should execute agent with streaming through langchain adapter', async () => {
		nock(baseURL)
			.post('/responses', (body) => {
				expect(body).toMatchObject({
					model: 'gpt-4o',
					input: 'What is the weather in tokyo?',
					stream: true,
				});
				return true;
			})
			.reply(() => {
				const stream = createSSEStream(mockStreamToolCallEvents);
				return [
					200,
					stream,
					{
						'Content-Type': 'text/event-stream',
						'Cache-Control': 'no-cache',
						Connection: 'keep-alive',
					},
				];
			});

		nock(baseURL)
			.post('/responses', (body) => {
				expect(body).toMatchObject({
					model: 'gpt-4o',
					stream: true,
				});
				return true;
			})
			.reply(() => {
				const stream = createSSEStream(mockStreamFinalResponseEvents);
				return [
					200,
					stream,
					{
						'Content-Type': 'text/event-stream',
						'Cache-Control': 'no-cache',
						Connection: 'keep-alive',
					},
				];
			});

		const openaiChatModel = new OpenAIChatModel('gpt-4o', createMockHttpRequests(), { baseURL });
		const chatModel = new LangchainChatModelAdapter(openaiChatModel);
		const agent = createAgent({
			model: chatModel,
			tools: [weatherTool],
		});

		const chunks: unknown[] = [];
		const stream = await agent.stream(
			{ messages: [{ role: 'user', content: 'What is the weather in tokyo?' }] },
			{ streamMode: 'messages' },
		);

		for await (const chunk of stream) {
			chunks.push(chunk);
		}

		expect(chunks).toHaveLength(10);

		const getChunkData = (chunk: unknown) => {
			const chunkArray = chunk as unknown[];
			return {
				message: chunkArray[0] as Record<string, unknown>,
				metadata: chunkArray[1] as Record<string, unknown>,
			};
		};

		const { message: message1, metadata: metadata1 } = getChunkData(chunks[0]);
		const toolCalls1 = message1.tool_calls as Array<Record<string, unknown>>;
		expect(toolCalls1).toHaveLength(1);
		expect(toolCalls1[0]).toMatchObject({
			name: 'get_weather',
			args: {
				city: 'Tokyo',
			},
			id: 'call_StreamTest123',
			type: 'tool_call',
		});
		expect(metadata1.langgraph_step).toBeDefined();

		const { message: message2 } = getChunkData(chunks[1]);
		expect(message2.usage_metadata).toEqual({
			input_tokens: 46,
			output_tokens: 15,
			total_tokens: 61,
		});
		const responseMetadata2 = message2.response_metadata as Record<string, unknown>;
		expect(responseMetadata2.finish_reason).toBe('tool-calls');

		const { message: message3 } = getChunkData(chunks[2]);
		expect(message3.content).toBe("It's always sunny in Tokyo!");
		expect(message3.tool_call_id).toBe('call_StreamTest123');
		expect(message3.name).toBe('get_weather');

		const { message: message4 } = getChunkData(chunks[3]);
		const content4 = message4.content as Array<{ type: string; text: string }>;
		expect(content4[0].text).toBe("It's");

		const { message: message5 } = getChunkData(chunks[4]);
		const content5 = message5.content as Array<{ type: string; text: string }>;
		expect(content5[0].text).toBe(' always');

		const { message: message6 } = getChunkData(chunks[5]);
		const content6 = message6.content as Array<{ type: string; text: string }>;
		expect(content6[0].text).toBe(' sunny');

		const { message: message7 } = getChunkData(chunks[6]);
		const content7 = message7.content as Array<{ type: string; text: string }>;
		expect(content7[0].text).toBe(' in');

		const { message: message8 } = getChunkData(chunks[7]);
		const content8 = message8.content as Array<{ type: string; text: string }>;
		expect(content8[0].text).toBe(' Tokyo');

		const { message: message9 } = getChunkData(chunks[8]);
		const content9 = message9.content as Array<{ type: string; text: string }>;
		expect(content9[0].text).toBe('!');

		const { message: message10 } = getChunkData(chunks[9]);
		expect(message10.usage_metadata).toEqual({
			input_tokens: 76,
			output_tokens: 8,
			total_tokens: 84,
		});
		const responseMetadata10 = message10.response_metadata as Record<string, unknown>;
		expect(responseMetadata10.finish_reason).toBe('stop');

		for (const chunk of chunks) {
			const { metadata } = getChunkData(chunk);
			expect(metadata).toBeDefined();
			expect(metadata.langgraph_step).toBeDefined();
		}

		expect(nock.isDone()).toBe(true);
	});
});

describe('OpenAIChatModel', () => {
	const baseURL = 'https://api.openai.com/v1';
	const userMessage: Message = { role: 'user', content: [{ type: 'text', text: 'Hi' }] };
	const apiErrorMessage = 'model crashed';
	const traceId = 'trace-1';
	const createModel = () => new OpenAIChatModel('gpt-4o', createMockHttpRequests(), { baseURL });

	const sseEvents = (...events: object[]) => {
		const lines = events.map((event) => `data: ${JSON.stringify(event)}\n\n`);
		return [200, Readable.from(lines), { 'Content-Type': 'text/event-stream' }] as const;
	};

	const collect = async (stream: AsyncIterable<StreamChunk>) => {
		const chunks: StreamChunk[] = [];
		for await (const chunk of stream) chunks.push(chunk);
		return chunks;
	};

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
	});

	describe('reasoning', () => {
		const encryptedContent = 'gAAAA-encrypted';
		const reasoningItem = {
			type: 'reasoning',
			id: 'rs_1',
			summary: [{ type: 'summary_text', text: 'Compare both cities.' }],
			encrypted_content: encryptedContent,
		};
		const replyText = { type: 'text', text: 'Hello' } as const;
		const captureInput = () => {
			const captured: { input?: unknown } = {};
			nock(baseURL)
				.post('/responses', (body: { input: unknown }) => {
					captured.input = body.input;
					return true;
				})
				.reply(200, mockFinalResponse);
			return captured;
		};

		it('should request the encrypted reasoning and return it with the reasoning', async () => {
			let include: unknown;
			nock(baseURL)
				.post('/responses', (body: { include: unknown }) => {
					include = body.include;
					return true;
				})
				.reply(200, { ...mockFinalResponse, output: [reasoningItem, ...mockFinalResponse.output] });

			const result = await createModel().generate([userMessage]);

			expect(include).toEqual(['reasoning.encrypted_content']);
			expect(result.message.content[0]).toEqual({
				type: 'reasoning',
				text: 'Compare both cities.',
				providerMetadata: { encryptedContent },
			});
		});

		it('should stream the complete reasoning with its encrypted payload', async () => {
			nock(baseURL)
				.post('/responses')
				.reply(
					...sseEvents(
						{
							type: 'response.output_item.added',
							output_index: 0,
							item: { ...reasoningItem, summary: [] },
						},
						{ type: 'response.reasoning_summary_text.delta', delta: 'Compare both cities.' },
						{ type: 'response.output_item.done', output_index: 0, item: reasoningItem },
						{ type: 'response.completed', response: { status: 'completed' } },
					),
				);

			const chunks = await collect(createModel().stream([userMessage]));

			expect(chunks.slice(0, 2)).toEqual([
				{ type: 'reasoning-delta', delta: 'Compare both cities.' },
				{
					type: 'content',
					content: {
						type: 'reasoning',
						text: 'Compare both cities.',
						providerMetadata: { encryptedContent },
					},
				},
			]);
		});

		it('should send reasoning with its encrypted payload back as a reasoning item', async () => {
			const captured = captureInput();

			await createModel().generate([
				userMessage,
				{
					role: 'assistant',
					content: [
						{
							type: 'reasoning',
							text: 'Compare both cities.',
							providerMetadata: { encryptedContent },
						},
						replyText,
					],
				},
			]);

			expect(captured.input).toEqual([
				{ role: 'user', content: 'Hi' },
				{
					type: 'reasoning',
					summary: [{ type: 'summary_text', text: 'Compare both cities.' }],
					encrypted_content: encryptedContent,
				},
				{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Hello' }] },
			]);
		});

		describe('when OpenAI rejects the replayed reasoning', () => {
			type Requests = ConstructorParameters<typeof OpenAIChatModel>[1];
			const rejection = new Error('Request failed with status code 400');
			const history: Message[] = [
				userMessage,
				{
					role: 'assistant',
					content: [
						{
							type: 'reasoning',
							text: 'Compare both cities.',
							providerMetadata: { encryptedContent },
						},
						replyText,
					],
				},
			];
			const historyWithoutReasoning = [
				{ role: 'user', content: 'Hi' },
				{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Hello' }] },
			];
			const createRequests = () => ({
				httpRequest: vi
					.fn<Requests['httpRequest']>()
					.mockRejectedValueOnce(rejection)
					.mockResolvedValueOnce({ body: mockFinalResponse }),
				openStream: vi
					.fn<Requests['openStream']>()
					.mockRejectedValueOnce(rejection)
					.mockResolvedValueOnce({
						body: (async function* () {
							yield Buffer.from(
								`data: ${JSON.stringify({ type: 'response.completed', response: { status: 'completed' } })}\n\n`,
							);
						})(),
					}),
			});

			it('should send the request once more without reasoning', async () => {
				const requests = createRequests();

				const result = await new OpenAIChatModel('gpt-4o', requests, { baseURL }).generate(history);

				expect(result.finishReason).toBe('stop');
				expect(requests.httpRequest).toHaveBeenCalledTimes(2);
				expect(requests.httpRequest).toHaveBeenLastCalledWith(
					'POST',
					`${baseURL}/responses`,
					expect.objectContaining({ input: historyWithoutReasoning }),
					undefined,
					undefined,
				);
			});

			it('should open the stream once more without reasoning', async () => {
				const requests = createRequests();

				const chunks = await collect(
					new OpenAIChatModel('gpt-4o', requests, { baseURL }).stream(history),
				);

				expect(chunks).toEqual([{ type: 'finish', finishReason: 'stop', usage: undefined }]);
				expect(requests.openStream).toHaveBeenLastCalledWith(
					'POST',
					`${baseURL}/responses`,
					expect.objectContaining({ input: historyWithoutReasoning }),
					undefined,
					undefined,
				);
			});

			it('should not retry a request that replays no reasoning', async () => {
				const requests = createRequests();

				const result = new OpenAIChatModel('gpt-4o', requests, { baseURL }).generate([userMessage]);

				await expect(result).rejects.toBe(rejection);
				expect(requests.httpRequest).toHaveBeenCalledTimes(1);
			});

			it('should fail an aborted request with the cancellation', async () => {
				const cancellation = new Error('canceled');
				const requests = {
					...createRequests(),
					// Like the n8n request helper, reject at once when the signal is aborted.
					httpRequest: vi.fn<Requests['httpRequest']>(async (...args) => {
						throw args[4]?.aborted ? cancellation : rejection;
					}),
				};
				const controller = new AbortController();
				controller.abort();

				const result = new OpenAIChatModel('gpt-4o', requests, { baseURL }).generate(history, {
					abortSignal: controller.signal,
				});

				await expect(result).rejects.toBe(cancellation);
			});
		});

		it('should leave out reasoning without an encrypted payload', async () => {
			const captured = captureInput();

			await createModel().generate([
				userMessage,
				{
					role: 'assistant',
					content: [{ type: 'reasoning', text: 'Thinking about it' }, replyText],
				},
				{ role: 'user', content: [{ type: 'text', text: 'Again' }] },
			]);

			expect(captured.input, 'reasoning text must not become assistant text').toEqual([
				{ role: 'user', content: 'Hi' },
				{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Hello' }] },
				{ role: 'user', content: 'Again' },
			]);
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
	])('should throw a clear error for %s', async (_, body) => {
		nock(baseURL).post('/responses').reply(200, body, { 'Content-Type': 'application/json' });

		await expect(createModel().generate([userMessage])).rejects.toThrow(
			'Unexpected response from the Responses API: the body has no output array',
		);
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
