import { generateText, stepCountIs, streamText, tool } from 'ai';
import nock from 'nock';
import { z } from 'zod';

import { AiSdkLanguageModelAdapter } from 'src';

import { OpenAIChatModel } from './openai';
import {
	createMockHttpRequests,
	createSSEStream,
	mockFinalResponse,
	mockStreamFinalResponseEvents,
	mockStreamToolCallEvents,
	mockToolCallResponse,
} from './openai.fixtures';

const baseURL = 'https://api.openai.com/v1';
const prompt = 'What is the weather in tokyo?';

const tools = {
	get_weather: tool({
		description: 'Get weather for a given city.',
		inputSchema: z.object({ city: z.string() }),
		execute: async ({ city }) => `It's always sunny in ${city}!`,
	}),
};

const sseReply = (events: Array<{ type: string; data: unknown }>) => () =>
	[200, createSSEStream(events), { 'Content-Type': 'text/event-stream' }] as const;

function createModel() {
	return new AiSdkLanguageModelAdapter(
		new OpenAIChatModel('gpt-4o', createMockHttpRequests(), { baseURL }),
	);
}

describe('OpenAI Integration with the AI SDK', () => {
	beforeEach(() => {
		nock.cleanAll();
	});

	afterEach(() => {
		nock.cleanAll();
	});

	it('runs a tool call loop through generateText', async () => {
		nock(baseURL)
			.post('/responses', (body) => {
				expect(body).toMatchObject({
					model: 'gpt-4o',
					input: prompt,
					tools: [
						{
							type: 'function',
							name: 'get_weather',
							description: 'Get weather for a given city.',
							parameters: {
								type: 'object',
								properties: { city: { type: 'string' } },
								required: ['city'],
							},
						},
					],
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
					stream: false,
				});
				return true;
			})
			.reply(200, mockFinalResponse);

		const result = await generateText({
			model: createModel(),
			prompt,
			tools,
			stopWhen: stepCountIs(2),
		});

		expect(result.steps).toHaveLength(2);
		expect(result.steps[0].finishReason).toBe('tool-calls');
		expect(result.steps[0].toolCalls).toMatchObject([
			{
				toolCallId: 'call_YONsRdkCKu8Sh8WGkUiXqlYW',
				toolName: 'get_weather',
				input: { city: 'Tokyo' },
			},
		]);
		expect(result.steps[0].toolResults).toMatchObject([
			{ toolCallId: 'call_YONsRdkCKu8Sh8WGkUiXqlYW', output: "It's always sunny in Tokyo!" },
		]);
		expect(result.text).toBe("It's always sunny in Tokyo!");
		expect(result.finishReason).toBe('stop');
		expect(result.totalUsage).toMatchObject({
			inputTokens: 122,
			outputTokens: 23,
			totalTokens: 145,
		});
		expect(nock.isDone()).toBe(true);
	});

	it('runs a tool call loop through streamText', async () => {
		nock(baseURL)
			.post('/responses', (body) => {
				expect(body).toMatchObject({ model: 'gpt-4o', stream: true });
				return true;
			})
			.reply(sseReply(mockStreamToolCallEvents));

		nock(baseURL)
			.post('/responses', (body) => {
				expect(body).toMatchObject({
					model: 'gpt-4o',
					input: expect.arrayContaining([
						{
							type: 'function_call',
							call_id: 'call_StreamTest123',
							name: 'get_weather',
							arguments: '{"city":"Tokyo"}',
						},
						{
							type: 'function_call_output',
							call_id: 'call_StreamTest123',
							output: "It's always sunny in Tokyo!",
						},
					]),
					stream: true,
				});
				return true;
			})
			.reply(sseReply(mockStreamFinalResponseEvents));

		const result = streamText({
			model: createModel(),
			prompt,
			tools,
			stopWhen: stepCountIs(2),
		});

		const textDeltas: string[] = [];
		const toolInputDeltas: string[] = [];
		for await (const part of result.fullStream) {
			if (part.type === 'error') throw part.error;
			if (part.type === 'text-delta') textDeltas.push(part.text);
			if (part.type === 'tool-input-delta') toolInputDeltas.push(part.delta);
		}

		expect(toolInputDeltas.join('')).toBe('{"city":"Tokyo"}');
		expect(textDeltas).toEqual(["It's", ' always', ' sunny', ' in', ' Tokyo', '!']);

		const steps = await result.steps;
		expect(steps).toHaveLength(2);
		expect(steps[0].finishReason).toBe('tool-calls');
		expect(steps[0].toolCalls).toMatchObject([
			{ toolCallId: 'call_StreamTest123', toolName: 'get_weather', input: { city: 'Tokyo' } },
		]);
		expect(await result.text).toBe("It's always sunny in Tokyo!");
		expect(await result.finishReason).toBe('stop');
		expect(await result.totalUsage).toMatchObject({
			inputTokens: 122,
			outputTokens: 23,
			totalTokens: 145,
		});
		expect(nock.isDone()).toBe(true);
	});
});
