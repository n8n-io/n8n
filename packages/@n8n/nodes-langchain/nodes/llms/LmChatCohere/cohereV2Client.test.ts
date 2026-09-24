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
				{ role: 'assistant' },
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
});
