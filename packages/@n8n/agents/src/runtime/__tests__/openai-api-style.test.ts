/**
 * Regressions for the automatic OpenAI API-style selection, run against the REAL
 * SDK: no provider is mocked here, so `createModel` builds the actual
 * `@ai-sdk/openai` adapters and the real `ai` runtime drives them. Only the
 * transport and the URL download are faked, and the credentials are not real.
 *
 * Most generation calls use `generateText`. The streaming cases call the built
 * model's `doStream` directly, so an assertion targets the adapter's own stream
 * parts instead of `streamText`'s error-part lifecycle.
 */
import { generateText } from 'ai';

import { createModel } from '../model/model-factory';
import {
	endpointRouteKey,
	forgetEndpointApiStyles,
	withChatCompletionsFallback,
} from '../model/openai-api-style';

/** The built model, with loose call options for direct SDK calls. */
type EndpointModel = {
	doGenerate: (options: unknown) => Promise<{ content: unknown[] }>;
	doStream: (options: unknown) => Promise<{ stream: ReadableStream<unknown> }>;
};

type Route = {
	status?: number;
	body?: string;
	bodyStream?: ReadableStream<Uint8Array>;
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

/** Sends headers and optional opening bytes before the test releases the body. */
function heldBody(body: string | undefined, head = '') {
	const gate = held();
	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			const encoder = new TextEncoder();
			if (head) controller.enqueue(encoder.encode(head));
			await gate.promise;
			controller.enqueue(encoder.encode(body));
			controller.close();
		},
	});
	return { stream, release: gate.release };
}

/**
 * A body sent as a stream. `new Response(string)` synthesizes
 * `text/plain;charset=UTF-8`, so a route that serves no content type at all has
 * to send one of these, or the header the fixture leaves out still arrives.
 */
const untypedBody = (body: string) =>
	new ReadableStream<Uint8Array>({
		start(controller) {
			controller.enqueue(new TextEncoder().encode(body));
			controller.close();
		},
	});

/** Sends the headers, then loses the body: a connection that dies mid-answer. */
const brokenBody = () =>
	new ReadableStream<Uint8Array>({
		start(controller) {
			controller.error(new Error('connection reset'));
		},
	});

/**
 * Runs event-loop ticks until `check` passes, optionally doing `tick` on each
 * one. `setImmediate` is never faked here, so this also works while the timers a
 * test drives by hand are.
 */
async function until(check: () => boolean, tick: () => void = () => {}) {
	for (let i = 0; i < 500; i++) {
		if (check()) return;
		tick();
		await new Promise<void>((resolve) => setImmediate(resolve));
	}
	throw new Error('condition was not reached');
}

/**
 * Fails the test instead of stalling the run. A guard that reads the answer
 * before it passes it on can deadlock against the reader the SDK holds, and
 * that stops a whole live-stream test from ever finishing on its own.
 */
async function withinTimeout<T>(work: Promise<T>, ms = 2000): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		return await Promise.race([
			work,
			new Promise<never>((_, reject) => {
				timer = setTimeout(() => reject(new Error(`no answer within ${ms}ms`)), ms);
			}),
		]);
	} finally {
		clearTimeout(timer);
	}
}

