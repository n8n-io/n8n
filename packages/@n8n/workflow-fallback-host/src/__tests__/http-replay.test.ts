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
				{ method: 'POST', url: 'https://x.test/a', qs: {}, response },
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
