/**
 * `replay` of a node step: the v1 node gets the answers that a library node received for
 * the same GET requests, so the requests are on the network once.
 */
import http from 'node:http';
import type { AddressInfo } from 'node:net';

import { readReplay, requestKey, withReplay } from '../http-replay';
import { NodeStepRunner, parseNodeStepArgs } from '../node-step';
import type { JsonObject } from '../protocol';

describe('replay of the requests of a library node', () => {
	const runner = new NodeStepRunner({ credentials: { get: async () => ({}) } });
	let server: http.Server;
	let base = '';
	let requests: string[] = [];

	beforeAll(async () => {
		server = http.createServer((request, response) => {
			requests.push(`${request.method} ${request.url}`);
			response.writeHead(200, { 'content-type': 'application/json', 'x-served': 'network' });
			response.end(JSON.stringify({ path: request.url, count: requests.length }));
		});
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
	});

	afterAll(async () => {
		server.closeAllConnections();
		await new Promise((resolve) => server.close(resolve));
	});

	beforeEach(() => {
		requests = [];
	});

	/** The request of a library node: one GET on the network, and its entry for `replay`. */
	async function libraryGet(path: string, qs: Record<string, string> = {}): Promise<JsonObject> {
		const url = new URL(base + path);
		for (const [key, value] of Object.entries(qs)) url.searchParams.set(key, value);
		const response = await fetch(url);
		const headers: JsonObject = {};
		response.headers.forEach((value, key) => (headers[key] = value));
		return {
			method: 'GET',
			url: base + path,
			qs,
			response: { status: response.status, headers, body: (await response.json()) as JsonObject },
		};
	}

	/** The v1 HTTP Request node in the host: one GET for each item, with the full response. */
	async function hostRun(items: JsonObject[], replay?: JsonObject[]): Promise<JsonObject[]> {
		return await runner.run(
			parseNodeStepArgs({
				name: 'Read',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.2,
				parameters: {
					url: `=${base}{{ $json.path }}`,
					sendQuery: true,
					queryParameters: { parameters: [{ name: 'format', value: 'raw' }] },
					options: { response: { response: { fullResponse: true } } },
				},
				items,
				...(replay ? { replay } : {}),
			}),
			{ step: 'Read', key: 'k' },
		);
	}

	const withoutDate = (items: JsonObject[]) =>
		items.map((item) => {
			const headers = { ...(item.headers as JsonObject) };
			delete headers.date;
			delete headers.connection;
			delete headers['keep-alive'];
			delete headers['transfer-encoding'];
			delete headers['content-length'];
			return { ...item, headers };
		});

	it('sends nothing again after a library node that hands over after two GET requests', async () => {
		const replay = [
			await libraryGet('/a', { format: 'raw' }),
			await libraryGet('/b', { format: 'raw' }),
		];
		expect(requests).toEqual(['GET /a?format=raw', 'GET /b?format=raw']);

		const out = await hostRun([{ path: '/a' }, { path: '/b' }], replay);

		// Two requests on the network in total: the two of the library node.
		expect(requests).toEqual(['GET /a?format=raw', 'GET /b?format=raw']);
		expect(out.map((item) => item.body)).toEqual([
			{ path: '/a?format=raw', count: 1 },
			{ path: '/b?format=raw', count: 2 },
		]);
		expect(out.map((item) => item.statusCode)).toEqual([200, 200]);
		expect(out.map((item) => (item.headers as JsonObject)['x-served'])).toEqual([
			'network',
			'network',
		]);
	});

	it('gives the v1 node the result that it gets from the network', async () => {
		const fromNetwork = await hostRun([{ path: '/a' }]);
		requests = [];
		const replay = [await libraryGet('/a', { format: 'raw' })];
		const fromReplay = await hostRun([{ path: '/a' }], replay);
		expect(requests).toHaveLength(1);
		const expected = withoutDate(fromNetwork);
		// The server counts its requests in the body; the rest of the response is the same.
		expect(withoutDate(fromReplay)).toEqual(
			expected.map((item) => ({ ...item, body: { path: '/a?format=raw', count: 1 } })),
		);
	});

	it('sends a request that no entry matches', async () => {
		const replay = [await libraryGet('/a', { format: 'raw' })];
		const out = await hostRun([{ path: '/a' }, { path: '/other' }], replay);
		expect(requests).toEqual(['GET /a?format=raw', 'GET /other?format=raw']);
		expect(out.map((item) => item.body)).toEqual([
			{ path: '/a?format=raw', count: 1 },
			{ path: '/other?format=raw', count: 2 },
		]);
	});

	it('answers a repeated request once from the list, then sends it', async () => {
		const replay = [await libraryGet('/a', { format: 'raw' })];
		const out = await hostRun([{ path: '/a' }, { path: '/a' }], replay);
		expect(requests).toEqual(['GET /a?format=raw', 'GET /a?format=raw']);
		expect(out.map((item) => item.body)).toEqual([
			{ path: '/a?format=raw', count: 1 },
			{ path: '/a?format=raw', count: 2 },
		]);
	});

	it('sends the requests of a later step that has no replay', async () => {
		await hostRun([{ path: '/a' }], [await libraryGet('/a', { format: 'raw' })]);
		requests = [];
		await hostRun([{ path: '/a' }]);
		expect(requests).toEqual(['GET /a?format=raw']);
	});

	it('reads a stored body by its reference, and sends the request when the store has no bytes', async () => {
		const get = async (path: string): Promise<string> =>
			await new Promise((resolve, reject) => {
				http
					.get(`${base}${path}`, (response) => {
						let body = '';
						response.on('data', (chunk: Buffer) => (body += chunk.toString()));
						response.on('end', () => resolve(`${response.headers['content-type']} ${body}`));
					})
					.on('error', reject);
			});
		const stored = (path: string, id: string) => ({
			method: 'GET',
			url: `${base}${path}`,
			qs: {},
			response: {
				status: 200,
				headers: { 'content-type': 'text/plain' },
				body: { $binary: { id, data: 'filesystem-v2', mimeType: 'text/plain' } },
			},
		});
		const read: string[] = [];
		const out = await withReplay(
			readReplay([stored('/file', 'filesystem-v2:here'), stored('/lost', 'filesystem-v2:lost')]),
			async (body) => {
				read.push(body.id);
				return body.id.endsWith('here') ? Buffer.from('stored bytes') : undefined;
			},
			async () => [await get('/file'), await get('/lost')],
		);
		expect(read).toEqual(['filesystem-v2:here', 'filesystem-v2:lost']);
		expect(out).toEqual(['text/plain stored bytes', 'application/json {"path":"/lost","count":1}']);
		expect(requests).toEqual(['GET /lost']);
	});

	it('leaves out the entries that it cannot answer', () => {
		const response = { status: 200, headers: {}, body: 'x' };
		expect(
			readReplay([
				{ method: 'GET', url: 'https://x.test/a', qs: {}, body: { a: 1 }, response },
				{ method: 'GET', url: 'not a URL', qs: {}, response },
				{ method: 'GET', url: 'https://x.test/a', qs: {} },
				'text',
				{ method: 'GET', url: 'https://x.test/a', qs: { q: 'a b' }, response },
			]),
		).toEqual([
			{
				method: 'GET',
				key: 'GET https://x.test/a?q=a%20b',
				status: 200,
				headers: {},
				body: Buffer.from('x'),
			},
		]);
	});

	describe('a list with a request that is not a GET request', () => {
		/** The request of a library node: one POST on the network, and its entry for `replay`. */
		async function libraryPost(path: string, body: JsonObject): Promise<JsonObject> {
			const response = await fetch(base + path, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body),
			});
			const headers: JsonObject = {};
			response.headers.forEach((value, key) => (headers[key] = value));
			return {
				method: 'POST',
				url: base + path,
				qs: {},
				body,
				response: { status: response.status, headers, body: (await response.json()) as JsonObject },
			};
		}

		/** The v1 HTTP Request node in the host: one POST for each item. */
		async function hostPost(
			items: JsonObject[],
			replay: JsonObject[],
			settings: JsonObject = {},
		): Promise<JsonObject[]> {
			return await runner.run(
				parseNodeStepArgs({
					name: 'Write',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					parameters: {
						method: 'POST',
						url: `=${base}{{ $json.path }}`,
						sendBody: true,
						specifyBody: 'json',
						jsonBody: '={{ JSON.stringify({ n: $json.n }) }}',
						options: {},
					},
					items,
					replay,
					...settings,
				}),
				{ step: 'Write', key: 'k' },
			);
		}

		it('answers each POST of the v1 node from the list, in its order', async () => {
			const replay = [await libraryPost('/a', { n: 1 }), await libraryPost('/b', { n: 2 })];
			expect(requests).toEqual(['POST /a', 'POST /b']);

			const out = await hostPost(
				[
					{ path: '/a', n: 1 },
					{ path: '/b', n: 2 },
				],
				replay,
			);

			// Two requests on the network in total: the two of the library node.
			expect(requests).toEqual(['POST /a', 'POST /b']);
			expect(out).toEqual([
				{ path: '/a', count: 1 },
				{ path: '/b', count: 2 },
			]);
		});

		it('answers a request with a large body', async () => {
			const replay = [await libraryPost('/a', { n: 1 })];
			const out = await hostPost([{ path: '/a', n: 'x'.repeat(2_000_000) }], replay);
			expect(requests).toEqual(['POST /a']);
			expect(out).toEqual([{ path: '/a', count: 1 }]);
		});

		it('sends a request after the last entry: the library node did not send it', async () => {
			const replay = [await libraryPost('/a', { n: 1 })];
			const out = await hostPost(
				[
					{ path: '/a', n: 1 },
					{ path: '/b', n: 2 },
				],
				replay,
			);
			expect(requests).toEqual(['POST /a', 'POST /b']);
			expect(out).toEqual([
				{ path: '/a', count: 1 },
				{ path: '/b', count: 2 },
			]);
		});

		it('does not send a request that is not the next entry, and fails the step', async () => {
			const replay = [await libraryPost('/a', { n: 1 }), await libraryPost('/b', { n: 2 })];
			requests = [];
			await expect(
				hostPost(
					[
						{ path: '/b', n: 2 },
						{ path: '/a', n: 1 },
					],
					replay,
				),
			).rejects.toThrow(
				`The fallback host did not send the request "POST ${base}/b": the compiled node sent requests that are not GET requests, and this request is not the next one in the list of their answers (limit: replay)`,
			);
			expect(requests).toEqual([]);
		});

		it('does not send a GET request that is not the next entry', async () => {
			const replay = [await libraryPost('/a', { n: 1 }), await libraryGet('/b')];
			requests = [];
			await expect(hostRun([{ path: '/c' }], replay)).rejects.toThrow(
				`did not send the request "GET ${base}/c"`,
			);
			expect(requests).toEqual([]);
		});

		it('fails the step also when the v1 node continues after the error of its request', async () => {
			const replay = [await libraryPost('/a', { n: 1 })];
			requests = [];
			await expect(
				hostPost([{ path: '/other', n: 1 }], replay, { onError: 'continueRegularOutput' }),
			).rejects.toThrow(`did not send the request "POST ${base}/other"`);
			expect(requests).toEqual([]);
		});

		it('does not send the request of an entry that it cannot read', async () => {
			const response = { status: 200, headers: {}, body: 'x' };
			const entries = readReplay([
				{ method: 'post', url: `${base}/a`, qs: {}, body: { a: 1 }, response },
				{ method: 'GET', url: 'not a URL', qs: {}, response },
				'text',
				{ method: 'GET', url: `${base}/b`, qs: {} },
			]);
			expect(entries.map((entry) => [entry.method, entry.key, entry.unreadable])).toEqual([
				['POST', `POST ${base}/a?`, undefined],
				['', '', true],
				['', '', true],
				['', '', true],
			]);
			expect(entries.every((entry) => entry.ordered)).toBe(true);

			const stored = {
				method: 'POST',
				url: `${base}/file`,
				qs: {},
				response: {
					status: 200,
					headers: {},
					body: { $binary: { id: 'filesystem-v2:lost', data: 'filesystem-v2', mimeType: 'a/b' } },
				},
			};
			const post = async (path: string): Promise<number> =>
				await new Promise((resolve, reject) => {
					const request = http.request(`${base}${path}`, { method: 'POST' }, (answer) => {
						answer.resume();
						answer.on('end', () => resolve(answer.statusCode ?? 0));
					});
					request.on('error', reject);
					request.end('{}');
				});
			await expect(
				withReplay(
					readReplay([stored]),
					async () => undefined,
					async () => await post('/file'),
				),
			).rejects.toThrow(`did not send the request "POST ${base}/file"`);
			expect(requests).toEqual([]);
		});

		it('answers the pages of a paged POST from the list, and sends the pages after them', async () => {
			// The library node sent pages 1 and 2 of one item, and handed the node over.
			const page = async (n: number): Promise<JsonObject> => ({
				...(await libraryPost(`/pages?page=${n}`, { size: 1 })),
				url: `${base}/pages`,
				qs: { page: n },
			});
			const replay = [await page(1), await page(2)];
			expect(requests).toEqual(['POST /pages?page=1', 'POST /pages?page=2']);

			const out = await runner.run(
				parseNodeStepArgs({
					name: 'Pages',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					parameters: {
						method: 'POST',
						url: `${base}/pages`,
						sendBody: true,
						specifyBody: 'json',
						jsonBody: '{"size": 1}',
						options: {
							pagination: {
								pagination: {
									parameters: {
										parameters: [{ name: 'page', value: '={{ $pageCount + 1 }}' }],
									},
									paginationCompleteWhen: 'other',
									completeExpression: '={{ $response.body.count >= 4 }}',
								},
							},
						},
					},
					items: [{}],
					replay,
				}),
				{ step: 'Pages', key: 'k' },
			);

			// Pages 1 and 2 are on the network once. The host sends pages 3 and 4.
			expect(requests).toEqual([
				'POST /pages?page=1',
				'POST /pages?page=2',
				'POST /pages?page=3',
				'POST /pages?page=4',
			]);
			expect(out).toEqual([
				{ path: '/pages?page=1', count: 1 },
				{ path: '/pages?page=2', count: 2 },
				{ path: '/pages?page=3', count: 3 },
				{ path: '/pages?page=4', count: 4 },
			]);
		});

		it('keeps an entry at the end of a list that is longer than the host reads', () => {
			const response = { status: 200, headers: {}, body: 'x' };
			const list = Array.from({ length: 1030 }, (_, k) => ({
				method: 'POST',
				url: `https://x.test/${k}`,
				qs: {},
				response,
			}));
			const entries = readReplay(list);
			expect(entries).toHaveLength(1025);
			expect(entries[1024].unreadable).toBe(true);
		});
	});

	it('makes one key for the query formats of the request helpers', () => {
		const key = requestKey('GET', new URL('https://x.test/a'), { ids: ['1', '2'], q: 'a b' });
		expect(requestKey('get', new URL('https://x.test/a?q=a+b&ids=1&ids=2'))).toBe(key);
		expect(requestKey('GET', new URL('https://x.test/a?ids%5B0%5D=1&ids%5B1%5D=2&q=a%20b'))).toBe(
			key,
		);
		expect(requestKey('GET', new URL('https://x.test/a?ids=2&ids=1&q=a%20b'))).not.toBe(
			requestKey('GET', new URL('https://x.test/b?ids=2&ids=1&q=a%20b')),
		);
	});
});
