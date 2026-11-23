import type { INode, NodeEgressFilter } from 'n8n-workflow';

import { createCustomModelEndpointAuthFetch } from './auth-fetch';
import type { CustomModelEndpointFetchContext } from './auth-fetch';
import { clientErrorMessage, wrapCustomModelEndpointErrorFetch } from './error-handling';
import type { EndpointCredential } from './types';

const BASE_URL = 'https://gateway.example.com/v1';
const KEY = 'sk-live-9f2a71c4ab';

const failingWith = (body: string, status = 401) =>
	(async () => new Response(body, { status, statusText: 'Unauthorized' })) as typeof fetch;

const surfaced = async (body: string) => {
	const response = await wrapCustomModelEndpointErrorFetch(failingWith(body))(BASE_URL);
	const parsed: unknown = JSON.parse(await response.text());
	return (parsed as { error?: { message?: unknown } }).error?.message;
};

const html = (inner: string) => `<html><body>${inner}</body></html>`;
const titled = (title: string) => `<html><head><title>${title}</title></head></html>`;

describe('wrapCustomModelEndpointErrorFetch', () => {
	it.each([
		[
			'a top-level message, as API management and Databricks send',
			{ statusCode: 401, message: 'Access denied due to missing subscription key.' },
			'Access denied due to missing subscription key.',
		],
		['an error that is a bare string', { error: 'quota exceeded' }, 'quota exceeded'],
		[
			'an OAuth error_description ahead of the code beside it',
			{ error: 'invalid_client', error_description: 'Bad client' },
			'Bad client',
		],
		['the detail a FastAPI gateway sends', { detail: 'Not authenticated' }, 'Not authenticated'],
		[
			'a message ahead of the detail beside it',
			{ message: 'Subscription key is invalid', detail: 'Not authenticated' },
			'Subscription key is invalid',
		],
	])('surfaces %s', async (_name, body, expected) => {
		expect(await surfaced(JSON.stringify(body))).toBe(expected);
	});

	it.each([
		['plain text', 'Unauthorized\n', 'Unauthorized'],
		['a body that never parsed as JSON', '{oops', '{oops'],
		[
			'the title of an HTML error page',
			titled('503 Service Unavailable'),
			'503 Service Unavailable',
		],
		[
			'an HTML page without a title, flattened',
			html('<h1>Gateway   Timeout</h1>'),
			'Gateway Timeout',
		],
	])('surfaces %s', async (_name, body, expected) => {
		expect(await surfaced(body)).toBe(expected);
	});

	it.each([
		['&amp;', 'Denied & here'],
		['&lt;', 'Denied < here'],
		['&gt;', 'Denied > here'],
		['&quot;', 'Denied " here'],
		['&apos;', "Denied ' here"],
		['&#8212;', 'Denied \u2014 here'],
		['&#x2014;', 'Denied \u2014 here'],
		['&nbsp;', 'Denied here'],
	])('decodes %s out of an HTML error page', async (entity, expected) => {
		expect(await surfaced(titled(`Denied ${entity} here`))).toBe(expected);
	});

	it.each([
		[
			'one already shaped for the client',
			JSON.stringify({ error: { message: 'Model not found', type: 'invalid_request' } }),
		],
		['an empty one', ''],
		['JSON that is not an object', '[1,2,3]'],
	])('passes through %s unchanged', async (_name, body) => {
		const response = await wrapCustomModelEndpointErrorFetch(failingWith(body))(BASE_URL);

		expect(await response.text()).toBe(body);
	});

	// A credential with nothing to hide leaves the response object itself untouched
	it('hands back the very same 200 when there is no secret to remove', async () => {
		const ok = new Response('{"choices":[{"text":"hello"}]}', { status: 200 });
		const wrapped = wrapCustomModelEndpointErrorFetch((async () => ok) as typeof fetch);

		expect(await wrapped(BASE_URL)).toBe(ok);
	});

	it('keeps the status the gateway sent', async () => {
		const wrapped = wrapCustomModelEndpointErrorFetch(failingWith('Too many requests', 429));

		expect((await wrapped(BASE_URL)).status).toBe(429);
	});

	it('truncates a body long enough to be a page rather than a sentence', async () => {
		const message = String(await surfaced('x'.repeat(900)));

		expect(message.length).toBeLessThan(900);
		expect(message.endsWith('…')).toBe(true);
	});
});

