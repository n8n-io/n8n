/**
 * Regressions for the automatic OpenAI API-style selection, run against the REAL
 * SDK: no provider is mocked here, so `createModel` builds the actual
 * `@ai-sdk/openai` adapters and the real `ai` runtime drives them. Only the
 * transport and the URL download are faked, and the credentials are not real.
 *
 * Generation goes through `generateText`. The streaming cases call the built
 * model's `doStream` directly, so an assertion targets the adapter's own stream
 * parts instead of `streamText`'s error-part lifecycle.
 */
import { generateText } from 'ai';

import { createModel } from '../model/model-factory';

/** The built model, with the call options left loose so a test can drive `doStream`. */
type EndpointModel = {
	doStream: (options: unknown) => Promise<{ stream: ReadableStream<unknown> }>;
};

type Route = { status?: number; body?: string; contentType?: string; throws?: Error };
type Call = { path: string; headers: Headers; body: Record<string, unknown> };

const PROXY = 'https://proxy.example/v1';
const CHAT_ONLY = 'http://127.0.0.1:1234/v1';
const PROMPT = [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }];

const json = (body: unknown): Route => ({
	status: 200,
	body: JSON.stringify(body),
	contentType: 'application/json',
});

const sse = (frames: unknown[]): Route => ({
	status: 200,
	body: frames.map((f) => `data: ${JSON.stringify(f)}\n\n`).join('') + 'data: [DONE]\n\n',
	contentType: 'text/event-stream',
});

const RESPONSES_OK = json({
	id: 'resp_1',
	created_at: 0,
	model: 'gpt-5.6',
	output: [
		{
			type: 'message',
			role: 'assistant',
			id: 'msg_1',
			content: [{ type: 'output_text', text: 'from responses', annotations: [] }],
		},
	],
	usage: { input_tokens: 1, output_tokens: 1 },
});

const CHAT_OK = json({
	id: 'chatcmpl_1',
	created: 0,
	model: 'gpt-5.6',
	choices: [
		{ index: 0, message: { role: 'assistant', content: 'from chat' }, finish_reason: 'stop' },
	],
	usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
});

const RESPONSES_STREAM_OK = sse([
	{ type: 'response.created', response: { id: 'resp_1', created_at: 0, model: 'gpt-5.6' } },
	{ type: 'response.output_item.added', output_index: 0, item: { type: 'message', id: 'msg_1' } },
	{ type: 'response.output_text.delta', item_id: 'msg_1', delta: 'from responses' },
	{ type: 'response.completed', response: { usage: { input_tokens: 1, output_tokens: 1 } } },
]);

const CHAT_STREAM_OK = sse([
	{
		id: 'chatcmpl_1',
		created: 0,
		model: 'gpt-5.6',
		choices: [{ index: 0, delta: { role: 'assistant', content: 'from chat' } }],
	},
	{
		id: 'chatcmpl_1',
		created: 0,
		model: 'gpt-5.6',
		choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
	},
]);

/** 404 and 405 answers that really do mean "this server has no /responses route". */
const NO_ROUTE_ANSWERS: Array<[string, Route]> = [
	['an empty 404 body', { status: 404 }],
	[
		'a JSON 404 detail',
		{ status: 404, body: '{"detail":"Not Found"}', contentType: 'application/json' },
	],
	['a 405 from a strict router', { status: 405 }],
];

/** What OpenAI sends inside an HTTP 200 stream when the model alias is unknown. */
const MODEL_NOT_FOUND_FRAME = {
	type: 'error',
	sequence_number: 0,
	code: 'model_not_found',
	message: 'Model alias does not exist',
};

/** Parses a fetch body sent as a JSON string; anything else (stream, form data) yields `{}`. */
function parseJsonBody(body: BodyInit | null | undefined): Record<string, unknown> {
	if (typeof body !== 'string') return {};
	try {
		return JSON.parse(body) as Record<string, unknown>;
	} catch {
		return {};
	}
}

/** Mock HTTP: `routes` maps a request path to the answer the fake server gives. */
function fakeEndpoint(routes: Record<string, Route>) {
	const calls: Call[] = [];
	const fetchFn = (async (url: unknown, init?: RequestInit) => {
		const { pathname } = new URL(String(url));
		calls.push({
			path: pathname,
			headers: new Headers(init?.headers),
			body: parseJsonBody(init?.body),
		});
		// An unlisted path is a server that does not have that route at all.
		const route = routes[pathname] ?? { status: 404 };
		await Promise.resolve();
		if (route.throws) throw route.throws;
		return new Response(route.body ?? '', {
			status: route.status ?? 404,
			headers: route.contentType ? { 'content-type': route.contentType } : undefined,
		});
	}) as unknown as typeof globalThis.fetch;
	return { fetchFn, calls };
}

const paths = (calls: Call[]) => calls.map((call) => call.path);

