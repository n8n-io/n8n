/**
 * Chaos tests of the worker pool: a step that fails badly runs together with
 * healthy steps. Only the bad step may fail; the healthy steps get their
 * result, also when they ran on the worker that the bad step stopped.
 *
 * The steps go as wfrt sends them: on one connection for each worker, after
 * a hello (`RuntimeClient`). When a worker stops, the client applies the
 * blame rule of wfrt: the server sends `worker_lost`, a step alone on the
 * connection fails with its reason, and the other steps go again alone.
 *
 * The bad steps are Code steps that may load built-in modules
 * (`WF_FALLBACK_CODE_ALLOW_MODULES`), as n8n's Code node can. The workers run
 * the compiled `step-worker.js`, so the test builds the package first.
 */
import { createServer, type Server } from 'node:net';

import type { StepResponse } from '../protocol';
import { buildHostForTests, RuntimeClient, startTestHost, type TestHost } from './test-client';

const code = (id: string, body: string) => ({
	id,
	kind: 'code',
	step: `step-${id}`,
	key: `key-${id}`,
	args: { name: `step-${id}`, code: body, items: [{ n: 1 }] },
});

const setNode = (id: string, value: number) => ({
	id,
	kind: 'node',
	step: `set-${id}`,
	key: `key-${id}`,
	args: {
		name: `set-${id}`,
		type: 'n8n-nodes-base.set',
		typeVersion: 3.4,
		parameters: {
			assignments: {
				assignments: [
					{ id: 'a', name: 'v', value: `={{ [${value}].map((x) => x * 2)[0] }}`, type: 'number' },
				],
			},
			options: {},
		},
		items: [{}],
	},
});

/** Healthy steps: Code steps and node steps with an expression in the isolate. */
function healthy(tag: string): Array<{ request: unknown; expected: StepResponse }> {
	const list: Array<{ request: unknown; expected: StepResponse }> = [];
	for (let i = 0; i < 4; i++) {
		const id = `${tag}-code-${i}`;
		list.push({
			request: code(id, `return [{ v: ${i} }];`),
			expected: { id, ok: true, result: [{ v: i }] },
		});
	}
	for (let i = 0; i < 2; i++) {
		const id = `${tag}-set-${i}`;
		list.push({
			request: setNode(id, i + 10),
			expected: { id, ok: true, result: [{ v: 2 * (i + 10) }] },
		});
	}
	return list;
}

const T = "const t = require('timers');";

