import { createAgent } from 'langchain';
import nock from 'nock';

import { LangchainChatModelAdapter } from 'src';

import { OpenAIChatModel } from './openai';
import { createMockHttpRequests, sseReply } from './openai.helpers';
import { weatherTool } from './openai.fixtures';
import { mockStreamFinalResponseEvents, mockStreamToolCallEvents } from './openai.stream-fixtures';

describe('OpenAI Integration with Langchain Agent', () => {
	const baseURL = 'https://api.openai.com/v1';

	beforeEach(() => {
		nock.cleanAll();
	});

	afterEach(() => {
		nock.cleanAll();
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
			.reply(() => sseReply(mockStreamToolCallEvents));

		nock(baseURL)
			.post('/responses', (body) => {
				expect(body).toMatchObject({
					model: 'gpt-4o',
					stream: true,
				});
				return true;
			})
			.reply(() => sseReply(mockStreamFinalResponseEvents));

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

		const textDeltas = chunks.slice(3, 9).map((chunk) => {
			const content = getChunkData(chunk).message.content as Array<{ type: string; text: string }>;
			return content[0].text;
		});
		expect(textDeltas).toEqual(["It's", ' always', ' sunny', ' in', ' Tokyo', '!']);

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