const build = (creds: Record<string, unknown>, fetchFn: typeof globalThis.fetch) =>
	createModel({ id: 'openai/gpt-5.6', apiKey: 'sk-fake', ...creds }, fetchFn);

async function readStream(stream: ReadableStream<unknown>) {
	const reader = stream.getReader();
	const parts: Array<Record<string, unknown>> = [];
	for (;;) {
		const { done, value } = await reader.read();
		if (done) return parts;
		parts.push(value as Record<string, unknown>);
	}
}

describe('openai api-style selection (real SDK)', () => {
	it('generates through /responses on a custom endpoint that serves it', async () => {
		// The reported failure: a proxy in front of real OpenAI was pinned to
		// /chat/completions, which rejects reasoning effort once tools are attached.
		const { fetchFn, calls } = fakeEndpoint({ '/v1/responses': RESPONSES_OK });

		const { text } = await generateText({ model: build({ url: PROXY }, fetchFn), prompt: 'hi' });

		expect(text).toBe('from responses');
		expect(paths(calls)).toEqual(['/v1/responses']);
	});

	it('streams through /responses on a custom endpoint that serves it', async () => {
		const { fetchFn, calls } = fakeEndpoint({ '/v1/responses': RESPONSES_STREAM_OK });
		const model = build({ url: PROXY }, fetchFn) as unknown as EndpointModel;

		const parts = await readStream((await model.doStream({ prompt: PROMPT })).stream);

		expect(parts).toContainEqual(
			expect.objectContaining({ type: 'text-delta', delta: 'from responses' }),
		);
		expect(paths(calls)).toEqual(['/v1/responses']);
	});

	it('moves to /chat/completions when there is no /responses route, then stays there', async () => {
		// OpenAI-COMPATIBLE servers (LM Studio, vLLM, Ollama) must keep working.
		const { fetchFn, calls } = fakeEndpoint({ '/v1/chat/completions': CHAT_OK });
		const model = build({ url: CHAT_ONLY }, fetchFn);

		expect((await generateText({ model, prompt: 'hi' })).text).toBe('from chat');
		expect((await generateText({ model, prompt: 'hi' })).text).toBe('from chat');
		expect(paths(calls)).toEqual(['/v1/responses', '/v1/chat/completions', '/v1/chat/completions']);
	});

	it('moves to /chat/completions on a streaming call too', async () => {
		const { fetchFn, calls } = fakeEndpoint({ '/v1/chat/completions': CHAT_STREAM_OK });
		const model = build({ url: CHAT_ONLY }, fetchFn) as unknown as EndpointModel;

		const parts = await readStream((await model.doStream({ prompt: PROMPT })).stream);

		expect(parts).toContainEqual(
			expect.objectContaining({ type: 'text-delta', delta: 'from chat' }),
		);
		expect(paths(calls)).toEqual(['/v1/responses', '/v1/chat/completions']);
	});

	it.each(NO_ROUTE_ANSWERS)('reads %s as "no /responses route"', async (_label, route) => {
		const { fetchFn, calls } = fakeEndpoint({
			'/v1/responses': route,
			'/v1/chat/completions': CHAT_OK,
		});

		const { text } = await generateText({ model: build({ url: PROXY }, fetchFn), prompt: 'hi' });

		expect(text).toBe('from chat');
		expect(paths(calls)).toEqual(['/v1/responses', '/v1/chat/completions']);
	});

	it('downloads a PDF URL that only /responses accepts, and leaves image URLs alone', async () => {
		// The Responses API takes PDF URLs and chat completions does not, so a
		// capability advertised before the endpoint answered must hold for both.
		const { fetchFn, calls } = fakeEndpoint({ '/v1/chat/completions': CHAT_OK });
		const downloaded: string[] = [];

		const { text } = await generateText({
			model: build({ url: CHAT_ONLY }, fetchFn),
			messages: [
				{
					role: 'user',
					content: [
						{
							type: 'file',
							data: new URL('https://files.example/doc.pdf'),
							mediaType: 'application/pdf',
						},
						{
							type: 'file',
							data: new URL('https://files.example/pic.png'),
							mediaType: 'image/png',
						},
					],
				},
			],
			experimental_download: async (requested) => {
				const results = requested.map((request) => {
					if (request.isUrlSupportedByModel) return null;
					downloaded.push(request.url.href);
					return { data: new Uint8Array([1, 2, 3]), mediaType: 'application/pdf' };
				});
				return await Promise.resolve(results);
			},
		});

		expect(downloaded).toEqual(['https://files.example/doc.pdf']);
		expect(text).toBe('from chat');
		const chatBody = JSON.stringify(calls[calls.length - 1]?.body);
		expect(chatBody).toContain('data:application/pdf;base64,');
		expect(chatBody).toContain('https://files.example/pic.png');
	});

	/** Full media types the installed chat converter accepts as inline audio. */
	const CHAT_ONLY_AUDIO: Array<[string, string]> = [
		['audio/wav', 'wav'],
		['audio/mp3', 'mp3'],
	];

	it.each(CHAT_ONLY_AUDIO)(
		'routes inline %s audio straight to chat, skipping /responses',
		async (mediaType, format) => {
			// The Responses converter in the installed SDK has no audio branch at
			// all, so it throws `UnsupportedFunctionalityError` before a request is
			// made; only chat accepts inline audio.
			const { fetchFn, calls } = fakeEndpoint({ '/v1/chat/completions': CHAT_OK });

			const { text } = await generateText({
				model: build({ url: PROXY }, fetchFn),
				messages: [
					{ role: 'user', content: [{ type: 'file', data: new Uint8Array([1, 2, 3]), mediaType }] },
				],
			});

			expect(text).toBe('from chat');
			expect(paths(calls)).toEqual(['/v1/chat/completions']);
			expect(JSON.stringify(calls[0]?.body)).toContain(`"format":"${format}"`);
		},
	);

	it('still tries /responses first for a normal prompt after an audio-routed call', async () => {
		// Audio-only routing must not permanently pin the model instance to chat.
		const { fetchFn, calls } = fakeEndpoint({
			'/v1/chat/completions': CHAT_OK,
			'/v1/responses': RESPONSES_OK,
		});
		const model = build({ url: PROXY }, fetchFn);

		const audioResult = await generateText({
			model,
			messages: [
				{
					role: 'user',
					content: [{ type: 'file', data: new Uint8Array([1, 2, 3]), mediaType: 'audio/wav' }],
				},
			],
		});
		const textResult = await generateText({ model, prompt: 'hi' });

		expect(audioResult.text).toBe('from chat');
		expect(textResult.text).toBe('from responses');
		expect(paths(calls)).toEqual(['/v1/chat/completions', '/v1/responses']);
	});

	it('falls back to chat on a llama.cpp-style 404 answered in the OpenAI error format', async () => {
		// A real, non-stream HTTP 404 with this exact code and message is an
		// unambiguous "no /responses route" answer, not a model error.
		const { fetchFn, calls } = fakeEndpoint({
			'/v1/responses': {
				status: 404,
				body: JSON.stringify({ error: { code: 404, message: 'File Not Found' } }),
				contentType: 'application/json',
			},
			'/v1/chat/completions': CHAT_OK,
		});

		const { text } = await generateText({ model: build({ url: PROXY }, fetchFn), prompt: 'hi' });

		expect(text).toBe('from chat');
		expect(paths(calls)).toEqual(['/v1/responses', '/v1/chat/completions']);
	});

	it('keeps the same error frame when it arrives as an HTTP 200 SSE stream instead', async () => {
		// Same code and message, but as a stream frame: the content type and the
		// frame's flat shape (no nested `error` record) both say this was
		// synthesized from a stream, not read from a real HTTP error response.
		const { fetchFn, calls } = fakeEndpoint({
			'/v1/responses': sse([
				{ type: 'error', sequence_number: 0, code: '404', message: 'File Not Found' },
			]),
			'/v1/chat/completions': CHAT_OK,
		});
		const model = build({ url: PROXY }, fetchFn) as unknown as EndpointModel;

		await expect(model.doStream({ prompt: PROMPT })).rejects.toThrow('File Not Found');
		expect(paths(calls)).toEqual(['/v1/responses']);
	});

	it('keeps a nested-error stream frame even without a text/event-stream header', async () => {
		// The frame's own `type: 'error'` discriminator must mark this as a stream
		// error even though it nests an `error` record and the header is absent.
		const frame = {
			type: 'error',
			sequence_number: 0,
			error: { type: 'server_error', code: '404', message: 'File Not Found' },
		};
		const { fetchFn, calls } = fakeEndpoint({
			'/v1/responses': { status: 200, body: `data: ${JSON.stringify(frame)}\n\ndata: [DONE]\n\n` },
			'/v1/chat/completions': CHAT_OK,
		});
		const model = build({ url: PROXY }, fetchFn) as unknown as EndpointModel;

		await expect(model.doStream({ prompt: PROMPT })).rejects.toThrow('File Not Found');
		expect(paths(calls)).toEqual(['/v1/responses']);
	});

	it('keeps a model error that arrived inside an HTTP 200 stream', async () => {
		// The SDK maps this frame onto statusCode 404, but the route did work, so a
		// retry would replace a real model error with an unrelated chat error.
		const { fetchFn, calls } = fakeEndpoint({
			'/v1/responses': sse([MODEL_NOT_FOUND_FRAME]),
			'/v1/chat/completions': {
				status: 400,
				body: '{"error":{"message":"Chat API is disabled","type":"invalid_request_error"}}',
				contentType: 'application/json',
			},
		});
		const model = build({ url: PROXY }, fetchFn) as unknown as EndpointModel;

		await expect(model.doStream({ prompt: PROMPT })).rejects.toThrow('Model alias does not exist');
		await expect(model.doStream({ prompt: PROMPT })).rejects.toThrow('Model alias does not exist');
		expect(paths(calls)).toEqual(['/v1/responses', '/v1/responses']);
	});

	it('keeps a model-not-found 404 from a working /responses route', async () => {
		const { fetchFn, calls } = fakeEndpoint({
			'/v1/responses': {
				status: 404,
				body: JSON.stringify({
					error: {
						message: 'The model `gpt-5.6` does not exist',
						type: 'invalid_request_error',
						code: 'model_not_found',
					},
				}),
				contentType: 'application/json',
			},
			'/v1/chat/completions': CHAT_OK,
		});

		await expect(
			generateText({ model: build({ url: PROXY }, fetchFn), prompt: 'hi' }),
		).rejects.toThrow('does not exist');
		expect(paths(calls)).toEqual(['/v1/responses']);
	});

	it('does not retry once the stream has produced output', async () => {
		const { fetchFn, calls } = fakeEndpoint({
			'/v1/responses': sse([
				{ type: 'response.created', response: { id: 'resp_1', created_at: 0, model: 'gpt-5.6' } },
				{
					type: 'response.output_item.added',
					output_index: 0,
					item: { type: 'message', id: 'msg_1' },
				},
				{ type: 'response.output_text.delta', item_id: 'msg_1', delta: 'partial' },
				{ ...MODEL_NOT_FOUND_FRAME, sequence_number: 3 },
			]),
			'/v1/chat/completions': CHAT_OK,
		});
		const model = build({ url: PROXY }, fetchFn) as unknown as EndpointModel;

		const parts = await readStream((await model.doStream({ prompt: PROMPT })).stream);

		expect(parts).toContainEqual(expect.objectContaining({ type: 'text-delta', delta: 'partial' }));
		expect(parts).toContainEqual(expect.objectContaining({ type: 'error' }));
		expect(paths(calls)).toEqual(['/v1/responses']);
	});

	it('re-probes /responses after a downgrade that failed', async () => {
		const { fetchFn, calls } = fakeEndpoint({
			'/v1/chat/completions': {
				status: 500,
				body: '{"error":{"message":"chat is down","type":"server_error"}}',
				contentType: 'application/json',
			},
		});
		const model = build({ url: CHAT_ONLY }, fetchFn);

		const error = await generateText({ model, prompt: 'hi', maxRetries: 0 }).catch(
			(e: unknown) => e,
		);
		expect((error as Error).message).toContain('chat is down');
		// The /responses refusal is what caused the retry, so it stays reachable.
		expect((error as { cause?: { statusCode?: number } }).cause?.statusCode).toBe(404);

		await expect(generateText({ model, prompt: 'hi', maxRetries: 0 })).rejects.toThrow(
			'chat is down',
		);
		expect(paths(calls)).toEqual([
			'/v1/responses',
			'/v1/chat/completions',
			'/v1/responses',
			'/v1/chat/completions',
		]);
	});

	it('keeps an explicit chat override off /responses', async () => {
		const { fetchFn, calls } = fakeEndpoint({ '/v1/chat/completions': CHAT_OK });

		const { text } = await generateText({
			model: build({ url: PROXY, apiStyle: 'chat' }, fetchFn),
			prompt: 'hi',
		});

		expect(text).toBe('from chat');
		expect(paths(calls)).toEqual(['/v1/chat/completions']);
	});

	it('sends the credential headers to the fallback endpoint too', async () => {
		const { fetchFn, calls } = fakeEndpoint({ '/v1/chat/completions': CHAT_OK });

		await generateText({
			model: build({ url: CHAT_ONLY, headers: { 'x-proxy-auth': 'let-me-in' } }, fetchFn),
			prompt: 'hi',
		});

		expect(calls).toHaveLength(2);
		for (const call of calls) {
			expect(call.headers.get('authorization')).toBe('Bearer sk-fake');
			expect(call.headers.get('x-proxy-auth')).toBe('let-me-in');
		}
	});

	it('reports an aborted /responses request without a second endpoint', async () => {
		const aborted = Object.assign(new Error('The operation was aborted'), { name: 'AbortError' });
		const { fetchFn, calls } = fakeEndpoint({
			'/v1/responses': { throws: aborted },
			'/v1/chat/completions': CHAT_OK,
		});

		await expect(
			generateText({ model: build({ url: CHAT_ONLY }, fetchFn), prompt: 'hi' }),
		).rejects.toThrow('The operation was aborted');
		expect(paths(calls)).toEqual(['/v1/responses']);
	});
});
