/**
 * Protocol version 2 (`hello.ts`): the runtime sends a hello, the server
 * hands the connection to a worker, and the worker answers the steps on it.
 * The client here does what wfrt does: it waits for the hello answer, sends
 * steps, and moves to a new connection after `goaway`.
 *
 * What wfrt does when a worker stops (the blame and the send again alone)
 * is in `RuntimeClient` (`chaos.e2e.test.ts`), and end to end with wfrt in
 * `workflow-runtime/bench/chaos/run.mjs`. The workers run the compiled
 * `step-worker.js`, so the test builds the package first.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { connect, type Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { encodeFrame, FrameDecoder } from '../protocol';
import { buildHostForTests, startTestHost, type TestHost } from './test-client';

type Frame = Record<string, unknown>;

/** One runtime connection of protocol version 2. */
class DirectConn {
	private readonly decoder = new FrameDecoder();

	private readonly waiting = new Map<string, (frame: Frame) => void>();

	hello: Frame | undefined;

	goaway = false;

	/** The `worker_lost` frame, when the server sent one before it closed. */
	lost: Frame | undefined;

	closed = false;

	/** Answers the service calls of steps (spec 9.9), as wfrt and n8n do. */
	onService: ((call: Frame) => Frame) | undefined;

	readonly serviceCalls: Frame[] = [];

	private constructor(private readonly socket: Socket) {
		socket.on('data', (chunk: Buffer) => {
			for (const body of this.decoder.push(chunk)) {
				const frame = JSON.parse(body.toString('utf8')) as Frame;
				if (frame.hello) this.hello = frame;
				else if (frame.goaway) this.goaway = true;
				else if (frame.worker_lost) this.lost = frame;
				else if (frame.type === 'service') {
					this.serviceCalls.push(frame);
					const answer = this.onService?.(frame) ?? { ok: false, error: 'no service here' };
					socket.write(
						encodeFrame({
							type: 'serviceResult',
							id: frame.id,
							n: this.serviceCalls.length,
							...answer,
						}),
					);
				} else this.waiting.get(String(frame.id))?.(frame);
			}
		});
		socket.on('close', () => (this.closed = true));
	}

	static async open(path: string): Promise<DirectConn> {
		const socket = await new Promise<Socket>((resolve, reject) => {
			const s = connect(path, () => resolve(s));
			s.once('error', reject);
		});
		const conn = new DirectConn(socket);
		socket.write(encodeFrame({ hello: { version: 2 } }));
		const deadline = Date.now() + 30_000;
		while (!conn.hello && Date.now() < deadline) await new Promise((r) => setTimeout(r, 10));
		return conn;
	}

	async send(request: Frame): Promise<Frame> {
		const reply = new Promise<Frame>((resolve) => this.waiting.set(String(request.id), resolve));
		this.socket.write(encodeFrame(request));
		return await reply;
	}

	write(bytes: Buffer): void {
		this.socket.write(bytes);
	}

	close(): void {
		this.socket.end();
	}
}

const code = (id: string, body: string) => ({
	id,
	kind: 'code',
	step: 'step',
	key: `key-${id}`,
	args: { name: 'step', code: body, items: [{ n: 1 }] },
});

