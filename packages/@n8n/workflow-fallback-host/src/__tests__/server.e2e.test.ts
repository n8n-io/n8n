import { encodeFrame } from '../protocol';
import { startTestHost, TestClient, type TestHost } from './test-client';

const code = (id: string, body: string, items?: unknown[]) => ({
	id,
	kind: 'code',
	step: `step-${id}`,
	key: `key-${id}`,
	args: { name: `step-${id}`, code: body, ...(items ? { items } : {}) },
});

describe('fallback host over a Unix socket', () => {
	let host: TestHost;
	let client: TestClient;

	beforeAll(async () => {
		host = await startTestHost();
	});

	afterAll(async () => {
		await host.stop();
	});

	beforeEach(async () => {
		client = await TestClient.connect(host.socketPath);
	});

	afterEach(() => client.close());

	it('answers a batch of code requests sent in one write', async () => {
		const responses = await client.sendBatch([
			code('a', 'return items.map((i) => ({ doubled: i.n * 2 }));', [{ n: 1 }, { n: 5 }]),
			code('b', 'return { hello: "world" };'),
			code('c', 'throw new Error("nope");'),
		]);

		expect(responses).toEqual([
			{ id: 'a', ok: true, result: [{ doubled: 2 }, { doubled: 10 }] },
			{ id: 'b', ok: true, result: [{ hello: 'world' }] },
			{ id: 'c', ok: false, error: 'nope' },
		]);
	});

	it('decodes a frame that arrives in pieces', async () => {
		const frame = encodeFrame(code('split', 'return { ok: 1 };'));
		const reply = client.expect('split');
		client.write(frame.subarray(0, 2));
		client.write(frame.subarray(2, 9));
		client.write(frame.subarray(9));
		expect(await reply).toEqual({ id: 'split', ok: true, result: [{ ok: 1 }] });
	});

	it('answers a bad request with its id and keeps the connection open', async () => {
		const [bad] = await client.sendBatch([
			{ id: 'bad', kind: 'http', step: 's', key: 'k', args: {} },
		]);
		expect(bad).toEqual({ id: 'bad', ok: false, error: 'Request "kind" must be "code" or "node"' });
		const [good] = await client.sendBatch([code('after', 'return {};')]);
		expect(good.ok).toBe(true);
	});

	it('reports a timeout and keeps serving', async () => {
		const [slow, next] = await client.sendBatch([
			code('slow', 'while (true) {}'),
			code('next', 'return { n: 1 };'),
		]);
		expect(slow).toEqual({ id: 'slow', ok: false, error: 'Code did not finish within 1000 ms' });
		expect(next).toEqual({ id: 'next', ok: true, result: [{ n: 1 }] });
	});

	it('runs a v1 node through the shim', async () => {
		const [response] = await client.sendBatch([
			{
				id: 'set',
				kind: 'node',
				step: 'Set fields',
				key: 'k-set',
				args: {
					name: 'Set fields',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					parameters: {
						mode: 'manual',
						includeOtherFields: true,
						assignments: {
							assignments: [
								{ id: '1', name: 'greeting', value: '={{ "hi " + $json.name }}', type: 'string' },
							],
						},
						options: {},
					},
					items: [{ name: 'Ada' }, { name: 'Grace' }],
				},
			},
		]);
		expect(response).toEqual({
			id: 'set',
			ok: true,
			result: [
				{ name: 'Ada', greeting: 'hi Ada' },
				{ name: 'Grace', greeting: 'hi Grace' },
			],
		});
	});

	it('answers node and code requests out of order', async () => {
		const responses = await client.sendBatch([
			{
				id: 'node-first',
				kind: 'node',
				step: 'noop',
				key: 'k1',
				args: { name: 'noop', type: 'n8n-nodes-base.noOp', parameters: {}, items: [{ a: 1 }] },
			},
			code('code-second', 'return { b: 2 };'),
		]);
		expect(responses).toEqual([
			{ id: 'node-first', ok: true, result: [{ a: 1 }] },
			{ id: 'code-second', ok: true, result: [{ b: 2 }] },
		]);
		// The code step is synchronous; the node step awaits, so it answers last.
		expect(client.order).toEqual(['code-second', 'node-first']);
	});

	it('reports an unknown node type', async () => {
		const [response] = await client.sendBatch([
			{
				id: 'x',
				kind: 'node',
				step: 'x',
				key: 'k',
				args: { name: 'x', type: 'n8n-nodes-base.doesNotExist', parameters: {} },
			},
		]);
		expect(response.ok).toBe(false);
	});

	it('reports a missing credential slot', async () => {
		const [response] = await client.sendBatch([
			{
				id: 'pg',
				kind: 'node',
				step: 'pg',
				key: 'k',
				args: {
					name: 'pg',
					type: 'n8n-nodes-base.postgres',
					parameters: { operation: 'executeQuery', query: 'select 1' },
					credential: 'missing',
				},
			},
		]);
		expect(response).toEqual({ id: 'pg', ok: false, error: 'No credential for slot "missing"' });
	});
});