describe('fallback host worker pool under faults', () => {
	let host: TestHost;
	let client: RuntimeClient;
	const logs: string[] = [];

	beforeAll(async () => {
		buildHostForTests();
		process.env.WF_FALLBACK_CODE_ALLOW_MODULES = '*';
		host = await startTestHost(60_000, {
			size: 2,
			blockedMs: 1_500,
			stepTimeoutMs: 20_000,
			memoryMb: 384,
			log: (message) => logs.push(message),
		});
		client = await RuntimeClient.connect(host.socketPath);
		// Load the node packages in both workers before the faults start.
		await client.sendBatch([setNode('warm-1', 1), setNode('warm-2', 2)]);
	}, 120_000);

	afterAll(async () => {
		client.close();
		await host.stop();
		delete process.env.WF_FALLBACK_CODE_ALLOW_MODULES;
	});

	/** Sends the bad step between healthy steps; checks the healthy ones. */
	async function withHealthy(tag: string, bad: unknown): Promise<StepResponse> {
		const others = healthy(tag);
		const requests = [
			...others.slice(0, 3).map((o) => o.request),
			bad,
			...others.slice(3).map((o) => o.request),
		];
		const responses = await client.sendBatch(requests);
		const byId = new Map(responses.map((r) => [r.id, r]));
		for (const o of others) expect(byId.get(o.expected.id)).toEqual(o.expected);
		const badId = (bad as { id: string }).id;
		const result = byId.get(badId);
		if (!result) throw new Error(`no response for ${badId}`);
		return result;
	}

	it('answers a bad request from the worker, with its id', async () => {
		const r = await withHealthy('bad-kind', {
			id: 'bad-kind-bad',
			kind: 'http',
			step: 's',
			key: 'k',
			args: {},
		});
		expect(r).toEqual({
			id: 'bad-kind-bad',
			ok: false,
			error: 'Request "kind" must be "code" or "node"',
		});
	});

	it('answers a frame that is not JSON and keeps serving', async () => {
		const body = Buffer.from('{not json', 'utf8');
		const frame = Buffer.alloc(4 + body.length);
		frame.writeUInt32LE(body.length, 0);
		body.copy(frame, 4);
		const reply = client.expect('');
		client.writeRaw(frame);
		expect(await reply).toEqual({ id: '', ok: false, error: 'Request is not valid JSON' });
		const again = await withHealthy(
			'after-bad-json',
			code('after-bad-json-ok', 'return [{ ok: 3 }];'),
		);
		expect(again.ok).toBe(true);
	});

	it('fails a step that throws synchronously', async () => {
		const r = await withHealthy('sync', code('sync-bad', 'throw new Error("boom");'));
		expect(r).toEqual({ id: 'sync-bad', ok: false, error: 'boom' });
	});

	it('keeps serving when a step rejects after it returned', async () => {
		const r = await withHealthy(
			'late-reject',
			code(
				'late-reject-bad',
				`${T} t.setTimeout(() => Promise.reject(new Error('late reject')), 20); return [{ ok: 1 }];`,
			),
		);
		expect(r).toEqual({ id: 'late-reject-bad', ok: true, result: [{ ok: 1 }] });
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(logs.some((l) => l.includes('late reject'))).toBe(true);
		const again = await withHealthy('after-reject', code('after-reject-ok', 'return [{ ok: 2 }];'));
		expect(again.ok).toBe(true);
	});

	it('logs a rejection while the step runs, and the step ends with its own result', async () => {
		// As n8n's main process: an unhandled rejection is logged, it does not fail the step.
		const r = await withHealthy(
			'running-reject',
			code(
				'running-reject-step',
				`${T} Promise.reject(new Error('running reject')); await new Promise((resolve) => t.setTimeout(resolve, 50)); return [{ ok: 3 }];`,
			),
		);
		expect(r).toEqual({ id: 'running-reject-step', ok: true, result: [{ ok: 3 }] });
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(
			logs.some((l) => l.includes('running reject') && l.includes('running-reject-step')),
		).toBe(true);
	});

	it('keeps serving when a timer of an ended step throws', async () => {
		const r = await withHealthy(
			'late-throw',
			code(
				'late-throw-bad',
				`${T} t.setTimeout(() => { throw new Error('late throw'); }, 20); return [{ ok: 1 }];`,
			),
		);
		expect(r.ok).toBe(true);
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(logs.some((l) => l.includes('late throw'))).toBe(true);
		const again = await withHealthy('after-throw', code('after-throw-ok', 'return [{ ok: 2 }];'));
		expect(again.ok).toBe(true);
	});

	it('stops a step that loops forever, and only that step', async () => {
		const r = await withHealthy('loop', code('loop-bad', 'for (;;) {}'));
		expect(r.ok).toBe(false);
		expect(r).toMatchObject({ error: expect.stringContaining('did not answer') });
	}, 30_000);

	it('stops a step that uses all memory, and only that step', async () => {
		const r = await withHealthy(
			'oom',
			code('oom-bad', 'const keep = []; for (;;) keep.push(new Array(1e6).fill(Math.random()));'),
		);
		expect(r.ok).toBe(false);
		expect(r).toMatchObject({ error: expect.stringContaining('memory') });
	}, 60_000);

	it('fails a step that calls process.exit', async () => {
		const r = await withHealthy('exit', code('exit-bad', "require('process').exit(1);"));
		expect(r).toMatchObject({ ok: false, error: expect.stringContaining('process.exit') });
	});

	it('fails a step that calls process.abort', async () => {
		const r = await withHealthy('abort', code('abort-bad', "require('process').abort();"));
		expect(r).toMatchObject({ ok: false, error: expect.stringContaining('process.abort') });
	});

	it('keeps serving when a step leaves an open socket', async () => {
		const r = await withHealthy(
			'socket',
			code(
				'socket-bad',
				"const net = require('net'); const s = net.createServer().listen(0); net.connect(s.address().port); return [{ ok: 1 }];",
			),
		);
		expect(r.ok).toBe(true);
		const again = await withHealthy('after-socket', code('after-socket-ok', 'return [{ ok: 2 }];'));
		expect(again.ok).toBe(true);
	});

	it('fails only the steps of a worker that a native crash stops', async () => {
		// SIGKILL from outside stands for a native crash (a segfault in a native module).
		const r = await withHealthy(
			'crash',
			code('crash-bad', "require('child_process').execSync('kill -9 ' + require('process').pid);"),
		);
		expect(r).toMatchObject({ ok: false, error: expect.stringContaining('SIGKILL') });
	}, 30_000);

	it('has replaced every stopped worker, and told the runtime why', async () => {
		expect(logs.filter((l) => l.startsWith('A worker stopped')).length).toBeGreaterThanOrEqual(2);
		expect(client.lostReasons).toEqual(
			expect.arrayContaining([
				expect.stringContaining('did not answer'),
				expect.stringContaining('memory'),
				expect.stringContaining('SIGKILL'),
			]),
		);
		// The client opens a new connection for each one that closed.
		const deadline = Date.now() + 10_000;
		while (client.openConnections < 2 && Date.now() < deadline) {
			await new Promise((resolve) => setTimeout(resolve, 20));
		}
		expect(client.openConnections).toBe(2);
	});
});