describe('clientErrorMessage', () => {
	it.each<[string, string, string | undefined]>([
		['the message the wrapper wrote', '{"error":{"message":"Quota exhausted"}}', 'Quota exhausted'],
		['nothing for a body that is not client-shaped', '{"detail":"Not authenticated"}', undefined],
		['nothing for a message that is empty', '{"error":{"message":""}}', undefined],
		['nothing for a message that is only whitespace', '{"error":{"message":"  "}}', undefined],
	])('reads back %s', (_name, body, expected) => {
		expect(clientErrorMessage(body)).toBe(expected);
	});
});

describe('a rejected login', () => {
	const node = {
		id: '1',
		name: 'Custom Model Endpoint',
		type: 'test',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	} as INode;
	const ctx = { getNode: () => node } as unknown as CustomModelEndpointFetchContext;
	const allowAll = { validateUrl: async () => ({ ok: true }) } as unknown as NodeEgressFilter;

	it('sends one request, because these login methods have nothing to refresh', async () => {
		let calls = 0;
		const baseFetch = (async () => {
			calls += 1;
			return new Response(JSON.stringify({ message: 'Subscription key is invalid' }), {
				status: 401,
			});
		}) as typeof fetch;
		const endpoint: EndpointCredential = {
			baseUrl: BASE_URL,
			login: { type: 'header', name: 'X-Api-Key', prefix: '', key: KEY },
			gatewayHeaders: {},
		};

		const authFetch = createCustomModelEndpointAuthFetch(
			ctx,
			{},
			{
				endpoint,
				egressFilter: allowAll,
				baseFetch,
			},
		);
		const response = await authFetch(BASE_URL);

		expect(calls).toBe(1);
		expect(response.status).toBe(401);
	});
});

