import { createAgent, HumanMessage } from 'langchain';
import nock from 'nock';

import {
	createMockHttpRequests,
	createSSEStream,
	mockFinalResponse,
	mockStreamFinalResponseEvents,
	mockStreamToolCallEvents,
	mockToolCallResponse,
	weatherTool,
} from './openai.fixtures';
import { OpenAIChatModel } from '../examples/models/openai';
import { LangchainAdapter } from '../src/adapters/langchain-chat-model';

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
		const chatModel = new LangchainAdapter(openaiChatModel);
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
		const chatModel = new LangchainAdapter(openaiChatModel);
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
		expect(responseMetadata2.finish_reason).toBe('stop');

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
