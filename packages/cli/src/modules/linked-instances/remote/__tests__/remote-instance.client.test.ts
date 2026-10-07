import type { Logger } from '@n8n/backend-common';
import type { CustomFetch, OutboundHttp } from '@n8n/backend-network';
import { SsrfBlockedIpError } from '@n8n/backend-network';
import { UnexpectedError, UserError } from '@n8n/errors';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import { IDEMPOTENCY_KEY_META, RemoteInstanceClientFactory } from '../remote-instance.client';
import {
	BEARER_CHALLENGE,
	catchError,
	ClientHarness,
	initializeResult,
	MCP_URL,
	ORIGIN,
	pagedToolsRemote,
	rpcMethodOf,
	rpcRemote,
	slowStages,
	TOKEN,
	TOOL_NAMES,
	type Remote,
} from './remote-instance.test-helpers';

describe('RemoteInstanceClient', () => {
	let harness: ClientHarness;
	let remote: Remote;
	let scopedLogger: Logger;
	let outboundHttp: MockProxy<OutboundHttp>;

	const useTransportFetch = (transportFetch: CustomFetch) =>
		harness.useTransportFetch(transportFetch);

	const createClient = (token = TOKEN) => harness.createClient({ token });

	beforeEach(() => {
		harness = new ClientHarness();
		({ remote, scopedLogger, outboundHttp } = harness);
	});

	afterEach(async () => await harness.dispose());

	describe('probe', () => {
		it('lists the remote tools when the token is accepted', async () => {
			const result = await createClient().probe();

			expect(result).toEqual({ ok: true, toolNames: TOOL_NAMES });
		});

		it('asks without the token first, then sends it only in the Authorization header', async () => {
			await createClient().probe();

			const [head, ...rest] = remote.state.requests;
			expect(head).toEqual({ method: 'HEAD', url: MCP_URL, authorization: null });
			expect(rest.length).toBeGreaterThan(0);
			for (const request of rest) {
				expect(request.url).toBe(MCP_URL);
				expect(request.authorization).toBe(`Bearer ${TOKEN}`);
			}
		});

		it('uses a transport that always applies the SSRF policy, with a 10 s limit', async () => {
			await createClient().probe();

			expect(outboundHttp.transport).toHaveBeenCalledWith({
				proxy: 'env',
				useDefaultSsrfPolicy: 'enforced',
				timeouts: { headersTimeout: 10_000, bodyTimeout: 10_000 },
			});
		});

		it('reports mcp-disabled when the remote answers 404', async () => {
			remote.state.disabled = true;

			expect(await createClient().probe()).toEqual({ ok: false, reason: 'mcp-disabled' });
		});

		it('reports unauthorised when the remote refuses the token', async () => {
			expect(await createClient('wrong-token').probe()).toEqual({
				ok: false,
				reason: 'unauthorised',
			});
		});

		it.each([
			['unauthorised', 'a 403', async () => new Response('Forbidden', { status: 403 })],
			['mcp-disabled', 'a 404', async () => new Response('Not found', { status: 404 })],
			['unreachable', 'a 500', async () => new Response('Boom', { status: 500 })],
			[
				'unreachable',
				'a network failure',
				async () => {
					throw new TypeError('fetch failed');
				},
			],
		])('reports %s when the tokened request gets %s', async (reason, _label, answer) => {
			useTransportFetch(async (input, init) => {
				const request = new Request(input, init);
				if (request.method === 'HEAD') return await remote.fetch(request);
				return await answer();
			});

			expect(await createClient().probe()).toEqual({ ok: false, reason });
		});

		it('reports unreachable when the network fails', async () => {
			useTransportFetch(async () => {
				throw new TypeError('fetch failed');
			});

			expect(await createClient().probe()).toEqual({ ok: false, reason: 'unreachable' });
		});

		it('reports unreachable when the SSRF policy refuses the address', async () => {
			useTransportFetch(async () => {
				throw new TypeError('fetch failed', { cause: new SsrfBlockedIpError('10.0.0.5') });
			});

			expect(await createClient().probe()).toEqual({ ok: false, reason: 'unreachable' });
		});

		it.each([
			['a redirect', new Response(null, { status: 302, headers: { location: 'https://a.test' } })],
			['a server error', new Response('Boom', { status: 500 })],
			['a 401 without a Bearer challenge', new Response(null, { status: 401 })],
			['a 200', new Response('<html></html>', { status: 200 })],
		])('reports unreachable for %s and sends no token', async (_label, response) => {
			const seen: Request[] = [];
			useTransportFetch(async (input, init) => {
				seen.push(new Request(input, init));
				return response;
			});

			expect(await createClient().probe()).toEqual({ ok: false, reason: 'unreachable' });
			expect(seen).toHaveLength(1);
			expect(seen[0].headers.get('authorization')).toBeNull();
			expect(seen[0].redirect).toBe('manual');
		});

		it('accepts a Bearer challenge that follows another scheme', async () => {
			useTransportFetch(async (input, init) => {
				const request = new Request(input, init);
				if (request.method !== 'HEAD') return await remote.fetch(request);
				const challenge = `Basic realm="n8n", ${BEARER_CHALLENGE}`;
				return new Response(null, { status: 401, headers: { 'WWW-Authenticate': challenge } });
			});

			expect(await createClient().probe()).toMatchObject({ ok: true });
		});

		it('reports unreachable for a 401 that asks for another scheme', async () => {
			useTransportFetch(async () => {
				const challenge = 'Basic realm="Bearer area"';
				return new Response(null, { status: 401, headers: { 'WWW-Authenticate': challenge } });
			});

			expect(await createClient().probe()).toEqual({ ok: false, reason: 'unreachable' });
		});

		it('reads every page of the tool list', async () => {
			useTransportFetch(
				pagedToolsRemote((cursor) =>
					cursor === 'page-2' ? { tools: ['b'] } : { tools: ['a'], nextCursor: 'page-2' },
				),
			);

			expect(await createClient().probe()).toEqual({ ok: true, toolNames: ['a', 'b'] });
		});

		it('never throws, even when building the transport fails', async () => {
			outboundHttp.transport.mockImplementation(() => {
				throw new Error('No transport');
			});

			expect(await createClient().probe()).toEqual({ ok: false, reason: 'unreachable' });
		});
	});

	describe('listToolNames', () => {
		it('returns the remote tool names over one connection', async () => {
			const client = createClient();

			expect(await client.listToolNames()).toEqual(TOOL_NAMES);
			await client.callTool('greet', {});
			await client.listToolNames();

			const initializations = remote.state.rpcMethods.filter((method) => method === 'initialize');
			expect(initializations).toHaveLength(1);
			expect(remote.state.rpcMethods).toEqual(expect.arrayContaining(['tools/list', 'tools/call']));
			expect(outboundHttp.transport).toHaveBeenCalledTimes(1);
			expect(outboundHttp.transport).toHaveBeenCalledWith(
				expect.objectContaining({ timeouts: { headersTimeout: 60_000, bodyTimeout: 60_000 } }),
			);
		});

		it.each([
			['unauthorised', () => createClient('wrong-token')],
			[
				'mcp-disabled',
				() => {
					remote.state.disabled = true;
					return createClient();
				},
			],
			[
				'unreachable',
				() => {
					useTransportFetch(async () => {
						throw new TypeError('fetch failed');
					});
					return createClient();
				},
			],
		])('throws a RemoteInstanceError with reason %s', async (reason, makeClient) => {
			const error = await catchError(makeClient().listToolNames());

			expect(error.reason).toBe(reason);
		});

		it('throws unreachable when the remote returns an error to the tool list', async () => {
			useTransportFetch(
				rpcRemote((method, params) =>
					method === 'initialize'
						? initializeResult(params)
						: { error: { code: -32603, message: 'Internal error' } },
				),
			);

			const error = await catchError(createClient().listToolNames());

			expect(error.reason).toBe('unreachable');
		});

		it('stops after 20 pages when the remote always sends a cursor', async () => {
			let page = 0;
			useTransportFetch(
				pagedToolsRemote(() => {
					page += 1;
					return { tools: [`tool_${page}`], nextCursor: `page-${page + 1}` };
				}),
			);

			const names = await createClient().listToolNames();

			expect(names).toHaveLength(20);
			expect(names.at(-1)).toBe('tool_20');
		});

		it('opens a new connection after a failed one', async () => {
			remote.state.disabled = true;
			const client = createClient();
			await catchError(client.listToolNames());

			remote.state.disabled = false;

			expect(await client.listToolNames()).toContain('greet');
		});
	});

	describe('callTool', () => {
		it('returns the structured content', async () => {
			const result = await createClient().callTool('search_workflows', { query: 'invoices' });

			expect(result).toEqual({ workflows: [{ id: 'wf-1', name: 'Match for invoices' }] });
		});

		it('parses text content as JSON when there is no structured content', async () => {
			expect(await createClient().callTool('count_workflows', {})).toEqual({ count: 2 });
		});

		it('returns plain text when the text is not JSON', async () => {
			expect(await createClient().callTool('greet', {})).toBe('Hello there');
		});

		it('forwards the idempotency key in _meta', async () => {
			await createClient().callTool(
				'search_workflows',
				{ query: 'a' },
				{ idempotencyKey: 'turn-1:call-2' },
			);

			expect(remote.state.seenMeta).toEqual([
				expect.objectContaining({ [IDEMPOTENCY_KEY_META]: 'turn-1:call-2' }),
			]);
		});

		it('sends no idempotency key when none is given', async () => {
			await createClient().callTool('search_workflows', { query: 'a' });

			expect(remote.state.seenMeta).toHaveLength(1);
			expect(JSON.stringify(remote.state.seenMeta)).not.toContain(IDEMPOTENCY_KEY_META);
		});

		it('throws tool-error with the remote text when the tool fails', async () => {
			const error = await catchError(createClient().callTool('publish_workflow', {}));

			expect(error.reason).toBe('tool-error');
			expect(error.message).toBe('Workflow wf-9 was not found');
		});

		it('throws tool-error for an unknown tool', async () => {
			const error = await catchError(createClient().callTool('no_such_tool', {}));

			expect(error.reason).toBe('tool-error');
		});

		it('cuts the remote failure text to 500 characters', async () => {
			const error = await catchError(createClient().callTool('echo_failure', {}));

			expect(error.message).toHaveLength(503);
			expect(error.message.endsWith('...')).toBe(true);
		});

		it('throws timeout when the remote does not answer in time', async () => {
			const error = await catchError(createClient().callTool('slow_tool', {}, { timeoutMs: 50 }));

			expect(error.reason).toBe('timeout');
		});

		it('rejects a response body over 5 MiB', async () => {
			const error = await catchError(createClient().callTool('huge_tool', {}));

			expect(error.reason).toBe('unreachable');
			expect(error.message).toContain('5 MiB');
		});

		it('reports unreachable, not tool-error, when the network fails during the call', async () => {
			useTransportFetch(async (input, init) => {
				const request = new Request(input, init);
				if ((await rpcMethodOf(request)) === 'tools/call') throw new TypeError('fetch failed');
				return await remote.fetch(request);
			});

			const error = await catchError(createClient().callTool('greet', {}));

			expect(error.reason).toBe('unreachable');
		});

		describe('when the connection cannot be set up', () => {
			it('reports unreachable, not tool-error, when the remote returns an error to initialize', async () => {
				useTransportFetch(
					rpcRemote((method) =>
						method === 'initialize'
							? { error: { code: -32603, message: 'Internal error' } }
							: { result: {} },
					),
				);

				const error = await catchError(createClient().callTool('greet', {}));

				expect(error.reason).toBe('unreachable');
			});

			it.each([
				['unauthorised', 'a 401', () => createClient('wrong-token')],
				[
					'unreachable',
					'a 500',
					() => {
						useTransportFetch(async () => new Response('Boom', { status: 500 }));
						return createClient();
					},
				],
				[
					'unreachable',
					'a network failure',
					() => {
						useTransportFetch(async () => {
							throw new TypeError('fetch failed');
						});
						return createClient();
					},
				],
			])('reports %s for %s', async (reason, _label, makeClient) => {
				const error = await catchError(makeClient().callTool('greet', {}));

				expect(error.reason).toBe(reason);
				expect(remote.state.rpcMethods).not.toContain('tools/call');
			});

			it('reports unreachable when initialize gets no answer in time', async () => {
				useTransportFetch(slowStages(remote.fetch, 61_000).fetch);
				vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
				try {
					const pending = catchError(createClient().callTool('greet', {}));
					await vi.advanceTimersByTimeAsync(60_000);

					expect((await pending).reason).toBe('unreachable');
				} finally {
					vi.useRealTimers();
				}
			});
		});
	});

	// createAuthFetch follows each hop itself and checks the hostname of each hop.
	describe('redirects of a request with the token', () => {
		type Hop = { method: string; url: string; authorization: string | null };

		/** Redirects each POST to the MCP URL to `location`, and sends the other requests to the remote. */
		const redirectTo = (location: string) => {
			const hops: Hop[] = [];
			useTransportFetch(async (input, init) => {
				const request = new Request(input, init);
				const authorization = request.headers.get('authorization');
				hops.push({ method: request.method, url: request.url, authorization });
				if (request.method === 'POST' && request.url === MCP_URL) {
					return new Response(null, { status: 307, headers: { location } });
				}
				return await remote.fetch(request);
			});
			return hops;
		};

		it('keeps the Authorization header on a redirect within the origin', async () => {
			const location = `${MCP_URL}?hop=2`;
			const hops = redirectTo(location);

			expect(await createClient().callTool('greet', {})).toBe('Hello there');

			const secondHops = hops.filter((hop) => hop.url === location);
			expect(secondHops.length).toBeGreaterThan(0);
			for (const hop of secondHops) {
				expect(hop).toEqual({ method: 'POST', url: location, authorization: `Bearer ${TOKEN}` });
			}
		});

		it.each([
			['another port', 'https://cloud.example.com:8443/mcp-server/http'],
			['plain http', 'http://cloud.example.com/mcp-server/http'],
		])(
			'drops the Authorization header on a redirect to %s of the same host',
			async (_label, location) => {
				const hops = redirectTo(location);

				const error = await catchError(createClient().callTool('greet', {}));

				expect(error.reason).toBe('unauthorised');
				expect(hops).toEqual([
					{ method: 'POST', url: MCP_URL, authorization: `Bearer ${TOKEN}` },
					{ method: 'POST', url: location, authorization: null },
				]);
			},
		);

		it('refuses a redirect to another host before it sends the request', async () => {
			const seenHosts: string[] = [];
			useTransportFetch(async (input, init) => {
				const request = new Request(input, init);
				seenHosts.push(new URL(request.url).host);
				return new Response(null, {
					status: 307,
					headers: { location: 'https://other.example.net/mcp-server/http' },
				});
			});

			const error = await catchError(createClient().callTool('greet', {}));

			expect(error.reason).toBe('unreachable');
			expect(seenHosts).toEqual(['cloud.example.com']);
		});
	});

	describe('secrecy of the token', () => {
		it('keeps the token out of errors and logs', async () => {
			const errors = [
				await catchError(createClient().callTool('echo_failure', {})),
				await catchError(createClient('wrong-token').listToolNames()),
				await catchError(createClient().callTool('slow_tool', {}, { timeoutMs: 50 })),
			];
			remote.state.disabled = true;
			errors.push(await catchError(createClient().listToolNames()));
			await createClient().probe();

			expect(errors.map((error) => error.reason)).toEqual([
				'tool-error',
				'unauthorised',
				'timeout',
				'mcp-disabled',
			]);
			expect(errors[0].message).toContain('[REDACTED]');
			for (const error of errors) {
				expect(error.message).not.toContain(TOKEN);
				expect(error.stack).not.toContain(TOKEN);
				expect(error.cause).toBeUndefined();
			}
			const logCalls = vi.mocked(scopedLogger.warn).mock.calls;
			expect(logCalls.length).toBeGreaterThan(0);
			const allLogs = JSON.stringify([
				logCalls,
				vi.mocked(scopedLogger.debug).mock.calls,
				vi.mocked(scopedLogger.info).mock.calls,
				vi.mocked(scopedLogger.error).mock.calls,
			]);
			expect(allLogs).not.toContain(TOKEN);
		});
	});

	describe('create', () => {
		it.each([
			'cloud.example.com',
			'https://cloud.example.com/',
			'https://cloud.example.com/path',
			'ftp://cloud.example.com',
		])('refuses the origin %s, which is not normalised', (origin) => {
			const factory = new RemoteInstanceClientFactory(mock<Logger>(), outboundHttp);

			expect(() => factory.create({ origin, token: TOKEN })).toThrow(UnexpectedError);
		});

		it.each(['', 'two words', 'line\nbreak', 'a'.repeat(4097)])(
			'refuses a token that cannot go in a header',
			(token) => {
				const factory = new RemoteInstanceClientFactory(mock<Logger>(), outboundHttp);

				expect(() => factory.create({ origin: ORIGIN, token })).toThrow(UserError);
			},
		);
	});
});
