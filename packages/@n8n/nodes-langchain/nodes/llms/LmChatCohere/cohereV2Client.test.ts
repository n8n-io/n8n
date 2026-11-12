import { ChatCohere } from '@langchain/cohere';

import { createCohereV2ChatClient } from './cohereV2Client';

describe('Cohere v2 chat client', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('should send each tool result with the matching generated tool call ID', async () => {
		let requestBody: unknown;
		vi.stubGlobal('fetch', async (_input: RequestInfo | URL, init?: RequestInit) => {
			requestBody = JSON.parse(init?.body?.toString() ?? '{}');
			return new Response(JSON.stringify({ text: 'The calculator returned 4.' }), {
				status: 200,
				headers: { 'content-type': 'application/json' },
			});
		});

		const client = createCohereV2ChatClient({ apiKey: 'test-api-key' }) as unknown as {
			chat: (request: unknown) => Promise<unknown>;
		};
		await client.chat({
			message: '',
			chatHistory: [
				{ role: 'USER', message: 'What is 2 + 2?' },
				{
					role: 'CHATBOT',
					message: '',
					toolCalls: [{ name: 'calculator', parameters: { expression: '2 + 2' } }],
				},
			],
			toolResults: [
				{
					call: { name: 'calculator', parameters: { expression: '2 + 2' } },
					outputs: [{ output: '4' }],
				},
			],
			model: 'command-a-03-2025',
		});

		expect(requestBody).toMatchObject({
			messages: [
				{ role: 'user', content: 'What is 2 + 2?' },
				{
					role: 'assistant',
					tool_calls: [
						{
							id: 'tool_call_1_0',
							function: { name: 'calculator', arguments: '{"expression":"2 + 2"}' },
						},
					],
				},
				{ role: 'tool', tool_call_id: 'tool_call_1_0', content: '[{"output":"4"}]' },
			],
		});
	});

	it('should preserve IDs across historical and current results for identical tool calls', async () => {
		let requestBody: unknown;
		vi.stubGlobal('fetch', async (_input: RequestInfo | URL, init?: RequestInit) => {
			requestBody = JSON.parse(init?.body?.toString() ?? '{}');
			return new Response(JSON.stringify({ text: 'Done.' }), {
				status: 200,
				headers: { 'content-type': 'application/json' },
			});
		});

		const client = createCohereV2ChatClient({ apiKey: 'test-api-key' }) as unknown as {
			chat: (request: unknown) => Promise<unknown>;
		};
		await client.chat({
			chatHistory: [
				{
					role: 'CHATBOT',
					toolCalls: [
						{ name: 'calculator', parameters: { expression: '2 + 2' } },
						{ name: 'calculator', parameters: { expression: '2 + 2' } },
					],
				},
				{
					role: 'TOOL',
					toolResults: [
						{
							call: { name: 'calculator', parameters: { expression: '2 + 2' } },
							outputs: [{ output: '4' }],
						},
					],
				},
			],
			toolResults: [
				{
					call: { name: 'calculator', parameters: { expression: '2 + 2' } },
					outputs: [{ output: '4' }],
				},
			],
			model: 'command-a-03-2025',
		});

		expect(requestBody).toMatchObject({
			messages: [
				{
					role: 'assistant',
					tool_calls: [{ id: 'tool_call_0_0' }, { id: 'tool_call_0_1' }],
				},
				{ role: 'tool', tool_call_id: 'tool_call_0_0', content: '[{"output":"4"}]' },
				{ role: 'tool', tool_call_id: 'tool_call_0_1', content: '[{"output":"4"}]' },
			],
		});
	});

	it('should omit a result that cannot be matched to a tool call', async () => {
		let requestBody: unknown;
		vi.stubGlobal('fetch', async (_input: RequestInfo | URL, init?: RequestInit) => {
			requestBody = JSON.parse(init?.body?.toString() ?? '{}');
			return new Response(JSON.stringify({ text: 'Done.' }), {
				status: 200,
				headers: { 'content-type': 'application/json' },
			});
		});

		const client = createCohereV2ChatClient({ apiKey: 'test-api-key' }) as unknown as {
			chat: (request: unknown) => Promise<unknown>;
		};
		await client.chat({
			chatHistory: [
				{
					role: 'CHATBOT',
					toolCalls: [{ name: 'calculator', parameters: { expression: '2 + 2' } }],
				},
			],
			toolResults: [
				{
					call: { name: 'weather', parameters: { city: 'Bangalore' } },
					outputs: [{ output: 'sunny' }],
				},
			],
			model: 'command-a-03-2025',
		});

		expect(requestBody).toMatchObject({ messages: [{ role: 'assistant' }] });
		expect((requestBody as { messages: Array<{ role: string }> }).messages).not.toContainEqual(
			expect.objectContaining({ role: 'tool' }),
		);
	});

	// AGENT-1557: Streamed tool calls must remain valid for the agent to run tools.
	it.each([false, true])('should return valid tool calls with streaming=%s', async (streaming) => {
		const toolCall = {
			id: 'call_1',
			type: 'function',
			function: { name: 'calculator', arguments: '' },
		};
		const usage = { tokens: { input_tokens: 5, output_tokens: 3 } };
		const events = [
			{
				type: 'message-start',
				id: 'message-1',
				delta: { message: { role: 'assistant' } },
			},
			{
				type: 'tool-call-start',
				index: 0,
				delta: { message: { tool_calls: toolCall } },
			},
			{
				type: 'tool-call-delta',
				index: 0,
				delta: { message: { tool_calls: { function: { arguments: '{"expression":' } } } },
			},
			{
				type: 'tool-call-delta',
				index: 0,
				delta: { message: { tool_calls: { function: { arguments: '"2 + 2"}' } } } },
			},
			{ type: 'tool-call-end', index: 0 },
			{ type: 'message-end', delta: { finish_reason: 'TOOL_CALL', usage } },
		];
		const body = streaming
			? events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('')
			: JSON.stringify({
					id: 'message-1',
					message: {
						role: 'assistant',
						content: [],
						tool_calls: [
							{
								...toolCall,
								function: { name: 'calculator', arguments: '{"expression":"2 + 2"}' },
							},
						],
					},
					finish_reason: 'TOOL_CALL',
					usage,
				});
		vi.stubGlobal('fetch', async () => {
			return new Response(body, {
				headers: { 'content-type': streaming ? 'text/event-stream' : 'application/json' },
			});
		});

		const model = new ChatCohere({
			client: createCohereV2ChatClient({ apiKey: 'test-api-key' }),
			model: 'command-a-03-2025',
			streaming,
			maxRetries: 0,
		}).bindTools([
			{
				name: 'calculator',
				description: 'Evaluate a math expression',
				parameterDefinitions: { expression: { type: 'string', required: true } },
			},
		]);
		const result = await model.invoke('What is 2 + 2?');

		expect(result.usage_metadata).toEqual({ input_tokens: 5, output_tokens: 3, total_tokens: 8 });
		expect(result.tool_calls).toEqual([
			expect.objectContaining({
				id: expect.any(String),
				name: 'calculator',
				args: { expression: '2 + 2' },
			}),
		]);
		expect(result.invalid_tool_calls).toEqual([]);
	});
});
