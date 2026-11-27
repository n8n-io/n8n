import type { INode, NodeEgressFilter } from 'n8n-workflow';

import { createCustomModelEndpointAuthFetch } from './auth-fetch';
import type { CustomModelEndpointFetchContext } from './auth-fetch';
import {
	clientErrorMessage,
	MAX_CARRIED,
	wrapCustomModelEndpointErrorFetch,
} from './error-handling';
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
			'the first field that actually says something, past the blank ones',
			{ error_description: '', error: '   ', message: 'Subscription key is invalid' },
			'Subscription key is invalid',
		],
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

	// `constructor` is the one Object.prototype key the entity pattern can reach:
	// it matches `[a-z]+` and survives the lowercasing the lookup does
	it('leaves &constructor; alone, rather than reading it off Object.prototype', async () => {
		expect(await surfaced(titled('Denied &constructor; here'))).toBe('Denied &constructor; here');
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
	const bodyFrom = async (
		endpoint: EndpointCredential,
		body: string,
		userHeaders?: Record<string, string>,
	) => {
		const authFetch = createCustomModelEndpointAuthFetch(
			ctx,
			{},
			{
				endpoint,
				egressFilter: allowAll,
				baseFetch: routed(body),
				userHeaders,
			},
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

	// n8n's own context headers carry the workflow name and the execution id, which are not
	// secrets and would be cut out of any error that names them
	it('leaves n8n context header values in the error', async () => {
		const endpoint = endpointWith({ type: 'none' });
		const body = JSON.stringify({ error: { message: 'run 1234 of My Workflow failed' } });
		const authFetch = createCustomModelEndpointAuthFetch(
			ctx,
			{},
			{
				endpoint,
				egressFilter: allowAll,
				baseFetch: routed(body),
				contextHeaders: { 'x-n8n-execution-id': '1234', 'x-n8n-workflow-name': 'My Workflow' },
			},
		);

		expect(await (await authFetch(BASE_URL)).text()).toContain('run 1234 of My Workflow failed');
	});

	// Trimming the body first would take the no-break space with it, and the padded
	// spelling is the one the gateway was sent
	it('keeps a credential padded with a no-break space out of the error', async () => {
		const padded = `\u00a0${SECRET}\u00a0`;
		const endpoint = endpointWith({ type: 'none' }, { 'x-api-key': padded });

		expect(await bodyFrom(endpoint, padded)).not.toContain(SECRET);
	});

	// A row with a name and no value puts '' in the list, and splitting on '' shreds the body
	it('survives a header row the user left blank', async () => {
		const endpoint = endpointWith({ type: 'none' });
		const body = JSON.stringify({ error: { message: 'denied' } });

		expect(await bodyFrom(endpoint, body, { 'x-api-key': '' })).toContain('denied');
	});

	// The gateway is sent the trimmed value, so that is the spelling it can echo
	it('keeps a user header value the gateway received trimmed out of the error', async () => {
		const endpoint = endpointWith({ type: 'none' });
		const body = JSON.stringify({ error: { message: `bad key ${SECRET}` } });

		expect(await bodyFrom(endpoint, body, { 'x-api-key': ` ${SECRET}\n` })).not.toContain(SECRET);
	});

	// A header the user typed can hold a key, and the gateway can echo that too
	it('keeps a per-request header value the user typed out of the error', async () => {
		const endpoint = endpointWith({ type: 'none' });
		const body = JSON.stringify({ error: { message: `bad key ${SECRET}` } });

		expect(await bodyFrom(endpoint, body, { 'x-api-key': SECRET })).not.toContain(SECRET);
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
			const filler = 'x'.repeat(MAX_CARRIED + 1024);

			const released = await releasedWhileProducing('text/event-stream', filler);

			expect(released.length).toBeGreaterThan(0);
			expect(released.length).toBeLessThan(filler.length);
		}, 20000);

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

/**
 * The two invariants, over the shapes a gateway really sends. A refusal always loses the
 * credential; an answer is always handed back byte for byte. Four rounds of this change
 * each broke one of the two, and each time a single case was added. This is the table that
 * holds both at once.
 */
describe('every shape a gateway can answer with', () => {
	// The key Ollama and LM Studio document, so it is also an ordinary word in the answers
	const KEY = 'ollama';
	const secrets = [KEY, `Bearer ${KEY}`];

	const throughWith = async (body: string, list: string[], contentType = 'text/event-stream') => {
		const baseFetch = (async () =>
			new Response(body, {
				status: 200,
				headers: { 'content-type': contentType },
			})) as typeof fetch;
		return await (await wrapCustomModelEndpointErrorFetch(baseFetch, list)(BASE_URL)).text();
	};

	const through = async (body: string, status: number, contentType: string) => {
		const baseFetch = (async () =>
			new Response(body, { status, headers: { 'content-type': contentType } })) as typeof fetch;
		return await (await wrapCustomModelEndpointErrorFetch(baseFetch, secrets)(BASE_URL)).text();
	};

	const JSON_REFUSALS: Array<[string, string]> = [
		['OpenAI', `{"error":{"message":"Incorrect API key provided: ${KEY}"}}`],
		['an error that is a bare string', `{"error":"Invalid API key ${KEY}"}`],
		['an error with no message', `{"error":{"code":"invalid_key","detail":"got ${KEY}"}}`],
		['the FastAPI and vLLM detail', `{"detail":"Invalid API key ${KEY}"}`],
		['a top-level message', `{"message":"Access denied for ${KEY}"}`],
		['the vLLM flat shape', `{"object":"error","message":"bad key ${KEY}","code":401}`],
		['an errors array', `{"errors":[{"message":"bad key ${KEY}"}]}`],
		// An answer-shaped key with a value no reader accepts is not an answer
		['a null output beside a detail', `{"output":null,"detail":"invalid api key ${KEY}"}`],
		['an empty choices array', `{"choices":[],"detail":"invalid api key ${KEY}"}`],
		['a data array of things that are not models', `{"data":[{"detail":"bad key ${KEY}"}]}`],
		// `idOf` drops a blank id, so a list that names nothing is not a model list
		['a data array of blank ids', `{"data":[{"id":""}],"detail":"bad key ${KEY}"}`],
		// The failure event of the Responses stream nests its error one level down
		[
			'a response.failed event',
			`{"type":"response.failed","response":{"object":"response","error":{"message":"bad key ${KEY}"}}}`,
		],
		// A client parses the escape back into the credential before it displays it
		['a JSON-escaped credential', '{"error":{"message":"bad key \\u006fllama"}}'],
		// Answer-shaped but for the error, which is the client's own test for a refusal
		[
			'a Responses body carrying an error',
			`{"object":"response","error":{"message":"bad key ${KEY}"}}`,
		],
	];

	const REFUSALS: Array<[string, string, string]> = [
		...JSON_REFUSALS.map(([name, body]): [string, string, string] => [
			name,
			body,
			'application/json',
		]),
		['plain text', `Invalid API key ${KEY}`, 'text/plain'],
		['an HTML page', `<html><head><title>401 ${KEY}</title></head></html>`, 'text/html'],
	];

	it.each(REFUSALS)('loses the credential from %s on a 401', async (_name, body, contentType) => {
		expect(await through(body, 401, contentType)).not.toContain(KEY);
	});

	it.each(REFUSALS)('loses the credential from %s on a 200', async (_name, body, contentType) => {
		expect(await through(body, 200, contentType)).not.toContain(KEY);
	});

	it.each(JSON_REFUSALS)('loses the credential from %s streamed on a 200', async (_name, body) => {
		expect(await through(`data: ${body}\n\n`, 200, 'text/event-stream')).not.toContain(KEY);
	});

	const ANSWERS: Array<[string, string, string]> = [
		[
			'a chat completion',
			`{"choices":[{"message":{"content":"run \`${KEY} serve\`"}}]}`,
			'application/json',
		],
		[
			'a chat completion delta',
			`data: {"choices":[{"delta":{"content":"run \`${KEY} serve\`"}}]}\n\n`,
			'text/event-stream',
		],
		[
			'a Responses body, which carries a null error',
			`{"object":"response","error":null,"output":[{"content":[{"text":"${KEY} is running"}]}]}`,
			'application/json',
		],
		[
			'a Responses lifecycle frame, which carries a null error',
			`data: {"type":"response.completed","response":{"object":"response","error":null,"output":[{"content":[{"text":"${KEY}"}]}]}}\n\n`,
			'text/event-stream',
		],
		// A real Responses frame leads with an event line, which the payload reader must skip
		[
			'a Responses frame behind its event line',
			`event: response.completed\ndata: {"type":"response.completed","response":{"object":"response","error":null,"output":[{"content":[{"text":"${KEY}"}]}]}}\n\n`,
			'text/event-stream',
		],
		// A background response is accepted before it has produced any output
		[
			'a queued Responses body that has no output yet',
			`{"object":"response","status":"queued","error":null,"model":"${KEY}/llama3.1"}`,
			'application/json',
		],
		['a model list', `{"data":[{"id":"${KEY}/llama3.1"},{"id":"gpt-4o"}]}`, 'application/json'],
		['a model list as a bare array', `[{"id":"${KEY}/llama3.1"}]`, 'application/json'],
	];

	it.each(ANSWERS)('hands back %s byte for byte', async (_name, body, contentType) => {
		expect(await through(body, 200, contentType)).toBe(body);
	});

	/** What the client shows, which is the decoded message rather than the bytes. */
	const decodedMessage = (body: string) => {
		const payload = body.startsWith('data:') ? body.slice('data:'.length).trim() : body;
		return JSON.stringify(JSON.parse(payload));
	};

	// A gateway that declares a stream but frames nothing still sends a refusal, and PHP
	// escapes a slash while Python escapes non-ASCII, both by default
	/** A string body makes undici add `text/plain`, so an absent type needs a stream. */
	const answering = (body: string, contentType: string | null) =>
		(async () => {
			const stream = new ReadableStream<Uint8Array>({
				start(controller) {
					controller.enqueue(new TextEncoder().encode(body));
					controller.close();
				},
			});
			return new Response(stream, {
				status: 200,
				headers: contentType === null ? {} : { 'content-type': contentType },
			});
		}) as typeof fetch;

	it.each([
		['declaring a stream', 'text/event-stream'],
		['declaring nothing', null],
	])('loses an escaped credential from an unframed body %s', async (_name, contentType) => {
		const slashed = 'sk-local/abc123XYZ';
		const body = JSON.stringify({ error: { message: `Invalid token: ${slashed}` } }).replace(
			'/',
			'\\/',
		);

		const surfaced = await (
			await wrapCustomModelEndpointErrorFetch(answering(body, contentType), [slashed])(BASE_URL)
		).text();

		expect(JSON.stringify(JSON.parse(surfaced))).not.toContain(slashed);
	});

	// Rebuilding a frame as JSON would drop its blank line and fuse the next one onto it
	it('keeps the blank line after an unframed body it had to rebuild', async () => {
		const refusal = `{"error":{"message":"bad key ${KEY}"}}\n\n`;
		const answer = 'data: {"choices":[{"delta":{"content":"hi"}}]}\n\n';

		const surfaced = await (
			await wrapCustomModelEndpointErrorFetch(answering(refusal + answer, 'text/event-stream'), [
				KEY,
			])(BASE_URL)
		).text();

		expect(surfaced).toContain(`\n\n${answer}`);
		expect(surfaced).not.toContain(KEY);
	});

	// A client parses the escape back into the credential, so the bytes alone are not enough
	it.each([
		['on a 200', 'application/json', '{"error":{"message":"bad key \\u006fllama"}}'],
		['in a frame', 'text/event-stream', 'data: {"error":{"message":"bad key \\u006fllama"}}\n\n'],
	])('loses a credential spelled with a JSON escape %s', async (_name, contentType, body) => {
		expect(decodedMessage(await through(body, 200, contentType))).not.toContain(KEY);
	});

	// A payload may be carried over several data lines, and the join is then not a
	// substring of the frame, so splicing it back would replace nothing
	it('loses a credential from a refusal carried over two data lines', async () => {
		const frame = `data: {"error":\ndata: {"message":"bad key ${KEY}"}}\n\n`;
		const baseFetch = (async () =>
			new Response(frame, {
				status: 200,
				headers: { 'content-type': 'text/event-stream' },
			})) as typeof fetch;

		const surfaced = await (
			await wrapCustomModelEndpointErrorFetch(baseFetch, [KEY])(BASE_URL)
		).text();

		expect(surfaced).not.toContain(KEY);
	});

	/** One chunk in, so the size-bound cut lands at a position the test can place a value on. */
	const firstRelease = async (body: string, list: string[]) => {
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(new TextEncoder().encode(body));
				controller.close();
			},
		});
		const baseFetch = (async () =>
			new Response(stream, {
				status: 200,
				headers: { 'content-type': 'text/event-stream' },
			})) as typeof fetch;

		const response = await wrapCustomModelEndpointErrorFetch(baseFetch, list)(BASE_URL);
		const reader = (response.body as ReadableStream<Uint8Array>).getReader();
		const { value } = await reader.read();
		await reader.cancel();
		return new TextDecoder().decode(value);
	};

	// Cutting first and filtering the parts would leave the head of the value in the first
	// release and its tail in the next, with neither part holding it whole
	it('loses a credential that spans the size-bound release', async () => {
		const token = 'Qz7Lm2Rt9Bv4';
		const filler = 'x'.repeat(MAX_CARRIED + 1024);
		// The cut sits at `length - (token.length - 1)`, so this puts half the token past it
		const at = filler.length - (token.length - 1) - token.length / 2;
		const body = filler.slice(0, at) + token + filler.slice(at + token.length);

		const released = await firstRelease(body, [token]);

		expect(released.length).toBeGreaterThan(0);
		expect(released).not.toContain(token.slice(0, token.length / 2));
	}, 20000);

	/**
	 * A body with no boundary holds in the buffer, and searching the buffer again for each
	 * chunk would read the whole stream once per chunk. The same 2 MiB takes about 20 ms
	 * when only the new text is read and about 7 s when the buffer is, so the bound below
	 * is wide enough for a loaded machine and still well under the cost it guards.
	 */
	it('reads a body that never ends a frame once, not once for each chunk', async () => {
		const chunkSize = 64;
		const chunks = (2 * 1024 * 1024) / chunkSize;
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				const encoder = new TextEncoder();
				const chunk = encoder.encode('x'.repeat(chunkSize));
				for (let sent = 0; sent < chunks; sent++) controller.enqueue(chunk);
				controller.close();
			},
		});
		const baseFetch = (async () =>
			new Response(stream, {
				status: 200,
				headers: { 'content-type': 'text/event-stream' },
			})) as typeof fetch;

		const started = performance.now();
		await (await wrapCustomModelEndpointErrorFetch(baseFetch, [KEY])(BASE_URL)).text();

		expect(performance.now() - started).toBeLessThan(2_000);
	}, 60000);

	// The size-bound cut must not land between the halves of an astral character
	it('keeps an astral character whole across the size-bound release', async () => {
		const overlap = KEY.length - 1;
		const head = 'x'.repeat(MAX_CARRIED + 1024 - overlap);
		const body = `${head}\u{1F600}${'y'.repeat(overlap - 1)}`;
		const baseFetch = (async () =>
			new Response(body, {
				status: 200,
				headers: { 'content-type': 'text/event-stream' },
			})) as typeof fetch;

		const surfaced = await (
			await wrapCustomModelEndpointErrorFetch(baseFetch, [KEY])(BASE_URL)
		).text();

		expect(surfaced).toContain('\u{1F600}');
		expect(surfaced).not.toContain('\uFFFD');
	}, 20000);

	// A short header value is on the list like any other, and the bytes around the decoded
	// text of a frame are JSON syntax and numbers
	it('leaves the numbers of a filtered frame alone when a listed value is one digit', async () => {
		const frame = 'data: {"error":{"message":"too fast"},"retry_after":11}\n\n';

		const surfaced = await throughWith(frame, ['1']);

		expect(surfaced).toBe(frame);
		expect(JSON.parse(surfaced.slice('data: '.length))).toMatchObject({ retry_after: 11 });
	});

	// The client asks for this frame by default, and it carries no choices, so the rule
	// that an empty choices list is not an answer would send it through the filter
	it('leaves the closing usage frame of a stream alone', async () => {
		const frame =
			'data: {"object":"chat.completion.chunk","choices":[],"usage":{"total_tokens":21},"model":"gpt-4.1"}\n\n';

		expect(await throughWith(frame, ['1'])).toBe(frame);
	});

	// The payload of a frame is not the only place a gateway can put a value back
	it('keeps a credential out of the event name of a filtered frame', async () => {
		const frame = `event: ${KEY}\ndata: {"error":{"message":"rejected"}}\n\n`;

		const surfaced = await throughWith(frame, [KEY]);

		expect(surfaced).not.toContain(KEY);
		expect(surfaced.startsWith('event: ')).toBe(true);
		expect(surfaced).toContain('data: {"error"');
	});

	// Naming the frame is not enough on its own, so a gateway that leaves the count out
	// keeps the filter rather than passing as the closing frame
	it('still filters a chunk that names itself the closing frame without the count', async () => {
		const frame = `data: {"object":"chat.completion.chunk","choices":[],"usage":{},"message":"bad key ${KEY}"}\n\n`;

		expect(await throughWith(frame, [KEY])).not.toContain(KEY);
	});

	// The arm above needs both marks, so a refusal that happens to carry an empty choices
	// list and a count does not pass as one
	it('still filters a refusal shaped like the closing usage frame', async () => {
		const frame = `data: {"choices":[],"usage":{"total_tokens":0},"message":"bad key ${KEY}"}\n\n`;

		expect(await throughWith(frame, [KEY])).not.toContain(KEY);
	});

	// A listed value is free to be a word of the protocol, and rewriting the prefix would
	// leave the client a frame it cannot read
	it('keeps the frame prefix when a listed value is the word data', async () => {
		const frame = `data: {"error":{"message":"bad key ${KEY}"}}\n\n`;

		const surfaced = await throughWith(frame, ['data', KEY]);

		expect(surfaced.startsWith('data: ')).toBe(true);
		expect(surfaced).not.toContain(KEY);
	});

	// Replacing the shorter one first would leave the longer one's tail in the clear
	it('loses a secret that another secret is a prefix of', async () => {
		const baseFetch = (async () =>
			new Response('{"error":{"message":"rejected tok-abc-long"}}', {
				status: 401,
				headers: { 'content-type': 'application/json' },
			})) as typeof fetch;
		const wrapped = wrapCustomModelEndpointErrorFetch(baseFetch, ['tok-abc', 'tok-abc-long']);

		expect(await (await wrapped(BASE_URL)).text()).not.toContain('long');
	});

	// A minted token is free to contain a space, and the scheme is only the first word.
	// The tail is what is asserted: redacting the first word alone would leave it behind.
	it('loses a minted token that contains a space', async () => {
		const token = 'tok-one tok-two';
		const baseFetch = (async () =>
			new Response(`{"error":{"message":"rejected ${token}"}}`, {
				status: 401,
				headers: { 'content-type': 'application/json' },
			})) as typeof fetch;
		const wrapped = wrapCustomModelEndpointErrorFetch(baseFetch, []);

		const surfaced = await (
			await wrapped(BASE_URL, { headers: { authorization: `Bearer ${token}` } })
		).text();

		expect(surfaced).not.toContain('tok-two');
	});

	// undici hands on whatever has arrived, so two frames often reach the filter together
	it('leaves an answer frame alone when a refusal frame shares the read', async () => {
		const answer = `data: {"choices":[{"delta":{"content":"run \`${KEY} serve\`"}}]}\n\n`;
		const refusal = `data: {"error":{"message":"bad key ${KEY}"}}\n\n`;

		const surfaced = await through(answer + refusal, 200, 'text/event-stream');

		expect(surfaced).toContain(answer);
		expect(surfaced).not.toContain(`bad key ${KEY}`);
	});
});