describe('a gateway that repeats what it was sent', () => {
	// No vendor prefix, so no pattern inside redactSecrets can cover for the code under test
	const SECRET = 'Zx7Qw2Lm9Rt4Bv6N';
	const TOKEN_URL = 'https://login.example.com/token';

	const node = {
		id: '1',
		name: 'n',
		type: 'test',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	} as INode;
	const ctx = { getNode: () => node } as unknown as CustomModelEndpointFetchContext;
	const allowAll = { validateUrl: async () => ({ ok: true }) } as unknown as NodeEgressFilter;

	/** The login server answers, so an OAuth2 credential reaches the gateway body under test. */
	const routed = (body: string) =>
		(async (url: RequestInfo | URL) =>
			String(url) === TOKEN_URL
				? new Response(JSON.stringify({ access_token: 'minted-token', expires_in: 3600 }), {
						status: 200,
						headers: { 'content-type': 'application/json' },
					})
				: new Response(body, { status: 401, statusText: 'Unauthorized' })) as typeof fetch;

	/** Through the real transport, so the wiring of the secrets is covered with the filter. */
	const bodyFrom = async (endpoint: EndpointCredential, body: string) => {
		const authFetch = createCustomModelEndpointAuthFetch(
			ctx,
			{},
			{ endpoint, egressFilter: allowAll, baseFetch: routed(body) },
		);
		return await (await authFetch(BASE_URL)).text();
	};

	const endpointWith = (
		login: EndpointCredential['login'],
		gatewayHeaders: Record<string, string> = {},
	): EndpointCredential => ({ baseUrl: BASE_URL, login, gatewayHeaders });

	const oauth2 = {
		type: 'oauth2',
		tokenUrl: TOKEN_URL,
		clientId: 'cid',
		clientSecret: SECRET,
		scope: '',
		sendCredentialsIn: 'header',
	} as const;

	it.each([
		['a bearer token', endpointWith({ type: 'bearer', token: SECRET }), SECRET],
		[
			'a key in a named header',
			endpointWith({ type: 'header', name: 'x-api-key', prefix: '', key: SECRET }),
			SECRET,
		],
		[
			'a basic password',
			endpointWith({ type: 'basic', username: 'tenant', password: SECRET }),
			SECRET,
		],
		['an OAuth2 client secret', endpointWith(oauth2), SECRET],
		['the token minted for the request', endpointWith(oauth2), 'minted-token'],
		['a gateway header value', endpointWith({ type: 'none' }, { 'x-tenant-key': SECRET }), SECRET],
		[
			'a gateway header value too short to look like a key',
			endpointWith({ type: 'none' }, { 'x-region': 'eu' }),
			'eu',
		],
	])('keeps %s out of the error', async (_name, endpoint, secret) => {
		const body = JSON.stringify({ error: { message: `bad credential ${secret}` } });

		expect(await bodyFrom(endpoint, body)).not.toContain(secret);
	});

	// The reshape branch rebuilds the message, so it needs the same filter as the pass-through
	it.each([
		[
			'a top-level message, which the client does not understand',
			(k: string) => `{"statusCode":401,"message":"Invalid API key: ${k}"}`,
		],
		['plain text', (k: string) => `Invalid API key: ${k}`],
		[
			'an HTML title',
			(k: string) => `<html><head><title>Invalid API key: ${k}</title></head></html>`,
		],
	])('keeps a secret out of %s', async (_name, bodyFor) => {
		const endpoint = endpointWith({ type: 'bearer', token: SECRET });

		expect(await bodyFrom(endpoint, bodyFor(SECRET))).not.toContain(SECRET);
	});

	// Stored untrimmed, sent trimmed by Headers.set, so the gateway can only echo the trimmed one
	it('keeps a gateway header value the user pasted with whitespace out of the error', async () => {
		const endpoint = endpointWith({ type: 'none' }, { 'x-api-key': `${SECRET}\n` });
		const body = JSON.stringify({ error: { message: `key ${SECRET} is revoked` } });

		expect(await bodyFrom(endpoint, body)).not.toContain(SECRET);
	});

	// The pass-through path hands the body to the client untouched, so it needs the same filter
	it('keeps a secret out of a body the client already understands', async () => {
		const endpoint = endpointWith({ type: 'bearer', token: SECRET });
		const body = JSON.stringify({ error: { message: 'denied', code: 'bad_key', param: SECRET } });

		expect(await bodyFrom(endpoint, body)).not.toContain(SECRET);
	});

	// An empty value must not reach the replacement, where `split('')` shreds the body
	it('survives a gateway header named Authorization with no value', async () => {
		const endpoint = endpointWith({ type: 'none' }, { Authorization: '' });
		const body = JSON.stringify({ error: { message: 'Missing authorization header' } });

		expect(await bodyFrom(endpoint, body)).toContain('Missing authorization header');
	});

	describe('the generic pass over an error body', () => {
		const surfacedFrom = async (body: string) =>
			await (await wrapCustomModelEndpointErrorFetch(failingWith(body))(BASE_URL)).text();

		it('removes a key the gateway forwarded from further upstream', async () => {
			const forwarded = 'sk-proj-0123456789abcdefghijklmn';

			expect(
				await surfacedFrom(`{"error":{"message":"upstream said ${forwarded}"}}`),
			).not.toContain(forwarded);
		});

		// The cost of the pass above: a phrase shaped like a credential goes with it
		it('takes a scheme word followed by a long word with it', async () => {
			const surfaced = await surfacedFrom('{"error":{"message":"Bearer authentication required"}}');

			expect(surfaced).toContain('required');
			expect(surfaced).not.toContain('Bearer authentication');
		});
	});

	describe('a streamed answer', () => {
		const streamed = (frames: string[]) =>
			(async () =>
				new Response(frames.join(''), {
					status: 200,
					headers: { 'content-type': 'text/event-stream' },
				})) as typeof fetch;

		const readAll = async (baseFetch: typeof fetch, login: string[]) =>
			await (await wrapCustomModelEndpointErrorFetch(baseFetch, login)(BASE_URL)).text();

		// The gateway's refusal rides a frame of a 200, so the error path never sees it
		it('keeps a secret out of an error frame', async () => {
			const frames = [
				'data: {"choices":[{"delta":{"content":"hi"}}]}\n\n',
				`data: {"error":{"message":"Incorrect API key provided: ${SECRET}"}}\n\n`,
			];

			expect(await readAll(streamed(frames), [SECRET])).not.toContain(SECRET);
		});

		it('passes every frame on unchanged when none carries a secret', async () => {
			const frames = ['data: one\n\n', 'data: two\n\n', 'data: [DONE]\n\n'];

			expect(await readAll(streamed(frames), [SECRET])).toBe(frames.join(''));
		});

		// Media types are case-insensitive and carry parameters; missing either skips the filter
		it.each([
			['text/event-stream'],
			['Text/Event-Stream'],
			['TEXT/EVENT-STREAM'],
			['text/event-stream; charset=utf-8'],
		])('filters a frame declared %s', async (contentType) => {
			const baseFetch = (async () =>
				new Response(`data: {"error":{"message":"bad key ${SECRET}"}}\n\n`, {
					status: 200,
					headers: { 'content-type': contentType },
				})) as typeof fetch;

			expect(await readAll(baseFetch, [SECRET])).not.toContain(SECRET);
		});

		it.each([
			['a line feed', '\n\n'],
			['a carriage return and line feed', '\r\n\r\n'],
			['a carriage return alone', '\r\r'],
		])('ends a frame on %s', async (_name, boundary) => {
			const frames = [
				`data: {"m":"hi"}${boundary}`,
				`data: {"error":{"message":"bad key ${SECRET}"}}${boundary}`,
			];

			expect(await readAll(streamed(frames), [SECRET])).not.toContain(SECRET);
		});

		/**
		 * The producer holds until the consumer has read, so a transform that buffers instead
		 * of streaming deadlocks and the test times out. No wall clock decides the pass.
		 */
		const releasedWhileProducing = async (contentType: string | null, head: string) => {
			let readFirst = () => {};
			const read = new Promise<void>((resolve) => {
				readFirst = resolve;
			});
			const body = new ReadableStream<Uint8Array>({
				async start(controller) {
					const encoder = new TextEncoder();
					controller.enqueue(encoder.encode(head));
					await read;
					controller.enqueue(encoder.encode('data: [DONE]\n\n'));
					controller.close();
				},
			});
			const baseFetch = (async () =>
				new Response(body, {
					status: 200,
					headers: contentType === null ? {} : { 'content-type': contentType },
				})) as typeof fetch;

			const response = await wrapCustomModelEndpointErrorFetch(baseFetch, [SECRET])(BASE_URL);
			const reader = (response.body as ReadableStream<Uint8Array>).getReader();

			const { value } = await reader.read();
			readFirst();
			void reader.cancel();
			return new TextDecoder().decode(value);
		};

		it.each([
			['a line feed ends the frame', 'text/event-stream', 'data: one\n\n'],
			['a carriage return and line feed end it', 'text/event-stream', 'data: one\r\n\r\n'],
			['a carriage return alone ends it', 'text/event-stream', 'data: one\r\r'],
			['the media type is capitalised', 'Text/Event-Stream', 'data: one\n\n'],
			['the media type carries a charset', 'text/event-stream; charset=utf-8', 'data: one\n\n'],
			['the gateway declares no media type at all', null, 'data: one\n\n'],
		])(
			'releases a frame before the stream ends when %s',
			async (_name, contentType, head) => {
				expect(await releasedWhileProducing(contentType, head)).toBe(head);
			},
			2000,
		);

		// Without a bound a gateway that never ends a frame would hold the whole body in memory
		it('releases a body that never ends a frame, rather than holding it whole', async () => {
			const filler = 'x'.repeat(70 * 1024);

			const released = await releasedWhileProducing('text/event-stream', filler);

			expect(released.length).toBeGreaterThan(0);
			expect(released.length).toBeLessThan(filler.length);
		}, 2000);

		// An answer is the user's own content. A credential that is also an ordinary word, as
		// Ollama and LM Studio document, must not be cut out of it.
		it.each([
			[
				'a frame of a stream',
				'text/event-stream',
				'data: {"choices":[{"delta":{"content":"run `ollama serve`"}}]}\n\n',
			],
			[
				'a non-streamed body',
				'application/json',
				'{"choices":[{"message":{"content":"run `ollama serve`"}}]}',
			],
			['a model list', 'application/json', '{"data":[{"id":"ollama/llama3.1"},{"id":"gpt-4o"}]}'],
		])('leaves %s alone', async (_name, contentType, answer) => {
			const baseFetch = (async () =>
				new Response(answer, {
					status: 200,
					headers: { 'content-type': contentType },
				})) as typeof fetch;

			expect(await readAll(baseFetch, ['ollama', 'Bearer ollama'])).toBe(answer);
		});

		// A gateway header value is a user-chosen word that can also be in the answer, so it is
		// filtered from an error and left alone in a 200. A model list proved this the hard way.
		it('leaves a gateway header value alone in an answer', async () => {
			const answer = '{"data":[{"id":"platform/gpt-4o"}]}';
			const baseFetch = (async () =>
				new Response(answer, {
					status: 200,
					headers: { 'content-type': 'application/json' },
				})) as typeof fetch;
			const wrapped = wrapCustomModelEndpointErrorFetch(baseFetch, [SECRET, 'platform']);

			expect(await (await wrapped(BASE_URL)).text()).toBe(answer);
		});

		// A 200 can carry a refusal the client prints verbatim, so it is not only a stream
		it('keeps a secret out of a refusal sent on a non-streamed 200', async () => {
			const baseFetch = (async () =>
				new Response(`{"error":{"message":"Incorrect API key provided: ${SECRET}"}}`, {
					status: 200,
					headers: { 'content-type': 'application/json' },
				})) as typeof fetch;

			expect(await readAll(baseFetch, [SECRET])).not.toContain(SECRET);
		});

		// The last frame of a stream often arrives with no trailing blank line
		it('delivers and filters a final frame that ends no frame', async () => {
			const frames = ['data: one\n\n', `data: {"error":{"message":"bad key ${SECRET}"}}`];

			const surfaced = await readAll(streamed(frames), [SECRET]);

			expect(surfaced).toContain('data: one');
			expect(surfaced).toContain('bad key ***');
			expect(surfaced).not.toContain(SECRET);
		});

		// The tail held back at the size-bound release is what stops a secret being cut in two
		it('filters a secret straddling the release of a body that ends no frame', async () => {
			const filler = `{"error":"${'x'.repeat(64 * 1024)}`;
			const body = new ReadableStream<Uint8Array>({
				start(controller) {
					const encoder = new TextEncoder();
					controller.enqueue(encoder.encode(filler + SECRET.slice(0, 8)));
					controller.enqueue(encoder.encode(`${SECRET.slice(8)}"}`));
					controller.close();
				},
			});
			const baseFetch = (async () =>
				new Response(body, {
					status: 200,
					headers: { 'content-type': 'text/event-stream' },
				})) as typeof fetch;

			expect(await readAll(baseFetch, [SECRET])).not.toContain(SECRET);
		});

		// Decoding each chunk on its own would turn the halves of a character into U+FFFD
		it('keeps a character whose bytes arrive in two chunks', async () => {
			const frame = 'data: {"m":"né"}\n\n';
			const bytes = new TextEncoder().encode(frame);
			const mid = frame.indexOf('é') + 1;
			const body = new ReadableStream<Uint8Array>({
				start(controller) {
					controller.enqueue(bytes.slice(0, mid));
					controller.enqueue(bytes.slice(mid));
					controller.close();
				},
			});
			const baseFetch = (async () =>
				new Response(body, {
					status: 200,
					headers: { 'content-type': 'text/event-stream' },
				})) as typeof fetch;

			expect(await readAll(baseFetch, [SECRET])).toBe(frame);
		});

		it('hands back a status that carries no body', async () => {
			const baseFetch = (async () => new Response(null, { status: 204 })) as typeof fetch;

			const response = await wrapCustomModelEndpointErrorFetch(baseFetch, [SECRET])(BASE_URL);

			expect(response.status).toBe(204);
			expect(response.body).toBeNull();
		});

		it('filters a secret split across two chunks', async () => {
			const refusal = `data: {"error":{"message":"bad key ${SECRET}"}}\n\n`;
			const split = refusal.indexOf(SECRET) + 6;
			const body = new ReadableStream<Uint8Array>({
				start(controller) {
					const encoder = new TextEncoder();
					controller.enqueue(encoder.encode(refusal.slice(0, split)));
					controller.enqueue(encoder.encode(refusal.slice(split)));
					controller.close();
				},
			});
			const baseFetch = (async () =>
				new Response(body, {
					status: 200,
					headers: { 'content-type': 'text/event-stream' },
				})) as typeof fetch;

			expect(await readAll(baseFetch, [SECRET])).not.toContain(SECRET);
		});
	});
});
