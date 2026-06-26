import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { z } from 'zod';

import { OpenAiAccountChatModel } from '../LMChatOpenAi/OpenAiAccountChatModel';

const JWT_ACCOUNT_CLAIM = 'https://api.openai.com/auth';

function makeOpenAiAccountToken(accountId: string) {
	const payload = Buffer.from(
		JSON.stringify({ [JWT_ACCOUNT_CLAIM]: { chatgpt_account_id: accountId } }),
	).toString('base64url');

	return `test-header.${payload}.test-signature`;
}

const accessToken = makeOpenAiAccountToken('account-1');

function sseResponse(events: Array<Record<string, unknown>>, separator = '\n\n'): Response {
	const encoder = new TextEncoder();
	const body = new ReadableStream<Uint8Array>({
		start(controller) {
			for (const event of events) {
				controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}${separator}`));
			}
			controller.close();
		},
	});

	return new Response(body, {
		status: 200,
		headers: { 'content-type': 'text/event-stream' },
	});
}

describe('OpenAiAccountChatModel', () => {
	const originalFetch = global.fetch;

	afterEach(() => {
		global.fetch = originalFetch;
		jest.restoreAllMocks();
	});

	it('posts chat messages to the ChatGPT Codex responses backend', async () => {
		const fetchMock = jest.fn().mockResolvedValue(
			sseResponse([
				{ type: 'response.output_text.delta', delta: 'hello' },
				{
					type: 'response.completed',
					response: { id: 'resp_1', usage: { input_tokens: 7, output_tokens: 2 }, output: [] },
				},
			]),
		);
		global.fetch = fetchMock;

		const model = new OpenAiAccountChatModel({
			accessToken,
			model: 'gpt-5-mini',
			timeout: 1000,
			maxOutputTokens: 128,
			sessionId: 'session-1',
			installationId: 'install-1',
		});

		const result = await model.invoke([
			new SystemMessage('Be short'),
			new HumanMessage('Say hello'),
		]);

		expect(result.content).toBe('hello');
		expect(fetchMock).toHaveBeenCalledWith(
			'https://chatgpt.com/backend-api/codex/responses',
			expect.objectContaining({
				method: 'POST',
				headers: expect.objectContaining({
					Authorization: `Bearer ${accessToken}`,
					'chatgpt-account-id': 'account-1',
					'OpenAI-Beta': 'responses=experimental',
					originator: 'codex_cli_rs',
					session_id: 'session-1',
					'x-client-request-id': 'session-1',
					'x-codex-window-id': 'session-1:0',
					'x-codex-installation-id': 'install-1',
				}),
			}),
		);

		const request = fetchMock.mock.calls[0]?.[1] as { body?: string };
		expect(JSON.parse(request.body ?? '{}')).toMatchObject({
			model: 'gpt-5-mini',
			store: false,
			stream: true,
			max_output_tokens: 128,
			instructions: 'Be short',
			input: [{ role: 'user', content: [{ type: 'input_text', text: 'Say hello' }] }],
			client_metadata: {
				'x-codex-installation-id': 'install-1',
				'x-codex-window-id': 'session-1:0',
			},
			tool_choice: 'auto',
		});
	});

	it('parses CRLF-framed SSE responses', async () => {
		const fetchMock = jest.fn().mockResolvedValue(
			sseResponse(
				[
					{ type: 'response.output_text.delta', delta: 'hello' },
					{
						type: 'response.completed',
						response: { id: 'resp_1', usage: { input_tokens: 7, output_tokens: 2 }, output: [] },
					},
				],
				'\r\n\r\n',
			),
		);
		global.fetch = fetchMock;

		const model = new OpenAiAccountChatModel({ accessToken, model: 'gpt-5-mini' });

		const result = await model.invoke([new HumanMessage('Say hello')]);

		expect(result.content).toBe('hello');
	});

	it('maps bound LangChain tools to Codex function tools and returns tool calls', async () => {
		const fetchMock = jest.fn().mockResolvedValue(
			sseResponse([
				{
					type: 'response.output_item.added',
					item: {
						type: 'function_call',
						call_id: 'call_1',
						name: 'lookup_weather',
						arguments: '{}',
					},
				},
				{
					type: 'response.function_call_arguments.done',
					call_id: 'call_1',
					arguments: '{"city":"Paris"}',
				},
				{
					type: 'response.completed',
					response: { id: 'resp_2', usage: { input_tokens: 8, output_tokens: 3 }, output: [] },
				},
			]),
		);
		global.fetch = fetchMock;

		const model = new OpenAiAccountChatModel({ accessToken, model: 'gpt-5-mini' }).bindTools([
			{
				name: 'lookup_weather',
				description: 'Look up weather',
				schema: z.object({
					city: z.string().optional(),
				}),
			},
		]);

		const result = await model.invoke([new HumanMessage('weather in Paris')]);

		expect(result).toBeInstanceOf(AIMessage);
		expect(result.tool_calls).toEqual([
			{
				id: 'call_1',
				name: 'lookup_weather',
				args: { city: 'Paris' },
			},
		]);

		const request = fetchMock.mock.calls[0]?.[1] as { body?: string };
		expect(JSON.parse(request.body ?? '{}')).toMatchObject({
			tools: [
				{
					type: 'function',
					name: 'lookup_weather',
					parameters: {
						type: 'object',
						properties: {
							city: { type: ['string', 'null'] },
						},
						required: ['city'],
						additionalProperties: false,
					},
					strict: true,
				},
			],
			tool_choice: 'auto',
			parallel_tool_calls: true,
		});
	});

	it('sends strict object parameters for tools without explicit properties', async () => {
		const fetchMock = jest.fn().mockResolvedValue(
			sseResponse([
				{
					type: 'response.completed',
					response: { id: 'resp_3', usage: { input_tokens: 4, output_tokens: 1 }, output: [] },
				},
			]),
		);
		global.fetch = fetchMock;

		const model = new OpenAiAccountChatModel({ accessToken, model: 'gpt-5-mini' }).bindTools([
			{
				name: 'Code_Tool',
				description: 'Run simple code',
				schema: {
					type: 'object',
				},
			},
		]);

		await model.invoke([new HumanMessage('uppercase query')]);

		const request = fetchMock.mock.calls[0]?.[1] as { body?: string };
		expect(JSON.parse(request.body ?? '{}')).toMatchObject({
			tools: [
				{
					type: 'function',
					name: 'Code_Tool',
					parameters: {
						type: 'object',
						properties: {},
						required: [],
						additionalProperties: false,
					},
					strict: true,
				},
			],
		});
	});

	it('preserves simple LangChain tool input schemas', async () => {
		const fetchMock = jest.fn().mockResolvedValue(
			sseResponse([
				{
					type: 'response.completed',
					response: { id: 'resp_4', usage: { input_tokens: 4, output_tokens: 1 }, output: [] },
				},
			]),
		);
		global.fetch = fetchMock;

		const model = new OpenAiAccountChatModel({ accessToken, model: 'gpt-5-mini' }).bindTools([
			{
				name: 'Code_Tool',
				description: 'Run simple code',
				schema: z.object({ input: z.string().optional() }).transform((value) => value.input),
			},
		]);

		await model.invoke([new HumanMessage('uppercase query')]);

		const request = fetchMock.mock.calls[0]?.[1] as { body?: string };
		expect(JSON.parse(request.body ?? '{}')).toMatchObject({
			tools: [
				{
					type: 'function',
					name: 'Code_Tool',
					parameters: {
						type: 'object',
						properties: {
							input: { type: ['string', 'null'] },
						},
						required: ['input'],
						additionalProperties: false,
					},
					strict: true,
				},
			],
		});
	});

	it('uses previous_response_id for incremental follow-up prompts', async () => {
		const fetchMock = jest
			.fn()
			.mockResolvedValueOnce(
				sseResponse([
					{
						type: 'response.completed',
						response: { id: 'resp_1', usage: { input_tokens: 3, output_tokens: 1 }, output: [] },
					},
				]),
			)
			.mockResolvedValueOnce(
				sseResponse([
					{ type: 'response.output_text.delta', delta: 'next' },
					{
						type: 'response.completed',
						response: { id: 'resp_2', usage: { input_tokens: 2, output_tokens: 1 }, output: [] },
					},
				]),
			);
		global.fetch = fetchMock;

		const model = new OpenAiAccountChatModel({
			accessToken,
			model: 'gpt-5-mini',
			sessionId: 'session-1',
			installationId: 'install-1',
		});

		await model.invoke([new SystemMessage('Be short'), new HumanMessage('first')]);
		await model.invoke([
			new SystemMessage('Be short'),
			new HumanMessage('first'),
			new AIMessage(''),
			new HumanMessage('second'),
		]);

		const secondRequest = fetchMock.mock.calls[1]?.[1] as { body?: string };
		expect(JSON.parse(secondRequest.body ?? '{}')).toMatchObject({
			previous_response_id: 'resp_1',
			input: [{ role: 'user', content: [{ type: 'input_text', text: 'second' }] }],
		});
	});

	it('streams tool argument deltas for LangChain streaming agents', async () => {
		const fetchMock = jest.fn().mockResolvedValue(
			sseResponse([
				{
					type: 'response.output_item.added',
					item: { type: 'function_call', call_id: 'call_1', name: 'lookup_weather', arguments: '' },
				},
				{
					type: 'response.function_call_arguments.delta',
					call_id: 'call_1',
					delta: '{"city"',
				},
				{
					type: 'response.function_call_arguments.delta',
					call_id: 'call_1',
					delta: ':"Paris"}',
				},
				{
					type: 'response.completed',
					response: { id: 'resp_3', usage: { input_tokens: 6, output_tokens: 4 }, output: [] },
				},
			]),
		);
		global.fetch = fetchMock;

		const model = new OpenAiAccountChatModel({ accessToken, model: 'gpt-5-mini' });

		const chunks = [];
		for await (const chunk of await model.stream([new HumanMessage('weather in Paris')])) {
			chunks.push(chunk);
		}

		expect(chunks.some((chunk) => chunk.tool_call_chunks?.[0]?.args === '{"city"')).toBe(true);
		expect(chunks.some((chunk) => chunk.tool_calls?.[0]?.args.city === 'Paris')).toBe(true);
	});

	it('preserves provider finish metadata while streaming', async () => {
		const fetchMock = jest.fn().mockResolvedValue(
			sseResponse([
				{ type: 'response.output_text.delta', delta: 'partial' },
				{
					type: 'response.completed',
					response: {
						id: 'resp_4',
						status: 'incomplete',
						incomplete_details: { reason: 'max_output_tokens' },
						usage: { input_tokens: 6, output_tokens: 4 },
						output: [{ type: 'message', phase: 'final_answer' }],
					},
				},
			]),
		);
		global.fetch = fetchMock;

		const model = new OpenAiAccountChatModel({ accessToken, model: 'gpt-5-mini' });

		const chunks = [];
		for await (const chunk of await model.stream([new HumanMessage('write a long answer')])) {
			chunks.push(chunk);
		}

		const finishChunk = chunks.find((chunk) => chunk.response_metadata?.finishReason === 'length');
		expect(finishChunk?.additional_kwargs).toMatchObject({ phase: 'final_answer' });
		expect(finishChunk?.usage_metadata).toMatchObject({
			input_tokens: 6,
			output_tokens: 4,
			total_tokens: 10,
		});
	});
});
