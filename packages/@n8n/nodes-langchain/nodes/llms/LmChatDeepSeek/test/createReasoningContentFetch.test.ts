import { createReasoningContentFetch } from '../createReasoningContentFetch';

describe('createReasoningContentFetch', () => {
	function buildJsonResponse(body: unknown): Response {
		return new Response(JSON.stringify(body), {
			status: 200,
			headers: { 'content-type': 'application/json' },
		});
	}

	function buildSseResponse(events: string[]): Response {
		const encoder = new TextEncoder();
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				for (const e of events) controller.enqueue(encoder.encode(e));
				controller.close();
			},
		});
		return new Response(stream, {
			status: 200,
			headers: { 'content-type': 'text/event-stream' },
		});
	}

	it('does not modify the request when no reasoning content has been seen', async () => {
		const baseFetch = jest
			.fn()
			.mockResolvedValue(
				new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }),
			);
		const reasoningFetch = createReasoningContentFetch(baseFetch);

		await reasoningFetch('https://api.deepseek.com/chat/completions', {
			method: 'POST',
			body: JSON.stringify({
				messages: [
					{ role: 'user', content: 'Hi' },
					{
						role: 'assistant',
						tool_calls: [{ id: 'call_1', type: 'function' }],
					},
				],
			}),
		});

		expect(baseFetch).toHaveBeenCalledTimes(1);
		const init = baseFetch.mock.calls[0][1] as RequestInit;
		const body = JSON.parse(init.body as string);
		expect(body.messages[1].reasoning_content).toBeUndefined();
	});

	it('captures reasoning_content from a JSON response and injects it on the next request', async () => {
		const baseFetch = jest
			.fn<Promise<Response>, [unknown, RequestInit | undefined]>()
			.mockResolvedValueOnce(
				buildJsonResponse({
					choices: [
						{
							index: 0,
							message: {
								role: 'assistant',
								content: '',
								reasoning_content: 'Thinking step 1',
								tool_calls: [{ id: 'call_abc', type: 'function' }],
							},
						},
					],
				}),
			)
			.mockResolvedValueOnce(
				buildJsonResponse({ choices: [{ message: { role: 'assistant', content: 'ok' } }] }),
			);

		const reasoningFetch = createReasoningContentFetch(baseFetch);

		await reasoningFetch('https://api.deepseek.com/chat/completions', {
			method: 'POST',
			body: JSON.stringify({ messages: [{ role: 'user', content: 'Hi' }] }),
		});

		await reasoningFetch('https://api.deepseek.com/chat/completions', {
			method: 'POST',
			body: JSON.stringify({
				messages: [
					{ role: 'user', content: 'Hi' },
					{
						role: 'assistant',
						content: '',
						tool_calls: [{ id: 'call_abc', type: 'function' }],
					},
					{ role: 'tool', tool_call_id: 'call_abc', content: 'result' },
				],
			}),
		});

		const secondInit = baseFetch.mock.calls[1][1] as RequestInit;
		const secondBody = JSON.parse(secondInit.body as string);
		expect(secondBody.messages[1].reasoning_content).toBe('Thinking step 1');
	});

	it('does not overwrite an existing reasoning_content on outgoing messages', async () => {
		const baseFetch = jest
			.fn<Promise<Response>, [unknown, RequestInit | undefined]>()
			.mockResolvedValueOnce(
				buildJsonResponse({
					choices: [
						{
							message: {
								role: 'assistant',
								reasoning_content: 'captured',
								tool_calls: [{ id: 'call_1' }],
							},
						},
					],
				}),
			)
			.mockResolvedValueOnce(buildJsonResponse({}));

		const reasoningFetch = createReasoningContentFetch(baseFetch);

		await reasoningFetch('https://x', { method: 'POST', body: '{}' });
		await reasoningFetch('https://x', {
			method: 'POST',
			body: JSON.stringify({
				messages: [
					{
						role: 'assistant',
						reasoning_content: 'preexisting',
						tool_calls: [{ id: 'call_1' }],
					},
				],
			}),
		});

		const init = baseFetch.mock.calls[1][1] as RequestInit;
		expect(JSON.parse(init.body as string).messages[0].reasoning_content).toBe('preexisting');
	});

	it('captures reasoning_content from an SSE stream and re-injects it', async () => {
		const events = [
			`data: ${JSON.stringify({
				choices: [{ index: 0, delta: { reasoning_content: 'thinking ' } }],
			})}\n`,
			`data: ${JSON.stringify({
				choices: [{ index: 0, delta: { reasoning_content: 'about it' } }],
			})}\n`,
			`data: ${JSON.stringify({
				choices: [
					{
						index: 0,
						delta: { tool_calls: [{ index: 0, id: 'call_stream', type: 'function' }] },
					},
				],
			})}\n`,
			'data: [DONE]\n',
		];

		const baseFetch = jest
			.fn<Promise<Response>, [unknown, RequestInit | undefined]>()
			.mockResolvedValueOnce(buildSseResponse(events))
			.mockResolvedValueOnce(buildSseResponse([]));

		const reasoningFetch = createReasoningContentFetch(baseFetch);

		const firstResponse = await reasoningFetch('https://x', { method: 'POST', body: '{}' });
		// Drain the stream so the parser sees all events.
		const reader = firstResponse.body!.getReader();
		while (!(await reader.read()).done) {
			// drain
		}

		await reasoningFetch('https://x', {
			method: 'POST',
			body: JSON.stringify({
				messages: [
					{
						role: 'assistant',
						tool_calls: [{ id: 'call_stream', type: 'function' }],
					},
				],
			}),
		});

		// Allow the async SSE parser microtasks to settle.
		await new Promise((r) => setImmediate(r));

		const init = baseFetch.mock.calls[1][1] as RequestInit;
		const body = JSON.parse(init.body as string);
		expect(body.messages[0].reasoning_content).toBe('thinking about it');
	});

	it('passes through non-JSON, non-SSE responses unchanged', async () => {
		const original = new Response('plain', {
			status: 200,
			headers: { 'content-type': 'text/plain' },
		});
		const baseFetch = jest.fn().mockResolvedValue(original);

		const reasoningFetch = createReasoningContentFetch(baseFetch);
		const result = await reasoningFetch('https://x');
		expect(result).toBe(original);
	});

	it('does not interfere when the request body is not valid JSON', async () => {
		const baseFetch = jest
			.fn<Promise<Response>, [unknown, RequestInit | undefined]>()
			.mockResolvedValueOnce(
				buildJsonResponse({
					choices: [
						{
							message: {
								role: 'assistant',
								reasoning_content: 'r',
								tool_calls: [{ id: 'call_1' }],
							},
						},
					],
				}),
			)
			.mockResolvedValueOnce(buildJsonResponse({}));

		const reasoningFetch = createReasoningContentFetch(baseFetch);

		await reasoningFetch('https://x', { method: 'POST', body: '{}' });
		await reasoningFetch('https://x', { method: 'POST', body: 'not-json' });

		expect(baseFetch.mock.calls[1][1]?.body).toBe('not-json');
	});
});