describe('fallback host worker pool with a step that hangs', () => {
	let host: TestHost;
	let client: RuntimeClient;
	let silent: Server;

	beforeAll(async () => {
		// A server that accepts connections and never answers.
		silent = createServer(() => {});
		await new Promise<void>((resolve) => silent.listen(0, '127.0.0.1', resolve));
		buildHostForTests();
		host = await startTestHost(1_000, { size: 1, stepTimeoutMs: 1_500, blockedMs: 5_000 });
		client = await RuntimeClient.connect(host.socketPath);
	}, 120_000);

	afterAll(async () => {
		client.close();
		await host.stop();
		silent.close();
	});

	it('fails a step that waits too long, and the worker serves on', async () => {
		const address = silent.address();
		const port = typeof address === 'object' && address ? address.port : 0;
		const responses = await client.sendBatch([
			{
				id: 'hang',
				kind: 'node',
				step: 'hang',
				key: 'k-hang',
				args: {
					name: 'hang',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					parameters: { url: `http://127.0.0.1:${port}/`, options: {} },
					items: [{}],
				},
			},
			code('after-hang', 'return [{ ok: 1 }];'),
			setNode('after-hang-set', 4),
		]);
		expect(responses[0]).toEqual({
			id: 'hang',
			ok: false,
			error: 'The step did not finish within 1500 ms',
		});
		expect(responses[1]).toEqual({ id: 'after-hang', ok: true, result: [{ ok: 1 }] });
		expect(responses[2]).toEqual({ id: 'after-hang-set', ok: true, result: [{ v: 8 }] });
	}, 30_000);
});

describe('fallback host that stops while a step runs alone', () => {
	let host: TestHost | undefined;
	let client: RuntimeClient | undefined;

	beforeAll(async () => {
		buildHostForTests();
		host = await startTestHost(10_000, { size: 1, blockedMs: 10_000 });
		client = await RuntimeClient.connect(host.socketPath);
	}, 120_000);

	afterAll(async () => {
		client?.close();
		await host?.stop();
	});

	it('blames no step: the step fails as retryable, without worker_lost', async () => {
		if (!host || !client) throw new Error('The test host did not start');
		const reply = client.send(
			code(
				'slow',
				'const end = Date.now() + 3000; while (Date.now() < end) {} return [{ ok: 1 }];',
			),
		);
		await new Promise((resolve) => setTimeout(resolve, 500));
		// The whole host stops: the pool closes the connections without a reason.
		const stopping = host.stop();
		host = undefined;
		const response = await reply;
		// No new connections to a host that has stopped.
		client.close();
		await stopping;
		expect(response).toMatchObject({ id: 'slow', ok: false, retryable: true });
		expect(client.lostReasons).toEqual([]);
	}, 60_000);
});
