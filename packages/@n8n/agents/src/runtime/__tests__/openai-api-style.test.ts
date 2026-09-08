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
import { forgetEndpointApiStyles, withChatCompletionsFallback } from '../model/openai-api-style';

/** The built model, with the call options left loose so a test can drive `doStream`. */
type EndpointModel = {
	doStream: (options: unknown) => Promise<{ stream: ReadableStream<unknown> }>;
};

type Route = {
	status?: number;
	body?: string;
	contentType?: string;
	throws?: Error;
	/** Holds the answer open, so a test can act while this request is in flight. */
	wait?: Promise<void>;
};
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

const abortError = () =>
	Object.assign(new Error('The operation was aborted'), { name: 'AbortError' });

/** Resolves once the signal aborts, at once if it already has. Stays pending without one. */
const untilAborted = async (signal: AbortSignal | null | undefined) =>
	await new Promise<void>((resolve) => {
		if (signal?.aborted) resolve();
		else signal?.addEventListener('abort', () => resolve(), { once: true });
	});

/** A promise a test resolves by hand, to hold a route open. */
function held() {
	let release = () => {};
	const promise = new Promise<void>((resolve) => {
		release = resolve;
	});
	return { promise, release };
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
		if (route.wait) await Promise.race([route.wait, untilAborted(init?.signal)]);
		if (init?.signal?.aborted) throw abortError();
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
	// Endpoint answers are shared across model instances for the whole process.
	beforeEach(forgetEndpointApiStyles);

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

	/** An unknown route in the OpenAI error format, at the statuses gateways use for it. */
	const UNKNOWN_URL_STATUSES = [404, 400, 501];

	it.each(UNKNOWN_URL_STATUSES)('falls back to chat on an unknown_url %i', async (status) => {
		// Groq and OpenAI itself answer an unknown route in their normal error
		// format, so the body parses and the status alone cannot decide.
		const { fetchFn, calls } = fakeEndpoint({
			'/v1/responses': {
				status,
				body: JSON.stringify({
					error: {
						message: 'Unknown request URL: POST /openai/v1/responses',
						type: 'invalid_request_error',
						code: 'unknown_url',
					},
				}),
				contentType: 'application/json',
			},
			'/v1/chat/completions': CHAT_OK,
		});

		const { text } = await generateText({
			model: build({ url: PROXY }, fetchFn),
			prompt: 'hi',
			maxRetries: 0,
		});

		expect(text).toBe('from chat');
		expect(paths(calls)).toEqual(['/v1/responses', '/v1/chat/completions']);
	});

	const CODE_NULL_MISSING_ROUTE_CASES: Array<[number, string]> = [
		[404, 'Unknown request URL: POST /v1/responses'],
		[400, 'Unknown request URL: POST /v1/responses'],
		// A gateway can mount the route under an arbitrary prefix.
		[501, 'Unknown request URL: POST /openai/v1/responses'],
	];

	it.each(CODE_NULL_MISSING_ROUTE_CASES)(
		'falls back to chat on an unknown-route message with no unknown_url code, at %i',
		async (status, message) => {
			// Some gateways send this exact message with `code: null` instead of
			// `unknown_url`. The message alone must name the /responses route.
			const { fetchFn, calls } = fakeEndpoint({
				'/v1/responses': {
					status,
					body: JSON.stringify({
						error: { message, type: 'invalid_request_error', code: null },
					}),
					contentType: 'application/json',
				},
				'/v1/chat/completions': CHAT_OK,
			});

			const { text } = await generateText({
				model: build({ url: PROXY }, fetchFn),
				prompt: 'hi',
				maxRetries: 0,
			});

			expect(text).toBe('from chat');
			expect(paths(calls)).toEqual(['/v1/responses', '/v1/chat/completions']);
		},
	);

	it.each([401, 403, 429])(
		'keeps a %i with an unknown_url body from a working /responses route',
		async (status) => {
			// Auth and rate-limit statuses never mean "no route", even if a gateway
			// happens to reuse the unknown_url body shape while it is being throttled.
			const { fetchFn, calls } = fakeEndpoint({
				'/v1/responses': {
					status,
					body: JSON.stringify({
						error: {
							message: 'Unknown request URL: POST /v1/responses',
							type: 'invalid_request_error',
							code: 'unknown_url',
						},
					}),
					contentType: 'application/json',
				},
				'/v1/chat/completions': CHAT_OK,
			});

			await expect(
				generateText({ model: build({ url: PROXY }, fetchFn), prompt: 'hi', maxRetries: 0 }),
			).rejects.toThrow('Unknown request URL');
			expect(paths(calls)).toEqual(['/v1/responses']);
		},
	);

	it('keeps a bad-parameter 400 from a working /responses route', async () => {
		// Same `invalid_request_error` type as the unknown-route body above, but
		// nothing here says the route is missing, so a retry would send the same
		// prompt twice and hide the real error.
		const { fetchFn, calls } = fakeEndpoint({
			'/v1/responses': {
				status: 400,
				body: JSON.stringify({
					error: {
						message: "Unsupported parameter: 'temperature'",
						type: 'invalid_request_error',
						code: 'unsupported_parameter',
					},
				}),
				contentType: 'application/json',
			},
			'/v1/chat/completions': CHAT_OK,
		});

		await expect(
			generateText({ model: build({ url: PROXY }, fetchFn), prompt: 'hi', maxRetries: 0 }),
		).rejects.toThrow('Unsupported parameter');
		expect(paths(calls)).toEqual(['/v1/responses']);
	});

	it('falls back to chat on an HTML page answered with HTTP 200', async () => {
		// A reverse proxy with a catch-all route answers the unknown path with its
		// own page. The SDK reports that as `Invalid JSON response` at status 200.
		const { fetchFn, calls } = fakeEndpoint({
			'/v1/responses': {
				status: 200,
				body: '<!doctype html><title>n8n</title>',
				contentType: 'text/html; charset=utf-8',
			},
			'/v1/chat/completions': CHAT_OK,
		});

		const { text } = await generateText({
			model: build({ url: PROXY }, fetchFn),
			prompt: 'hi',
			maxRetries: 0,
		});

		expect(text).toBe('from chat');
		expect(paths(calls)).toEqual(['/v1/responses', '/v1/chat/completions']);
	});

	it('falls back to chat on doStream when an HTML page is answered with HTTP 200', async () => {
		// The installed SDK's stream response handler accepts any 200 body with no
		// content-type check, so without a guard this would silently produce a
		// stream with no text instead of falling back.
		const { fetchFn, calls } = fakeEndpoint({
			'/v1/responses': {
				status: 200,
				body: '<!doctype html><title>n8n</title>',
				contentType: 'text/html; charset=utf-8',
			},
			'/v1/chat/completions': CHAT_STREAM_OK,
		});
		const model = build({ url: PROXY }, fetchFn) as unknown as EndpointModel;

		const parts = await readStream((await model.doStream({ prompt: PROMPT })).stream);

		expect(parts).toContainEqual(
			expect.objectContaining({ type: 'text-delta', delta: 'from chat' }),
		);
		expect(paths(calls)).toEqual(['/v1/responses', '/v1/chat/completions']);

		// The decision is remembered per endpoint, so a fresh instance skips the probe.
		const second = build({ url: PROXY }, fetchFn) as unknown as EndpointModel;
		await readStream((await second.doStream({ prompt: PROMPT })).stream);
		expect(paths(calls)).toEqual(['/v1/responses', '/v1/chat/completions', '/v1/chat/completions']);
	});

	it('keeps a truncated JSON answer from a working /responses route', async () => {
		// The parse fails the same way an HTML page does, but this route answered:
		// the generation ran, so it must not run a second time on chat.
		const { fetchFn, calls } = fakeEndpoint({
			'/v1/responses': {
				status: 200,
				body: '{"id":"resp_1","out',
				contentType: 'application/json',
			},
			'/v1/chat/completions': CHAT_OK,
		});

		await expect(
			generateText({ model: build({ url: PROXY }, fetchFn), prompt: 'hi', maxRetries: 0 }),
		).rejects.toThrow('Invalid JSON response');
		expect(paths(calls)).toEqual(['/v1/responses']);
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
		const { fetchFn, calls } = fakeEndpoint({
			'/v1/responses': { throws: abortError() },
			'/v1/chat/completions': CHAT_OK,
		});

		await expect(
			generateText({ model: build({ url: CHAT_ONLY }, fetchFn), prompt: 'hi' }),
		).rejects.toThrow('The operation was aborted');
		expect(paths(calls)).toEqual(['/v1/responses']);
	});

	describe('endpoint decision sharing', () => {
		it('answers a fresh model instance from the endpoint decision', async () => {
			// `RuntimeContextBuilder` builds a new model for every turn, so the
			// decision must survive the instance that made it.
			const { fetchFn, calls } = fakeEndpoint({ '/v1/chat/completions': CHAT_OK });

			await generateText({ model: build({ url: CHAT_ONLY }, fetchFn), prompt: 'hi' });
			await generateText({ model: build({ url: CHAT_ONLY }, fetchFn), prompt: 'hi' });
			// A trailing slash spells the same endpoint.
			await generateText({ model: build({ url: `${CHAT_ONLY}/` }, fetchFn), prompt: 'hi' });

			expect(paths(calls)).toEqual([
				'/v1/responses',
				'/v1/chat/completions',
				'/v1/chat/completions',
				'/v1/chat/completions',
			]);
		});

		it('keeps separate decisions for endpoints that differ only by query string', async () => {
			// A gateway that routes by query parameter, not path, so the endpoint
			// identity must include the query or two deployments collapse into one.
			const fetchFn = (async (url: unknown) => {
				const parsed = new URL(String(url));
				const wantsResponses = parsed.searchParams.get('path') === '/responses';
				const supportsResponses = parsed.searchParams.get('deployment') === 'responses';
				if (wantsResponses !== supportsResponses)
					return await Promise.resolve(new Response('', { status: 404 }));
				return await Promise.resolve(
					new Response((wantsResponses ? RESPONSES_OK : CHAT_OK).body, {
						status: 200,
						headers: { 'content-type': 'application/json' },
					}),
				);
			}) as unknown as typeof globalThis.fetch;

			const chatOnly = await generateText({
				model: build({ url: 'https://query.test/openai?deployment=chat&path=' }, fetchFn),
				prompt: 'hi',
			});
			const responsesOnly = await generateText({
				model: build({ url: 'https://query.test/openai?deployment=responses&path=' }, fetchFn),
				prompt: 'hi',
			});

			expect(chatOnly.text).toBe('from chat');
			expect(responsesOnly.text).toBe('from responses');
		});

		it('decides for each endpoint on its own', async () => {
			const chatOnly = fakeEndpoint({ '/v1/chat/completions': CHAT_OK });
			const proxy = fakeEndpoint({ '/v1/responses': RESPONSES_OK });

			const downgraded = await generateText({
				model: build({ url: CHAT_ONLY }, chatOnly.fetchFn),
				prompt: 'hi',
			});
			const direct = await generateText({
				model: build({ url: PROXY }, proxy.fetchFn),
				prompt: 'hi',
			});

			expect([downgraded.text, direct.text]).toEqual(['from chat', 'from responses']);
			expect(paths(chatOnly.calls)).toEqual(['/v1/responses', '/v1/chat/completions']);
			expect(paths(proxy.calls)).toEqual(['/v1/responses']);
		});

		it('probes one time when parallel calls arrive before any answer', async () => {
			const { fetchFn, calls } = fakeEndpoint({ '/v1/chat/completions': CHAT_OK });
			const model = build({ url: CHAT_ONLY }, fetchFn);

			const results = await Promise.all([
				generateText({ model, prompt: 'hi' }),
				generateText({ model, prompt: 'hi' }),
				generateText({ model, prompt: 'hi' }),
			]);

			expect(results.map((r) => r.text)).toEqual(['from chat', 'from chat', 'from chat']);
			// One probe, and every call still sends its own request.
			expect(paths(calls)).toEqual([
				'/v1/responses',
				'/v1/chat/completions',
				'/v1/chat/completions',
				'/v1/chat/completions',
			]);
		});

		it('lets a call that waited ask the endpoint itself when the probe failed', async () => {
			// A 500 says nothing about the API style, so the waiting call must send
			// its own request instead of inheriting the probe's failure.
			const { fetchFn, calls } = fakeEndpoint({
				'/v1/responses': {
					status: 500,
					body: '{"error":{"message":"boom","type":"server_error"}}',
					contentType: 'application/json',
				},
				'/v1/chat/completions': CHAT_OK,
			});
			const model = build({ url: PROXY }, fetchFn);

			const results = await Promise.allSettled([
				generateText({ model, prompt: 'hi', maxRetries: 0 }),
				generateText({ model, prompt: 'hi', maxRetries: 0 }),
			]);

			expect(results.map((r) => r.status)).toEqual(['rejected', 'rejected']);
			expect(paths(calls)).toEqual(['/v1/responses', '/v1/responses']);
		});

		it('reports an abort raised while a probe is still running', async () => {
			const probeAnswer = held();
			const { fetchFn, calls } = fakeEndpoint({
				'/v1/responses': { ...RESPONSES_OK, wait: probeAnswer.promise },
				'/v1/chat/completions': CHAT_OK,
			});
			const model = build({ url: PROXY }, fetchFn);
			const controller = new AbortController();

			// Proves the waiter actually registered its `abort` listener (instead of
			// only relying on `controller.abort()` happening to fire after some
			// unrelated microtask), so the abort below is known to race a listener
			// that exists, not a listener that may not have been added yet.
			const registered = new Promise<void>((resolve) => {
				vi.spyOn(controller.signal, 'addEventListener').mockImplementation(
					(type, listener, options) => {
						if (type === 'abort') resolve();
						return EventTarget.prototype.addEventListener.call(
							controller.signal,
							type,
							listener,
							options,
						);
					},
				);
			});

			const probe = generateText({ model, prompt: 'hi' });
			const waiting = generateText({
				model,
				prompt: 'hi',
				abortSignal: controller.signal,
				maxRetries: 0,
			});
			await registered;
			controller.abort();

			// The abort surfaces while the probe is still open, not after it.
			await expect(waiting).rejects.toThrow('aborted');
			// The waiter reports its own abort instead of sending a second,
			// already-cancelled request while the leader's probe is still open.
			expect(paths(calls)).toEqual(['/v1/responses']);
			probeAnswer.release();
			expect((await probe).text).toBe('from responses');
		});

		it('removes its abort listener once the leader completes, without waiting for an abort', async () => {
			// The waiter's listener must come off even when it never fires — a
			// leaked listener would otherwise accumulate on every call that shares a
			// signal across turns.
			const probeAnswer = held();
			const { fetchFn } = fakeEndpoint({
				'/v1/responses': { ...RESPONSES_OK, wait: probeAnswer.promise },
				'/v1/chat/completions': CHAT_OK,
			});
			const model = build({ url: PROXY }, fetchFn);
			const controller = new AbortController();
			const removeSpy = vi.spyOn(controller.signal, 'removeEventListener');

			const probe = generateText({ model, prompt: 'hi' });
			const waiting = generateText({ model, prompt: 'hi', abortSignal: controller.signal });
			probeAnswer.release();

			expect((await Promise.all([probe, waiting])).map((r) => r.text)).toEqual([
				'from responses',
				'from responses',
			]);
			expect(removeSpy).toHaveBeenCalledWith('abort', expect.anything());
		});

		it('asks for /responses again once the decision has expired', async () => {
			// A server that gains a /responses route must be used again without a
			// restart, so the decision has a TTL.
			vi.useFakeTimers({ toFake: ['Date'] });
			try {
				const { fetchFn, calls } = fakeEndpoint({ '/v1/chat/completions': CHAT_OK });
				const model = build({ url: CHAT_ONLY }, fetchFn);

				await generateText({ model, prompt: 'hi' });
				vi.setSystemTime(Date.now() + 5 * 60 * 1000 + 1);
				await generateText({ model, prompt: 'hi' });

				expect(paths(calls)).toEqual([
					'/v1/responses',
					'/v1/chat/completions',
					'/v1/responses',
					'/v1/chat/completions',
				]);
			} finally {
				vi.useRealTimers();
			}
		});
	});

	it('normalizes the chat model the same way as the responses model', async () => {
		// Both installed adapters are on v4, so only a stub can show this: a provider
		// left on an older spec must come back converted through the fallback path,
		// not in its own older result shape.
		type Answer = () => unknown;
		const stub = (specificationVersion: string, answer: Answer) =>
			({
				specificationVersion,
				provider: 'stub',
				modelId: 'stub',
				supportedUrls: {},
				doGenerate: async () => await Promise.resolve(answer()),
				doStream: async () => await Promise.resolve(answer()),
			}) as unknown as Parameters<typeof withChatCompletionsFallback>[1];

		const model = withChatCompletionsFallback(
			'https://stub.example/v1',
			stub('v4', () => {
				throw Object.assign(new Error('Not Found'), { statusCode: 404 });
			}),
			stub('v2', () => ({
				content: [],
				finishReason: 'stop',
				usage: { inputTokens: 1, outputTokens: 2 },
				warnings: [],
			})),
		) as unknown as {
			doGenerate: (options: unknown) => Promise<{ finishReason: unknown; usage: unknown }>;
		};

		const { finishReason, usage } = await model.doGenerate({ prompt: PROMPT });

		expect(finishReason).toEqual({ unified: 'stop', raw: undefined });
		expect(usage).toMatchObject({ inputTokens: { total: 1 }, outputTokens: { total: 2 } });
	});

	it('normalizes a v3 chat model streaming through the fallback', async () => {
		// The generation case above only exercises `doGenerate`. The installed
		// SDK's `asLanguageModelV4` converts a v3 model by relabelling
		// `specificationVersion` only — v3 and v4 stream chunks share the same
		// shape, so a v3 stub's stream must reach the caller unchanged, not
		// dropped or re-wrapped by `wrapLanguageModel`.
		const chatChunks: Array<Record<string, unknown>> = [
			{ type: 'stream-start', warnings: [] },
			{ type: 'text-start', id: '1' },
			{ type: 'text-delta', id: '1', delta: 'from chat' },
			{ type: 'text-end', id: '1' },
			{
				type: 'finish',
				finishReason: { unified: 'stop', raw: undefined },
				usage: { inputTokens: { total: 1 }, outputTokens: { total: 2 } },
			},
		];
		const stub = (specificationVersion: string, doStream: () => unknown) =>
			({
				specificationVersion,
				provider: 'stub',
				modelId: 'stub',
				supportedUrls: {},
				doGenerate: async () =>
					await Promise.reject(Object.assign(new Error('Not Found'), { statusCode: 404 })),
				doStream,
			}) as unknown as Parameters<typeof withChatCompletionsFallback>[1];

		const model = withChatCompletionsFallback(
			'https://stub.example/v1',
			stub('v4', () => {
				throw Object.assign(new Error('Not Found'), { statusCode: 404 });
			}),
			stub('v3', () => ({
				stream: new ReadableStream({
					start(controller) {
						for (const chunk of chatChunks) controller.enqueue(chunk);
						controller.close();
					},
				}),
			})),
		) as unknown as EndpointModel;

		const { stream } = await model.doStream({ prompt: PROMPT });

		expect(await readStream(stream)).toEqual(chatChunks);
	});
});