/** Mock HTTP: `routes` maps a request path to the answer the fake server gives. */
function fakeEndpoint(routes: Record<string, Route> | ((call: Call, url: URL) => Route)) {
	const calls: Call[] = [];
	const fetchFn = (async (url: unknown, init?: RequestInit) => {
		const { pathname } = new URL(String(url));
		calls.push({
			path: pathname,
			headers: new Headers(init?.headers),
			body: parseJsonBody(init?.body),
		});
		// An unlisted path is a server that does not have that route at all.
		const route =
			typeof routes === 'function'
				? routes(calls[calls.length - 1], new URL(String(url)))
				: (routes[pathname] ?? { status: 404 });
		await Promise.resolve();
		if (route.wait) await Promise.race([route.wait, untilAborted(init?.signal)]);
		if (init?.signal?.aborted) throw abortError();
		if (route.throws) throw route.throws;
		return new Response(
			route.bodyStream ?? (route.contentType ? (route.body ?? '') : untypedBody(route.body ?? '')),
			{
				status: route.status ?? 404,
				headers: route.contentType ? { 'content-type': route.contentType } : undefined,
			},
		);
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
		// A real, non-stream HTTP 404 whose body names no model, deployment or
		// parameter is a "no /responses route" answer, not a model error.
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

	it('falls back to chat on an unknown_url a gateway answered with HTTP 200', async () => {
		// Aggregating gateways send their errors at HTTP 200 with an `error` object.
		// The SDK reads that body as an answer, finds `error` in it, and raises a 400
		// that carries the raw body but no parsed error data, so only the body
		// reports the route. Nothing generated, so the chat request is safe.
		const { fetchFn, calls } = fakeEndpoint({
			'/v1/responses': json({
				error: {
					message: 'Unknown request URL: POST /v1/responses',
					type: 'invalid_request_error',
					code: 'unknown_url',
				},
			}),
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

	it('keeps a bad-parameter error the same gateway answered with HTTP 200', async () => {
		// The SDK raises the same dataless 400 here, but this body says the route
		// ran. A second request would hide the error and bill the generation twice.
		const { fetchFn, calls } = fakeEndpoint({
			'/v1/responses': json({
				error: {
					message: "Unsupported parameter: 'temperature'",
					type: 'invalid_request_error',
					code: 'unsupported_parameter',
				},
			}),
			'/v1/chat/completions': CHAT_OK,
		});

		await expect(
			generateText({ model: build({ url: PROXY }, fetchFn), prompt: 'hi', maxRetries: 0 }),
		).rejects.toThrow('Unsupported parameter');
		expect(paths(calls)).toEqual(['/v1/responses']);
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

	/** Missing-route 404s whose OpenAI-format body spells it in some other wording. */
	const OTHER_MISSING_ROUTE_BODIES: Array<[string, Record<string, unknown>]> = [
		['Route not found', { message: 'Route not found', type: 'invalid_request_error', code: '404' }],
		[
			'Invalid URL (POST /v1/responses)',
			{ message: 'Invalid URL (POST /v1/responses)', type: 'invalid_request_error', code: null },
		],
		['Not Found', { message: 'Not Found' }],
	];

	it.each(OTHER_MISSING_ROUTE_BODIES)(
		'falls back to chat on a 404 whose body says "%s"',
		async (_label, error) => {
			// A 404 reports a missing route on its own, and no list of phrasings
			// covers every gateway. Only a body that shows the route itself ran takes
			// that back, so an unrecognised wording still falls back.
			const { fetchFn, calls } = fakeEndpoint({
				'/v1/responses': {
					status: 404,
					body: JSON.stringify({ error }),
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

	it('keeps a deployment-not-found 404 from a working /responses route', async () => {
		// Azure names the missing deployment in the code, with no `param` and no
		// OpenAI-style `model_not_found`. The route ran, so this error must stand.
		const { fetchFn, calls } = fakeEndpoint({
			'/v1/responses': {
				status: 404,
				body: JSON.stringify({
					error: {
						code: 'DeploymentNotFound',
						message: 'The API deployment for this resource does not exist',
					},
				}),
				contentType: 'application/json',
			},
			'/v1/chat/completions': CHAT_OK,
		});

		await expect(
			generateText({ model: build({ url: PROXY }, fetchFn), prompt: 'hi', maxRetries: 0 }),
		).rejects.toThrow('deployment');
		expect(paths(calls)).toEqual(['/v1/responses']);
	});

	it('keeps a 404 that names the parameter it rejected', async () => {
		const { fetchFn, calls } = fakeEndpoint({
			'/v1/responses': {
				status: 404,
				body: JSON.stringify({
					error: { message: 'No such file', type: 'invalid_request_error', param: 'file_id' },
				}),
				contentType: 'application/json',
			},
			'/v1/chat/completions': CHAT_OK,
		});

		await expect(
			generateText({ model: build({ url: PROXY }, fetchFn), prompt: 'hi', maxRetries: 0 }),
		).rejects.toThrow('No such file');
		expect(paths(calls)).toEqual(['/v1/responses']);
	});

	it('keeps a bodyless 501 from a route that refuses one feature', async () => {
		// 501 reports that the server does not support what the request needs, which
		// a working /responses route answers too. Only a body naming the route reads
		// it as a missing route — see the unknown_url cases above.
		const { fetchFn, calls } = fakeEndpoint({
			'/v1/responses': { status: 501 },
			'/v1/chat/completions': CHAT_OK,
		});

		await expect(
			generateText({ model: build({ url: PROXY }, fetchFn), prompt: 'hi', maxRetries: 0 }),
		).rejects.toThrow();
		expect(paths(calls)).toEqual(['/v1/responses']);
	});

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

	it('falls back to chat when the page-labelled answer is empty', async () => {
		// The body ended with nothing in it, so no generation was lost and the
		// caller would otherwise get a silent empty answer.
		const { fetchFn, calls } = fakeEndpoint({
			'/v1/responses': { status: 200, body: '', contentType: 'text/html' },
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

	it('fails explicitly when both routes answer an HTML page', async () => {
		// The guard is on both adapters, so a catch-all in front of a server with
		// neither route reports an error instead of an empty answer.
		const page: Route = {
			status: 200,
			body: '<!doctype html><title>n8n</title>',
			contentType: 'text/html; charset=utf-8',
		};
		const { fetchFn, calls } = fakeEndpoint({
			'/v1/responses': page,
			'/v1/chat/completions': page,
		});

		const error = await generateText({
			model: build({ url: PROXY }, fetchFn),
			prompt: 'hi',
			maxRetries: 0,
		}).catch((e: unknown) => e);

		expect((error as Error).message).toContain('Invalid JSON response');
		// The /responses refusal that caused the second request stays reachable.
		expect((error as { cause?: { statusCode?: number } }).cause?.statusCode).toBe(200);
		expect(paths(calls)).toEqual(['/v1/responses', '/v1/chat/completions']);

		// A fallback that also failed decides nothing, so the next call still asks.
		await generateText({
			model: build({ url: PROXY }, fetchFn),
			prompt: 'hi',
			maxRetries: 0,
		}).catch(() => {});
		expect(paths(calls)).toEqual([
			'/v1/responses',
			'/v1/chat/completions',
			'/v1/responses',
			'/v1/chat/completions',
		]);
	});

	it('fails explicitly on doStream when both routes answer an HTML page', async () => {
		// Without the guard on the chat adapter, this ends as a silent empty stream.
		const page: Route = {
			status: 200,
			body: '<!doctype html><title>n8n</title>',
			contentType: 'text/html; charset=utf-8',
		};
		const { fetchFn, calls } = fakeEndpoint({
			'/v1/responses': page,
			'/v1/chat/completions': page,
		});
		const model = build({ url: PROXY }, fetchFn) as unknown as EndpointModel;

		await expect(model.doStream({ prompt: PROMPT })).rejects.toThrow('Invalid JSON response');
		expect(paths(calls)).toEqual(['/v1/responses', '/v1/chat/completions']);
	});

	it('serves a route with no content type without the header', async () => {
		// Guards the cases below: `new Response(string)` synthesizes
		// `text/plain;charset=UTF-8`, which would make each of them a second
		// `text/plain` case instead of the absent header they are named for.
		const { fetchFn } = fakeEndpoint({ '/v1/responses': { status: 200, body: 'hi' } });

		const response = await fetchFn(`${PROXY}/responses`);

		expect(response.headers.get('content-type')).toBeNull();
	});

	/** Content types a catch-all page arrives with when the proxy does not say `text/html`. */
	const UNEXPECTED_PAGE_TYPES: Array<[string, string | undefined]> = [
		['no content type', undefined],
		['text/plain', 'text/plain; charset=utf-8'],
		['application/octet-stream', 'application/octet-stream'],
	];

	it.each(UNEXPECTED_PAGE_TYPES)(
		'falls back to chat on a page answered with %s',
		async (_label, contentType) => {
			// The installed SDK's stream response handler reads no content type at
			// all, so a page labelled anything other than JSON or SSE reaches the
			// caller as a silent empty stream exactly as an HTML one does.
			const { fetchFn, calls } = fakeEndpoint({
				'/v1/responses': { status: 200, body: '<!doctype html><title>n8n</title>', contentType },
				'/v1/chat/completions': CHAT_STREAM_OK,
			});
			const model = build({ url: PROXY }, fetchFn) as unknown as EndpointModel;

			const parts = await readStream((await model.doStream({ prompt: PROMPT })).stream);

			expect(parts).toContainEqual(
				expect.objectContaining({ type: 'text-delta', delta: 'from chat' }),
			);
			expect(paths(calls)).toEqual(['/v1/responses', '/v1/chat/completions']);
		},
	);

	it('fails explicitly when both routes answer a page with no content type', async () => {
		// The chat side must not succeed silently either.
		const page: Route = { status: 200, body: '<!doctype html><title>n8n</title>' };
		const { fetchFn, calls } = fakeEndpoint({
			'/v1/responses': page,
			'/v1/chat/completions': page,
		});
		const model = build({ url: PROXY }, fetchFn) as unknown as EndpointModel;

		await expect(model.doStream({ prompt: PROMPT })).rejects.toThrow('Invalid JSON response');
		expect(paths(calls)).toEqual(['/v1/responses', '/v1/chat/completions']);
	});

	it('keeps only the opening bytes of a page that arrives as one huge chunk', async () => {
		// A catch-all page is a whole document, and a reverse proxy sends a small one
		// in a single chunk. The guard reads a bounded prefix, so neither the read nor
		// the error it raises holds the megabyte the caller never asked for.
		const page = '<!doctype html><title>n8n</title>' + '<p>proxied</p>'.repeat(80_000);
		// A fresh stream for each call: one route object's body is read one time.
		const { fetchFn, calls } = fakeEndpoint(() => ({
			status: 200,
			bodyStream: untypedBody(page),
			contentType: 'text/plain; charset=utf-8',
		}));

		const error = (await generateText({
			model: build({ url: PROXY }, fetchFn),
			prompt: 'hi',
			maxRetries: 0,
		}).catch((e: unknown) => e)) as Error & {
			responseBody?: string;
			cause?: { responseBody?: string };
		};

		expect(page.length).toBeGreaterThan(1024 * 1024);
		expect(error.message).toContain('Invalid JSON response');
		// HEAD_LIMIT, and the prefix still says what the body is.
		expect(error.responseBody?.length).toBeLessThanOrEqual(1024);
		expect(error.responseBody?.startsWith('<!doctype html>')).toBe(true);
		expect(error.cause?.responseBody?.length).toBeLessThanOrEqual(1024);
		// The page still reads as "not an answer" on both routes, and the /responses
		// refusal is the only reason the chat request ran.
		expect(paths(calls)).toEqual(['/v1/responses', '/v1/chat/completions']);
	});

	it('falls back to chat when an answer with no content type ends empty', async () => {
		// Nothing in the body and no type to read it by: no generation was lost, and
		// the caller would otherwise get a silent empty answer.
		const { fetchFn, calls } = fakeEndpoint({
			'/v1/responses': { status: 200, body: '' },
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

	it('delivers an answer that carries no content type, one time', async () => {
		// A missing content type is not evidence of a page: this generation ran, so
		// re-sending the prompt would bill the user twice.
		const { fetchFn, calls } = fakeEndpoint({
			'/v1/responses': { ...RESPONSES_OK, contentType: undefined },
			'/v1/chat/completions': CHAT_OK,
		});
		const model = build({ url: PROXY }, fetchFn);

		expect((await generateText({ model, prompt: 'hi', maxRetries: 0 })).text).toBe(
			'from responses',
		);
		expect((await generateText({ model, prompt: 'hi', maxRetries: 0 })).text).toBe(
			'from responses',
		);
		expect(paths(calls)).toEqual(['/v1/responses', '/v1/responses']);
	});

	it('delivers an SSE stream that a gateway labelled text/plain', async () => {
		const { fetchFn, calls } = fakeEndpoint({
			'/v1/responses': { ...RESPONSES_STREAM_OK, contentType: 'text/plain' },
			'/v1/chat/completions': CHAT_STREAM_OK,
		});
		const model = build({ url: PROXY }, fetchFn) as unknown as EndpointModel;

		const parts = await readStream((await model.doStream({ prompt: PROMPT })).stream);

		expect(parts).toContainEqual(
			expect.objectContaining({ type: 'text-delta', delta: 'from responses' }),
		);
		expect(paths(calls)).toEqual(['/v1/responses']);
	});

	it('delivers a JSON answer that a gateway labelled text/html, one time', async () => {
		// The content type alone is not evidence of a catch-all page: this
		// generation ran, so re-sending the prompt would bill the user twice.
		const { fetchFn, calls } = fakeEndpoint({
			'/v1/responses': { ...RESPONSES_OK, contentType: 'text/html; charset=utf-8' },
			'/v1/chat/completions': CHAT_OK,
		});
		const model = build({ url: PROXY }, fetchFn);

		expect((await generateText({ model, prompt: 'hi', maxRetries: 0 })).text).toBe(
			'from responses',
		);
		// The endpoint is not pinned to chat either, so the next call still asks.
		expect((await generateText({ model, prompt: 'hi', maxRetries: 0 })).text).toBe(
			'from responses',
		);
		expect(paths(calls)).toEqual(['/v1/responses', '/v1/responses']);
	});

	it('delivers an SSE stream that a gateway labelled text/html, one time', async () => {
		const { fetchFn, calls } = fakeEndpoint({
			'/v1/responses': { ...RESPONSES_STREAM_OK, contentType: 'text/html' },
			'/v1/chat/completions': CHAT_STREAM_OK,
		});
		const model = build({ url: PROXY }, fetchFn) as unknown as EndpointModel;

		const parts = await readStream((await model.doStream({ prompt: PROMPT })).stream);

		expect(parts).toContainEqual(
			expect.objectContaining({ type: 'text-delta', delta: 'from responses' }),
		);
		expect(paths(calls)).toEqual(['/v1/responses']);
	});

	it('keeps a truncated answer labelled text/html from a working /responses route', async () => {
		// The body opens as JSON, so the route answered and the generation ran.
		const { fetchFn, calls } = fakeEndpoint({
			'/v1/responses': { status: 200, body: '{"id":"resp_1","out', contentType: 'text/html' },
			'/v1/chat/completions': CHAT_OK,
		});

		await expect(
			generateText({ model: build({ url: PROXY }, fetchFn), prompt: 'hi', maxRetries: 0 }),
		).rejects.toThrow('Invalid JSON response');
		expect(paths(calls)).toEqual(['/v1/responses']);
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

	/** Legitimate SSE openings that are not `data:` or `event:`. */
	const SSE_OPENINGS: Array<[string, string]> = [
		['a comment heartbeat', ': keepalive\n\n'],
		['an id field', 'id: 1\n\n'],
		['a retry field', 'retry: 500\n\n'],
	];

	it.each(SSE_OPENINGS)(
		'delivers a text/html-labelled stream that opens with %s',
		async (_label, opening) => {
			// The guard tests the body against the answer grammars, not against a list
			// of known field names, so a stream is never replayed for opening with one
			// the list does not have.
			const { fetchFn, calls } = fakeEndpoint({
				'/v1/responses': {
					...RESPONSES_STREAM_OK,
					body: opening + (RESPONSES_STREAM_OK.body ?? ''),
					contentType: 'text/html',
				},
				'/v1/chat/completions': CHAT_STREAM_OK,
			});
			const model = build({ url: PROXY }, fetchFn) as unknown as EndpointModel;

			const parts = await readStream((await model.doStream({ prompt: PROMPT })).stream);

			expect(parts).toContainEqual(
				expect.objectContaining({ type: 'text-delta', delta: 'from responses' }),
			);
			expect(paths(calls)).toEqual(['/v1/responses']);
		},
	);

	it('delivers a text/html-labelled stream before the answer ends', async () => {
		// Reading the whole body to classify it would hold every part back until the
		// generation finished. Only the first non-blank bytes decide, and they can
		// arrive split across chunks.
		const tail = held();
		const calls: string[] = [];
		const frame = (chunk: unknown) => `data: ${JSON.stringify(chunk)}\n\n`;
		const fetchFn = (async (url: unknown) => {
			calls.push(new URL(String(url)).pathname);
			await Promise.resolve();
			return new Response(
				new ReadableStream<Uint8Array>({
					async start(controller) {
						const encoder = new TextEncoder();
						const push = (text: string) => controller.enqueue(encoder.encode(text));
						// A heartbeat split so the first chunk holds no whole line.
						push(': keep');
						push('alive\n\n');
						push('id: 1\nretry: 500\n\n');
						push(
							frame({
								type: 'response.created',
								response: { id: 'resp_1', created_at: 0, model: 'gpt-5.6' },
							}),
						);
						push(
							frame({
								type: 'response.output_item.added',
								output_index: 0,
								item: { type: 'message', id: 'msg_1' },
							}),
						);
						push(
							frame({
								type: 'response.output_text.delta',
								item_id: 'msg_1',
								delta: 'from responses',
							}),
						);
						await tail.promise;
						push(
							frame({
								type: 'response.completed',
								response: { usage: { input_tokens: 1, output_tokens: 1 } },
							}),
						);
						push('data: [DONE]\n\n');
						controller.close();
					},
				}),
				{ status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } },
			);
		}) as unknown as typeof globalThis.fetch;
		const model = build({ url: PROXY }, fetchFn) as unknown as EndpointModel;

		const { stream } = await withinTimeout(model.doStream({ prompt: PROMPT }));
		const reader = stream.getReader();
		const seen: Array<Record<string, unknown>> = [];
		while (!seen.some((part) => part.type === 'text-delta')) {
			const { done, value } = await reader.read();
			if (done) break;
			seen.push(value as Record<string, unknown>);
		}

		// The delta reached the caller while the answer was still open.
		expect(seen).toContainEqual(
			expect.objectContaining({ type: 'text-delta', delta: 'from responses' }),
		);
		expect(calls).toEqual(['/v1/responses']);
		tail.release();
		for (;;) {
			const { done } = await reader.read();
			if (done) break;
		}
	});

	it('delivers a text/html-labelled stream whose first chunk ends mid-field', async () => {
		// A chunk boundary can fall anywhere: `d`, then `ata: …`. Bytes that are only
		// incomplete are not evidence of a page, so this answer is never replayed.
		const body = RESPONSES_STREAM_OK.body ?? '';
		const chunks = ['d', `ata: ${body.slice('data: '.length)}`];
		const calls: string[] = [];
		const fetchFn = (async (url: unknown) => {
			calls.push(new URL(String(url)).pathname);
			await Promise.resolve();
			return new Response(
				new ReadableStream<Uint8Array>({
					start(controller) {
						const encoder = new TextEncoder();
						for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
						controller.close();
					},
				}),
				{ status: 200, headers: { 'content-type': 'text/html' } },
			);
		}) as unknown as typeof globalThis.fetch;
		const model = build({ url: PROXY }, fetchFn) as unknown as EndpointModel;

		const { stream } = await withinTimeout(model.doStream({ prompt: PROMPT }));

		expect(await readStream(stream)).toContainEqual(
			expect.objectContaining({ type: 'text-delta', delta: 'from responses' }),
		);
		expect(calls).toEqual(['/v1/responses']);
	});

	it('keeps a Chat Completions answer served on /responses, and moves on to chat', async () => {
		// A gateway that answers chat completions on every path it routes. The
		// generation ran, so this call keeps its own error instead of paying for a
		// second one — but the endpoint has said what it speaks.
		const { fetchFn, calls } = fakeEndpoint({
			'/v1/responses': CHAT_OK,
			'/v1/chat/completions': CHAT_OK,
		});

		await expect(
			generateText({ model: build({ url: PROXY }, fetchFn), prompt: 'hi', maxRetries: 0 }),
		).rejects.toThrow('Invalid JSON response');
		expect(paths(calls)).toEqual(['/v1/responses']);

		// A fresh model instance, as `RuntimeContextBuilder` builds every turn.
		const { text } = await generateText({ model: build({ url: PROXY }, fetchFn), prompt: 'hi' });

		expect(text).toBe('from chat');
		expect(paths(calls)).toEqual(['/v1/responses', '/v1/chat/completions']);
	});

	it('keeps a Chat Completions answer that carries no usage, and moves on to chat', async () => {
		// Without `usage` the body passes the Responses schema, which has every
		// field optional, so the SDK reports "no output" at 500 instead of a parse
		// failure at 200. It is the same mismatch, and the generation still ran.
		const chatWithoutUsage = json({
			id: 'chatcmpl_1',
			created: 0,
			model: 'gpt-5.6',
			choices: [
				{ index: 0, message: { role: 'assistant', content: 'from chat' }, finish_reason: 'stop' },
			],
		});
		const { fetchFn, calls } = fakeEndpoint({
			'/v1/responses': chatWithoutUsage,
			'/v1/chat/completions': CHAT_OK,
		});

		await expect(
			generateText({ model: build({ url: PROXY }, fetchFn), prompt: 'hi', maxRetries: 0 }),
		).rejects.toThrow('no output');
		expect(paths(calls)).toEqual(['/v1/responses']);

		const { text } = await generateText({ model: build({ url: PROXY }, fetchFn), prompt: 'hi' });

		expect(text).toBe('from chat');
		expect(paths(calls)).toEqual(['/v1/responses', '/v1/chat/completions']);
	});

	it('keeps a Chat Completions stream served on /responses, and moves on to chat', async () => {
		// The installed SDK reports this mismatch inside the stream instead of
		// throwing, so the answer is never replayed on the other route.
		const { fetchFn, calls } = fakeEndpoint({
			'/v1/responses': CHAT_STREAM_OK,
			'/v1/chat/completions': CHAT_STREAM_OK,
		});
		const model = build({ url: PROXY }, fetchFn) as unknown as EndpointModel;

		const parts = await readStream((await model.doStream({ prompt: PROMPT })).stream);

		const failure = parts.find((part) => part.type === 'error');
		expect(failure?.error).toMatchObject({
			message: expect.stringContaining('Chat Completions'),
		});
		expect(paths(calls)).toEqual(['/v1/responses']);

		const second = build({ url: PROXY }, fetchFn) as unknown as EndpointModel;
		const chatParts = await readStream((await second.doStream({ prompt: PROMPT })).stream);

		expect(chatParts).toContainEqual(
			expect.objectContaining({ type: 'text-delta', delta: 'from chat' }),
		);
		expect(paths(calls)).toEqual(['/v1/responses', '/v1/chat/completions']);
	});

	it('reports a catch-all page on an explicitly pinned route, without falling back', async () => {
		// `apiStyle` pins the route, so there is nothing to fall back to — but the
		// page must still surface as an error instead of as an empty stream.
		const { fetchFn, calls } = fakeEndpoint({
			'/v1/chat/completions': {
				status: 200,
				body: '<!doctype html><title>n8n</title>',
				contentType: 'text/html; charset=utf-8',
			},
			'/v1/responses': RESPONSES_STREAM_OK,
		});
		const model = build({ url: PROXY, apiStyle: 'chat' }, fetchFn) as unknown as EndpointModel;

		await expect(model.doStream({ prompt: PROMPT })).rejects.toThrow('Invalid JSON response');
		expect(paths(calls)).toEqual(['/v1/chat/completions']);
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
		it('resolves environment API keys for each call on the same model', async () => {
			try {
				vi.stubEnv('OPENAI_API_KEY', 'sk-test-chat');
				const { fetchFn, calls } = fakeEndpoint((call) => {
					const responses = call.headers.get('authorization') === 'Bearer sk-test-responses';
					if (call.path !== (responses ? '/v1/responses' : '/v1/chat/completions'))
						return { status: 404 };
					return responses ? RESPONSES_OK : CHAT_OK;
				});
				const model = build({ url: PROXY, apiKey: undefined }, fetchFn);
				expect((await generateText({ model, prompt: 'hi', maxRetries: 0 })).text).toBe('from chat');
				vi.stubEnv('OPENAI_API_KEY', 'sk-test-responses');
				expect((await generateText({ model, prompt: 'hi', maxRetries: 0 })).text).toBe(
					'from responses',
				);
				expect(paths(calls)).toEqual(['/v1/responses', '/v1/chat/completions', '/v1/responses']);
				expect(calls.map((call) => call.headers.get('authorization'))).toEqual([
					'Bearer sk-test-chat',
					'Bearer sk-test-chat',
					'Bearer sk-test-responses',
				]);
			} finally {
				vi.unstubAllEnvs();
			}
		});

		it('keeps an explicit API key and its decision when the environment changes', async () => {
			try {
				vi.stubEnv('OPENAI_API_KEY', 'sk-test-chat');
				const { fetchFn, calls } = fakeEndpoint({ '/v1/chat/completions': CHAT_OK });
				const model = build({ url: PROXY }, fetchFn);
				expect((await generateText({ model, prompt: 'hi', maxRetries: 0 })).text).toBe('from chat');
				vi.stubEnv('OPENAI_API_KEY', 'sk-test-responses');
				expect((await generateText({ model, prompt: 'hi', maxRetries: 0 })).text).toBe('from chat');
				expect(paths(calls)).toEqual([
					'/v1/responses',
					'/v1/chat/completions',
					'/v1/chat/completions',
				]);
				for (const call of calls) expect(call.headers.get('authorization')).toBe('Bearer sk-fake');
			} finally {
				vi.unstubAllEnvs();
			}
		});

		it('keeps separate decisions for one and two root slashes', async () => {
			const { fetchFn, calls } = fakeEndpoint({
				'/chat/completions': CHAT_OK,
				'//responses': RESPONSES_OK,
			});
			for (const [url, text] of [
				['https://proxy.example/', 'from chat'],
				['https://proxy.example//', 'from responses'],
			]) {
				expect(
					(await generateText({ model: build({ url }, fetchFn), prompt: 'hi', maxRetries: 0 }))
						.text,
				).toBe(text);
			}
			expect(paths(calls)).toEqual(['/responses', '/chat/completions', '//responses']);
		});

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

		it('keeps raw routing header distinctions and URL userinfo in hashed keys', () => {
			const key = (headers: Record<string, string | undefined>) =>
				endpointRouteKey(PROXY, { headers: { 'x-tenant': 'chat' } }, headers);
			expect(
				new Set([
					key({}),
					key({ 'x-tenant': undefined }),
					key({ 'x-tenant': 'responses' }),
					key({ 'X-Tenant': 'responses' }),
					key({ 'x-tenant': 'chat', 'X-Tenant': 'responses' }),
					key({ 'X-Tenant': 'responses', 'x-tenant': 'chat' }),
				]).size,
			).toBe(6);
			expect(endpointRouteKey('https://user:one@proxy.example/v1', {})).not.toBe(
				endpointRouteKey('https://user:two@proxy.example/v1', {}),
			);
			expect(endpointRouteKey('https://PROXY.example/v1/', {})).toBe(endpointRouteKey(PROXY, {}));
			expect(endpointRouteKey(`${PROXY}//`, {})).not.toBe(endpointRouteKey(`${PROXY}/`, {}));
		});

		it('keeps separate decisions for a path slash before a query', async () => {
			const { fetchFn, calls } = fakeEndpoint((call, url) => {
				const responses = call.path === '/openai/';
				if (url.searchParams.get('path') !== (responses ? '/responses' : '/chat/completions'))
					return { status: 404 };
				return responses ? RESPONSES_OK : CHAT_OK;
			});
			for (const [url, text] of [
				['https://query.example/openai?deployment=x&path=', 'from chat'],
				['https://query.example/openai/?deployment=x&path=', 'from responses'],
			]) {
				expect(
					(await generateText({ model: build({ url }, fetchFn), prompt: 'hi', maxRetries: 0 }))
						.text,
				).toBe(text);
			}
			expect(paths(calls)).toEqual(['/openai', '/openai', '/openai/']);
		});

		it.each(['generate', 'stream'] as const)(
			'isolates sequential per-call headers for %s',
			async (mode) => {
				const { fetchFn, calls } = fakeEndpoint((call) => {
					const responses = call.headers.get('x-tenant') !== 'chat';
					if (call.path !== (responses ? '/v1/responses' : '/v1/chat/completions'))
						return { status: 404 };
					return call.body.stream
						? responses
							? RESPONSES_STREAM_OK
							: CHAT_STREAM_OK
						: responses
							? RESPONSES_OK
							: CHAT_OK;
				});
				const model = build({ url: PROXY, headers: { 'x-tenant': 'chat' } }, fetchFn);
				const generate = async (headers: Record<string, string | undefined>) => {
					if (mode === 'generate')
						return (await generateText({ model, headers, prompt: 'hi', maxRetries: 0 })).text;
					const parts = await readStream(
						(await (model as unknown as EndpointModel).doStream({ prompt: PROMPT, headers }))
							.stream,
					);
					return parts
						.filter((part) => part.type === 'text-delta')
						.map((part) => part.delta)
						.join('');
				};
				expect(await generate({})).toBe('from chat');
				for (const headers of [
					{ 'x-tenant': 'responses' },
					{ 'x-tenant': undefined },
					{ 'X-Tenant': 'responses' },
					{ 'x-tenant': 'chat', 'X-Tenant': 'responses' },
				]) {
					// generateText removes undefined headers before it calls the model.
					expect(await generate(headers)).toBe(
						mode === 'generate' && 'x-tenant' in headers && headers['x-tenant'] === undefined
							? 'from chat'
							: 'from responses',
					);
				}
				expect(await generate({})).toBe('from chat');
				// Direct streaming also resolves its own call headers.
				const stream = await (model as unknown as EndpointModel).doStream({
					prompt: PROMPT,
					headers: {},
				});
				await readStream(stream.stream);
				expect(paths(calls)).toEqual([
					'/v1/responses',
					'/v1/chat/completions',
					'/v1/responses',
					mode === 'generate' ? '/v1/chat/completions' : '/v1/responses',
					'/v1/responses',
					'/v1/responses',
					'/v1/chat/completions',
					...(mode === 'generate' ? ['/v1/responses'] : []),
					'/v1/chat/completions',
				]);
			},
		);

		it.each(['generate', 'stream'] as const)(
			'isolates concurrent per-call probes for %s',
			async (mode) => {
				const gate = held();
				const { fetchFn, calls } = fakeEndpoint((call) => {
					const responses = call.headers.get('x-tenant') === 'responses';
					if (call.path !== (responses ? '/v1/responses' : '/v1/chat/completions'))
						return { status: 404, wait: gate.promise };
					return mode === 'stream'
						? responses
							? RESPONSES_STREAM_OK
							: CHAT_STREAM_OK
						: responses
							? RESPONSES_OK
							: CHAT_OK;
				});
				const model = build({ url: PROXY, headers: { 'x-tenant': 'chat' } }, fetchFn);
				const run = async (tenant: string) => {
					const headers = { 'x-tenant': tenant };
					if (mode === 'generate')
						return (await generateText({ model, headers, prompt: 'hi', maxRetries: 0 })).text;
					const parts = await readStream(
						(await (model as unknown as EndpointModel).doStream({ prompt: PROMPT, headers }))
							.stream,
					);
					return parts
						.filter((part) => part.type === 'text-delta')
						.map((part) => part.delta)
						.join('');
				};
				const chat = run('chat');
				await until(() => calls.length === 1);
				const responses = run('responses');
				try {
					expect(await withinTimeout(responses)).toBe('from responses');
				} finally {
					gate.release();
				}
				expect(await chat).toBe('from chat');
				expect(await run('chat')).toBe('from chat');
				expect(paths(calls)).toEqual([
					'/v1/responses',
					'/v1/responses',
					'/v1/chat/completions',
					'/v1/chat/completions',
				]);
				expect(calls.map((call) => call.headers.get('x-tenant'))).toEqual([
					'chat',
					'responses',
					'chat',
					'chat',
				]);
			},
		);

		it.each(['generate', 'stream'] as const)(
			'publishes each per-call owner route before the %s body ends',
			async (mode) => {
				const answer = mode === 'stream' ? RESPONSES_STREAM_OK : RESPONSES_OK;
				const bodies = [heldBody(answer.body), heldBody(answer.body)];
				const served = new Set<number>();
				const gates = [held(), held()];
				const { fetchFn, calls } = fakeEndpoint((call) => {
					const index = call.headers.get('x-tenant') === 'a' ? 0 : 1;
					if (served.has(index)) return answer;
					served.add(index);
					return { ...answer, bodyStream: bodies[index].stream, wait: gates[index].promise };
				});
				const model = build({ url: PROXY }, fetchFn);
				const run = async (tenant: string) => {
					const headers = { 'x-tenant': tenant };
					if (mode === 'generate')
						return await generateText({ model, headers, prompt: 'hi', maxRetries: 0 });
					return await readStream(
						(await (model as unknown as EndpointModel).doStream({ prompt: PROMPT, headers }))
							.stream,
					);
				};
				// Followers get their own bodies after each owner's transport publishes.
				const owners = [run('a'), run('b')];
				try {
					await until(() => calls.length === 2);
					const followers = [run('a'), run('b')];
					gates[0].release();
					await until(() => calls.length === 3);
					expect(calls[2].headers.get('x-tenant')).toBe('a');
					gates[1].release();
					await until(() => calls.length === 4);
					expect(calls[3].headers.get('x-tenant')).toBe('b');
					bodies.forEach((body) => body.release());
					await Promise.all(followers);
					await Promise.all(owners);
				} finally {
					gates.forEach((gate) => gate.release());
					bodies.forEach((body) => body.release());
					await Promise.allSettled(owners);
				}
				expect(paths(calls)).toEqual(Array(4).fill('/v1/responses'));
			},
		);

		it('keeps a known /responses endpoint after one transient refusal', async () => {
			// A proxy in front of real OpenAI answers one bodyless 404 during a
			// rolling deploy and serves chat meanwhile. That must not take /responses
			// away from every model on the endpoint until the decision expires.
			const calls: string[] = [];
			let refusing = false;
			const fetchFn = (async (url: unknown) => {
				const { pathname } = new URL(String(url));
				calls.push(pathname);
				await Promise.resolve();
				if (pathname === '/v1/responses' && refusing) return new Response('', { status: 404 });
				const answer = pathname === '/v1/responses' ? RESPONSES_OK : CHAT_OK;
				return new Response(answer.body, {
					status: 200,
					headers: { 'content-type': 'application/json' },
				});
			}) as unknown as typeof globalThis.fetch;
			const generate = async () =>
				(await generateText({ model: build({ url: PROXY }, fetchFn), prompt: 'hi', maxRetries: 0 }))
					.text;

			expect(await generate()).toBe('from responses');
			refusing = true;
			expect(await generate()).toBe('from chat');
			refusing = false;
			// A fresh model instance, as `RuntimeContextBuilder` builds every turn.
			expect(await generate()).toBe('from responses');

			expect(calls).toEqual([
				'/v1/responses',
				'/v1/responses',
				'/v1/chat/completions',
				'/v1/responses',
			]);
		});

		it('keeps separate decisions for credentials with different routing headers', async () => {
			// Header-routed gateways are common: one base URL, and the header decides
			// which server answers. The first credential must not decide for the other.
			const calls: string[] = [];
			const fetchFn = (async (url: unknown, init?: RequestInit) => {
				const { pathname } = new URL(String(url));
				calls.push(pathname);
				await Promise.resolve();
				const served =
					new Headers(init?.headers).get('x-tenant') === 'proxy'
						? '/v1/responses'
						: '/v1/chat/completions';
				if (pathname !== served) return new Response('', { status: 404 });
				const answer = served === '/v1/responses' ? RESPONSES_OK : CHAT_OK;
				return new Response(answer.body, {
					status: 200,
					headers: { 'content-type': 'application/json' },
				});
			}) as unknown as typeof globalThis.fetch;
			const generate = async (tenant: string) =>
				(
					await generateText({
						model: build({ url: PROXY, headers: { 'x-tenant': tenant } }, fetchFn),
						prompt: 'hi',
						maxRetries: 0,
					})
				).text;

			expect(await generate('compat')).toBe('from chat');
			expect(await generate('proxy')).toBe('from responses');
			expect(calls).toEqual(['/v1/responses', '/v1/chat/completions', '/v1/responses']);
		});

		it('publishes the route when the answer starts, not when its body ends', async () => {
			// A streaming answer's headers arrive long before its body ends, and a
			// server may hold a buffered body back too. Either way a second call must
			// not sit through a whole completion to learn the route; where the body
			// does arrive with the headers, `PROBE_WAIT_MS` is the backstop.
			const body = held();
			const calls: string[] = [];
			const fetchFn = (async (url: unknown) => {
				calls.push(new URL(String(url)).pathname);
				await Promise.resolve();
				return new Response(
					new ReadableStream<Uint8Array>({
						async start(controller) {
							await body.promise;
							controller.enqueue(new TextEncoder().encode(RESPONSES_OK.body));
							controller.close();
						},
					}),
					{ status: 200, headers: { 'content-type': 'application/json' } },
				);
			}) as unknown as typeof globalThis.fetch;
			const model = build({ url: PROXY }, fetchFn);

			const first = generateText({ model, prompt: 'hi' });
			const second = generateText({ model, prompt: 'hi' });
			await until(() => calls.length === 2);
			body.release();

			expect((await Promise.all([first, second])).map((r) => r.text)).toEqual([
				'from responses',
				'from responses',
			]);
			expect(calls).toEqual(['/v1/responses', '/v1/responses']);
		});

		it('stops waiting for a probe that hangs and asks the endpoint itself', async () => {
			// The first call's request never answers. Waiting on it without a bound
			// would hold every other call on the endpoint for as long as it hangs.
			vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
			try {
				const hang = held();
				const { fetchFn, calls } = fakeEndpoint({
					'/v1/responses': { ...RESPONSES_OK, wait: hang.promise },
				});
				const model = build({ url: PROXY }, fetchFn);

				const leader = generateText({ model, prompt: 'hi' });
				const follower = generateText({ model, prompt: 'hi' });
				await until(
					() => calls.length === 2,
					() => vi.advanceTimersByTime(60_000),
				);
				hang.release();

				expect((await Promise.all([leader, follower])).map((r) => r.text)).toEqual([
					'from responses',
					'from responses',
				]);
			} finally {
				vi.useRealTimers();
			}
		});

		it('re-probes after the decision expires, even while the first call still hangs', async () => {
			// The call that started the probe never answers. Its probe must lose the
			// endpoint at the same bound a waiting call has, or the decision the next
			// call wrote would stay valid past its TTL for as long as that call hangs.
			vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
			try {
				const hang = held();
				let servesResponses = false;
				const calls: string[] = [];
				const answer = (route: Route) =>
					new Response(route.body, {
						status: 200,
						headers: { 'content-type': 'application/json' },
					});
				const fetchFn = (async (url: unknown, init?: RequestInit) => {
					const { pathname } = new URL(String(url));
					calls.push(pathname);
					await Promise.resolve();
					if (pathname !== '/v1/responses') return answer(CHAT_OK);
					// Only the very first /responses request hangs.
					if (calls.filter((path) => path === '/v1/responses').length === 1) {
						await Promise.race([hang.promise, untilAborted(init?.signal)]);
					}
					return servesResponses ? answer(RESPONSES_OK) : new Response('', { status: 404 });
				}) as unknown as typeof globalThis.fetch;
				const generate = async () =>
					(
						await generateText({
							model: build({ url: PROXY }, fetchFn),
							prompt: 'hi',
							maxRetries: 0,
						})
					).text;

				const leader = generate();
				const follower = generate();
				await until(
					() => calls.length === 3,
					() => vi.advanceTimersByTime(1_000),
				);
				expect(await follower).toBe('from chat');

				// The endpoint gains the route, and the first call has still not answered.
				vi.setSystemTime(Date.now() + 5 * 60 * 1000 + 1);
				servesResponses = true;

				expect(await generate()).toBe('from responses');
				expect(calls).toEqual([
					'/v1/responses',
					'/v1/responses',
					'/v1/chat/completions',
					'/v1/responses',
				]);

				// The hung call finishes last. It owns nothing any more, so it neither
				// drops nor settles the decision the later calls made.
				hang.release();
				expect(await leader).toBe('from responses');
				expect(await generate()).toBe('from responses');
				expect(calls.filter((path) => path === '/v1/chat/completions')).toHaveLength(1);
			} finally {
				vi.useRealTimers();
			}
		});

		it('keeps a successor probe waiting when the old request sends headers', async () => {
			vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
			const oldHeaders = held();
			const newHeaders = held();
			const oldBody = heldBody(RESPONSES_OK.body);
			const newBody = heldBody(RESPONSES_OK.body);
			try {
				const routes: Record<string, Route> = {
					'/v1/responses': {
						...RESPONSES_OK,
						wait: oldHeaders.promise,
						bodyStream: oldBody.stream,
					},
				};
				const { fetchFn, calls } = fakeEndpoint(routes);
				const model = build({ url: PROXY }, fetchFn);
				const generate = async () => await generateText({ model, prompt: 'hi', maxRetries: 0 });
				const old = generate();
				await until(() => calls.length === 1);
				vi.setSystemTime(Date.now() + 11_000);
				routes['/v1/responses'] = {
					...RESPONSES_OK,
					wait: newHeaders.promise,
					bodyStream: newBody.stream,
				};
				const successor = generate();
				await until(() => calls.length === 2);
				routes['/v1/responses'] = RESPONSES_OK;
				const follower = generate();
				await until(() => vi.getTimerCount() === 1);

				oldHeaders.release();
				await new Promise<void>((resolve) => setImmediate(resolve));
				const afterOldHeaders = paths(calls);
				oldBody.release();
				expect((await old).text).toBe('from responses');
				const afterOldCompletion = paths(calls);

				newHeaders.release();
				await until(() => calls.length === 3);
				expect((await follower).text).toBe('from responses');
				newBody.release();
				expect((await successor).text).toBe('from responses');
				expect(afterOldHeaders).toEqual(['/v1/responses', '/v1/responses']);
				expect(afterOldCompletion).toEqual(afterOldHeaders);
				expect(paths(calls)).toEqual(['/v1/responses', '/v1/responses', '/v1/responses']);
			} finally {
				oldHeaders.release();
				newHeaders.release();
				oldBody.release();
				newBody.release();
				vi.useRealTimers();
			}
		});

		it('keeps successor Responses headers when an old chat completion finishes', async () => {
			vi.useFakeTimers({ toFake: ['Date'] });
			const oldBody = heldBody(CHAT_OK.body);
			const newBody = heldBody(RESPONSES_OK.body);
			try {
				const routes: Record<string, Route> = {
					'/v1/chat/completions': { ...CHAT_OK, bodyStream: oldBody.stream },
				};
				const { fetchFn, calls } = fakeEndpoint(routes);
				const model = build({ url: PROXY }, fetchFn);
				const generate = async () => await generateText({ model, prompt: 'hi', maxRetries: 0 });
				const old = generate();
				await until(() => calls.length === 2);
				vi.setSystemTime(Date.now() + 11_000);
				routes['/v1/responses'] = { ...RESPONSES_OK, bodyStream: newBody.stream };
				const successor = generate();
				await until(() => calls.length === 3);

				oldBody.release();
				expect((await old).text).toBe('from chat');
				routes['/v1/responses'] = RESPONSES_OK;
				routes['/v1/chat/completions'] = CHAT_OK;
				const follower = await generate();
				newBody.release();
				expect((await successor).text).toBe('from responses');
				expect(follower.text).toBe('from responses');
				expect(paths(calls)).toEqual([
					'/v1/responses',
					'/v1/chat/completions',
					'/v1/responses',
					'/v1/responses',
				]);
			} finally {
				oldBody.release();
				newBody.release();
				vi.useRealTimers();
			}
		});

		it('keeps successor Responses headers after a late stream mismatch', async () => {
			vi.useFakeTimers({ toFake: ['Date'] });
			const oldBody = heldBody(
				CHAT_STREAM_OK.body,
				'data: {"type":"response.output_item.added","output_index":0,"item":{"type":"message","id":"msg_1"}}\n\n',
			);
			const newBody = heldBody(RESPONSES_OK.body);
			try {
				const routes: Record<string, Route> = {
					'/v1/responses': { ...RESPONSES_STREAM_OK, bodyStream: oldBody.stream },
					'/v1/chat/completions': CHAT_OK,
				};
				const { fetchFn, calls } = fakeEndpoint(routes);
				const model = build({ url: PROXY }, fetchFn) as unknown as EndpointModel;
				// Direct SDK calls keep the routing headers identical for all three requests.
				const { stream } = await model.doStream({ prompt: PROMPT });
				const parts = readStream(stream);
				// doStream has released its probe. Its cached decision stays unchanged
				// while the successor waits for its response body.
				vi.setSystemTime(Date.now() + 5 * 60 * 1000 + 1);
				routes['/v1/responses'] = { ...RESPONSES_OK, bodyStream: newBody.stream };
				const successor = model.doGenerate({ prompt: PROMPT });
				await until(() => calls.length === 2);

				oldBody.release();
				expect(await parts).toContainEqual(
					expect.objectContaining({
						type: 'error',
						error: expect.objectContaining({
							message: expect.stringContaining('Chat Completions'),
						}),
					}),
				);
				routes['/v1/responses'] = RESPONSES_OK;
				const follower = await model.doGenerate({ prompt: PROMPT });
				newBody.release();
				expect((await successor).content).toContainEqual(
					expect.objectContaining({ type: 'text', text: 'from responses' }),
				);
				expect(follower.content).toContainEqual(
					expect.objectContaining({ type: 'text', text: 'from responses' }),
				);
				for (const call of calls) expect(call.headers).toEqual(calls[0].headers);
				expect(paths(calls)).toEqual(['/v1/responses', '/v1/responses', '/v1/responses']);
			} finally {
				oldBody.release();
				newBody.release();
				vi.useRealTimers();
			}
		});

		it('caches a long completion when no successor starts', async () => {
			vi.useFakeTimers({ toFake: ['Date'] });
			const body = heldBody(CHAT_OK.body);
			try {
				const routes = {
					'/v1/chat/completions': { ...CHAT_OK, bodyStream: body.stream },
				};
				const { fetchFn, calls } = fakeEndpoint(routes);
				const model = build({ url: PROXY }, fetchFn);
				const slow = generateText({ model, prompt: 'hi', maxRetries: 0 });
				await until(() => calls.length === 2);
				vi.setSystemTime(Date.now() + 60_000);
				body.release();
				expect((await slow).text).toBe('from chat');

				const next = fakeEndpoint({ '/v1/chat/completions': CHAT_OK });
				await generateText({ model: build({ url: PROXY }, next.fetchFn), prompt: 'hi' });
				expect(paths(next.calls)).toEqual(['/v1/chat/completions']);
			} finally {
				body.release();
				vi.useRealTimers();
			}
		});

		it('caches a completed generation that a later call overlapped', async () => {
			// A chat-only server with generations longer than the probe wait, and one
			// call every few seconds: the call that starts second must not take the
			// decision away from the one that answers first, or the endpoint never
			// decides and every turn pays for a /responses request that fails.
			vi.useFakeTimers({ toFake: ['Date'] });
			const firstBody = heldBody(CHAT_OK.body);
			const secondBody = heldBody(CHAT_OK.body);
			try {
				const routes: Record<string, Route> = {
					'/v1/chat/completions': { ...CHAT_OK, bodyStream: firstBody.stream },
				};
				const { fetchFn, calls } = fakeEndpoint(routes);
				const model = build({ url: CHAT_ONLY }, fetchFn);
				const generate = async () => await generateText({ model, prompt: 'hi', maxRetries: 0 });

				const slow = generate();
				await until(() => calls.length === 2);
				// Past the probe wait, so the next call probes on its own.
				vi.setSystemTime(Date.now() + 11_000);
				routes['/v1/chat/completions'] = { ...CHAT_OK, bodyStream: secondBody.stream };
				const overlapping = generate();
				await until(() => calls.length === 4);

				firstBody.release();
				expect((await slow).text).toBe('from chat');
				// Both probes have stopped taking waiters, so this call reads the
				// decision the finished generation wrote or asks the endpoint itself.
				vi.setSystemTime(Date.now() + 11_000);
				routes['/v1/chat/completions'] = CHAT_OK;
				expect((await generate()).text).toBe('from chat');

				expect(paths(calls)).toEqual([
					'/v1/responses',
					'/v1/chat/completions',
					'/v1/responses',
					'/v1/chat/completions',
					'/v1/chat/completions',
				]);
				secondBody.release();
				expect((await overlapping).text).toBe('from chat');
			} finally {
				firstBody.release();
				secondBody.release();
				vi.useRealTimers();
			}
		});

		it('keeps the newest Responses headers when an older generation finishes late', async () => {
			// Three generations, and the middle one fails, so neither map holds the
			// oldest call any more when the newest one reports the route. Its chat
			// answer still must not decide the endpoint over the newer evidence.
			vi.useFakeTimers({ toFake: ['Date'] });
			const slowChat = heldBody(CHAT_OK.body);
			const newAnswer = heldBody(RESPONSES_OK.body);
			try {
				const routes: Record<string, Route> = {
					'/v1/chat/completions': { ...CHAT_OK, bodyStream: slowChat.stream },
				};
				const { fetchFn, calls } = fakeEndpoint(routes);
				const model = build({ url: PROXY }, fetchFn);
				const generate = async () => await generateText({ model, prompt: 'hi', maxRetries: 0 });

				const old = generate();
				await until(() => calls.length === 2);
				vi.setSystemTime(Date.now() + 11_000);

				// A 500 says nothing about the route, so this call decides nothing.
				routes['/v1/responses'] = {
					status: 500,
					body: '{"error":{"message":"boom","type":"server_error"}}',
					contentType: 'application/json',
				};
				await expect(generate()).rejects.toThrow('boom');

				// The newest call reports the route with its headers, body still open.
				routes['/v1/responses'] = { ...RESPONSES_OK, bodyStream: newAnswer.stream };
				const successor = generate();
				await until(() => calls.length === 4);

				slowChat.release();
				expect((await old).text).toBe('from chat');
				newAnswer.release();
				expect((await successor).text).toBe('from responses');

				routes['/v1/responses'] = RESPONSES_OK;
				expect((await generate()).text).toBe('from responses');
				expect(paths(calls)).toEqual([
					'/v1/responses',
					'/v1/chat/completions',
					'/v1/responses',
					'/v1/responses',
					'/v1/responses',
				]);
			} finally {
				slowChat.release();
				newAnswer.release();
				vi.useRealTimers();
			}
		});

		it('re-probes when the newest answer lost its body after the headers', async () => {
			// Same three generations, but the newest one dies too: it reports the route
			// with its headers and then loses the body, so by the time the oldest call
			// finishes, no map holds any probe at all. The oldest call must still see
			// that the route answered while it was running, or it caches chat over it
			// and every later turn skips /responses.
			vi.useFakeTimers({ toFake: ['Date'] });
			const slowChat = heldBody(CHAT_OK.body);
			try {
				const routes: Record<string, Route> = {
					'/v1/chat/completions': { ...CHAT_OK, bodyStream: slowChat.stream },
				};
				const { fetchFn, calls } = fakeEndpoint(routes);
				const model = build({ url: PROXY }, fetchFn);
				const generate = async () => await generateText({ model, prompt: 'hi', maxRetries: 0 });

				const old = generate();
				await until(() => calls.length === 2);
				vi.setSystemTime(Date.now() + 11_000);

				// A 500 says nothing about the route, and its probe leaves both maps empty.
				routes['/v1/responses'] = {
					status: 500,
					body: '{"error":{"message":"boom","type":"server_error"}}',
					contentType: 'application/json',
				};
				await expect(generate()).rejects.toThrow('boom');

				// The newest call gets the route's headers and then loses the body, so it
				// leaves both maps empty as well.
				routes['/v1/responses'] = { ...RESPONSES_OK, bodyStream: brokenBody() };
				await expect(generate()).rejects.toThrow();

				slowChat.release();
				expect((await old).text).toBe('from chat');

				routes['/v1/responses'] = RESPONSES_OK;
				expect((await generate()).text).toBe('from responses');
				expect(paths(calls)).toEqual([
					'/v1/responses',
					'/v1/chat/completions',
					'/v1/responses',
					'/v1/responses',
					'/v1/responses',
				]);
			} finally {
				slowChat.release();
				vi.useRealTimers();
			}
		});

		it('keeps the busiest endpoint when the memory is full', async () => {
			// A Map does not move a key that is set again, so evicting by insertion
			// order drops the endpoint that has been in use the longest.
			const probed: string[] = [];
			const stub = (specificationVersion: string, answer: () => unknown) =>
				({
					specificationVersion,
					provider: 'stub',
					modelId: 'stub',
					supportedUrls: {},
					doGenerate: async () => await Promise.resolve(answer()),
					doStream: async () => await Promise.resolve(answer()),
				}) as unknown as Parameters<typeof withChatCompletionsFallback>[1];
			const call = async (endpoint: string) => {
				const model = withChatCompletionsFallback(
					endpoint,
					stub('v4', () => {
						probed.push(endpoint);
						throw Object.assign(new Error('Not Found'), { statusCode: 404 });
					}),
					stub('v2', () => ({
						content: [],
						finishReason: 'stop',
						usage: { inputTokens: 1, outputTokens: 1 },
						warnings: [],
					})),
				) as unknown as { doGenerate: (options: unknown) => Promise<unknown> };
				await model.doGenerate({ prompt: PROMPT });
			};

			await call('busy');
			for (let i = 0; i < 49; i++) await call(`idle-${i}`);
			await call('busy'); // answered from memory, and counts as recent use
			await call('overflow'); // fills the memory, so one entry is evicted
			probed.length = 0;
			await call('busy');

			expect(probed).toEqual([]);
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

	it('uses the global fetch installed after the model was built', async () => {
		// With no transport injected, both routes must resolve `globalThis.fetch` at
		// request time, the way the SDK does. A snapshot taken while the model was
		// built sends the /responses request through the transport it replaced.
		vi.stubEnv('HTTPS_PROXY', '');
		vi.stubEnv('HTTP_PROXY', '');
		const model = createModel({ id: 'openai/gpt-5.6', apiKey: 'sk-fake', url: CHAT_ONLY });
		const { fetchFn, calls } = fakeEndpoint({ '/v1/chat/completions': CHAT_OK });
		const installed = globalThis.fetch;
		globalThis.fetch = fetchFn;

		try {
			expect((await generateText({ model, prompt: 'hi' })).text).toBe('from chat');
		} finally {
			globalThis.fetch = installed;
			vi.unstubAllEnvs();
		}
		expect(paths(calls)).toEqual(['/v1/responses', '/v1/chat/completions']);
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