describe('fallback host protocol version 2', () => {
	beforeAll(() => buildHostForTests(), 120_000);

	let host: TestHost;
	afterEach(async () => await host?.stop());

	it('hands the connection to a worker that answers the hello and the steps', async () => {
		host = await startTestHost(5_000, { size: 2 });
		const conn = await DirectConn.open(host.socketPath);
		expect(conn.hello).toEqual({ hello: { version: 2, workers: 2, worker: expect.any(Number) } });
		expect(await conn.send(code('a', 'return [{ v: 1 }];'))).toEqual({
			id: 'a',
			ok: true,
			result: [{ v: 1 }],
		});
		expect(await conn.send({ id: 'bad', kind: 'http', step: 's', key: 'k', args: {} })).toEqual({
			id: 'bad',
			ok: false,
			error: 'Request "kind" must be "code" or "node"',
		});
		conn.close();
	}, 60_000);

	it('gives each new connection to the worker with the fewest', async () => {
		host = await startTestHost(5_000, { size: 2 });
		const first = await DirectConn.open(host.socketPath);
		const second = await DirectConn.open(host.socketPath);
		expect(first.hello?.hello).not.toEqual(second.hello?.hello);
		first.close();
		second.close();
	}, 60_000);

	it('closes the connections of a worker that stops', async () => {
		process.env.WF_FALLBACK_CODE_ALLOW_MODULES = '*';
		try {
			host = await startTestHost(5_000, { size: 1, blockedMs: 1_000 });
			const conn = await DirectConn.open(host.socketPath);
			// A native crash: the worker process ends at once.
			void conn.send(
				code('crash', "require('child_process').execSync('kill -9 ' + require('process').pid);"),
			);
			const deadline = Date.now() + 20_000;
			while (!conn.closed && Date.now() < deadline) await new Promise((r) => setTimeout(r, 20));
			const closed = conn.closed;
			conn.close();
			expect(closed).toBe(true);
			// The server wrote the reason before it closed the connection.
			expect(conn.lost).toEqual({
				worker_lost: { reason: expect.stringContaining('SIGKILL') },
			});
			// The pool started a new worker; a new connection gets it.
			const again = await DirectConn.open(host.socketPath);
			expect(await again.send(code('b', 'return [{ v: 2 }];'))).toEqual({
				id: 'b',
				ok: true,
				result: [{ v: 2 }],
			});
			again.close();
		} finally {
			delete process.env.WF_FALLBACK_CODE_ALLOW_MODULES;
		}
	}, 60_000);

	it('asks the deduplication store of n8n through a service call', async () => {
		host = await startTestHost(5_000, { size: 1 });
		const conn = await DirectConn.open(host.socketPath);
		// The store knew the value 1 already.
		conn.onService = (call) => {
			if (call.op !== 'checkProcessedAndRecord') return { ok: true, result: null };
			const args = call.args as { items?: unknown[] };
			const items = args.items ?? [];
			return {
				ok: true,
				result: {
					new: items.filter((v) => String(v) !== '1'),
					processed: items.filter((v) => String(v) === '1'),
				},
			};
		};
		const reply = await conn.send({
			id: '7:1',
			kind: 'node',
			step: 'Remove Duplicates',
			key: 'k',
			args: {
				name: 'Remove Duplicates',
				type: 'n8n-nodes-base.removeDuplicates',
				typeVersion: 2,
				parameters: {
					operation: 'removeItemsSeenInPreviousExecutions',
					logic: 'removeItemsWithAlreadySeenKeyValues',
					dedupeValue: '={{ $json.k }}',
				},
				items: [{ k: 1 }, { k: 2 }],
			},
		});
		expect(reply).toEqual({ id: '7:1', ok: true, result: [{ k: 2 }] });
		expect(conn.serviceCalls).toContainEqual(
			expect.objectContaining({
				type: 'service',
				id: '7:1',
				service: 'deduplication',
				op: 'checkProcessedAndRecord',
			}),
		);
		conn.close();
	}, 60_000);

	it('fails a service call that the runtime answers with an error', async () => {
		host = await startTestHost(5_000, { size: 1 });
		const conn = await DirectConn.open(host.socketPath);
		conn.onService = () => ({
			ok: false,
			error: 'service: the call timed out (--service-timeout-ms)',
		});
		const reply = await conn.send({
			id: '8:1',
			kind: 'node',
			step: 'Remove Duplicates',
			key: 'k',
			args: {
				name: 'Remove Duplicates',
				type: 'n8n-nodes-base.removeDuplicates',
				typeVersion: 2,
				parameters: {
					operation: 'removeItemsSeenInPreviousExecutions',
					logic: 'removeItemsWithAlreadySeenKeyValues',
					dedupeValue: '={{ $json.k }}',
				},
				items: [{ k: 1 }],
			},
		});
		expect(reply.ok).toBe(false);
		expect(String(reply.error)).toContain('the call timed out');
		conn.close();
	}, 60_000);

	it('closes a connection that the worker closes', async () => {
		host = await startTestHost(5_000, { size: 1 });
		const conn = await DirectConn.open(host.socketPath);
		// A length larger than the frame limit: the worker cannot trust the stream.
		const bad = Buffer.alloc(4);
		bad.writeUInt32LE(0xffff_fff0, 0);
		conn.write(bad);
		const deadline = Date.now() + 10_000;
		while (!conn.closed && Date.now() < deadline) await new Promise((r) => setTimeout(r, 20));
		// The server process closed its copy of the socket too, so the runtime sees the close.
		expect(conn.closed).toBe(true);
		expect(conn.lost).toBeUndefined();
	}, 60_000);

	it('gives a connection to a worker only when it has loaded its modules', async () => {
		// Each worker blocks its event loop for 3 s before it starts, as a worker
		// on a loaded machine can while it loads n8n.
		const dir = mkdtempSync(join(tmpdir(), 'wf-slow-start-'));
		const slow = join(dir, 'slow-start.cjs');
		writeFileSync(slow, 'const end = Date.now() + 3000; while (Date.now() < end) {}\n');
		const logs: string[] = [];
		try {
			host = await startTestHost(5_000, {
				size: 1,
				blockedMs: 1_000,
				execArgv: ['--require', slow],
				log: (m) => logs.push(m),
			});
			// The runtime connects at once, before the worker is ready.
			const conn = await DirectConn.open(host.socketPath);
			expect(conn.hello).toEqual({ hello: { version: 2, workers: 1, worker: 0 } });
			expect(await conn.send(code('s', 'return [{ v: 1 }];'))).toEqual({
				id: 's',
				ok: true,
				result: [{ v: 1 }],
			});
			// Pings went on while the connection waited: the pool stopped no worker.
			await new Promise((r) => setTimeout(r, 2_000));
			expect(logs.filter((l) => l.startsWith('A worker stopped'))).toEqual([]);
			conn.close();
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	}, 60_000);

	it('recycles a worker with goaway and loses no step', async () => {
		const logs: string[] = [];
		host = await startTestHost(5_000, {
			size: 1,
			blockedMs: 400,
			recycleSteps: 100,
			log: (m) => logs.push(m),
		});
		let conn = await DirectConn.open(host.socketPath);
		let failed = 0;
		for (let i = 0; i < 400; i++) {
			if (conn.goaway) {
				// As wfrt: no new steps there; the old one closes when its steps ended.
				conn.close();
				conn = await DirectConn.open(host.socketPath);
			}
			const reply = await conn.send(code(`s${i}`, `return [{ v: ${i} }];`));
			if (reply.ok !== true) failed++;
			// Pings carry the step count, so give the pool a moment now and then.
			if (i % 50 === 49) await new Promise((r) => setTimeout(r, 250));
		}
		conn.close();
		expect(failed).toBe(0);
		expect(logs.filter((l) => l.startsWith('Recycling a worker')).length).toBeGreaterThanOrEqual(2);
		expect(logs.filter((l) => l.startsWith('A worker stopped')).length).toBe(0);
	}, 120_000);
});
