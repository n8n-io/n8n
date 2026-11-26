import { createAgent, HumanMessage } from 'langchain';
import nock from 'nock';

import { LangchainChatModelAdapter } from 'src';

import { OpenAIChatModel } from './fixtures/openai';
import { createMockHttpRequests } from './fixtures/openai.helpers';
import { mockFinalResponse, mockToolCallResponse, weatherTool } from './fixtures/openai.fixtures';

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
});
