/**
 * Long soak of the worker pool with recycling, worker deaths and connection
 * hand-overs mixed in, as a replay run of many hours does. The supervisor must
 * keep answering pings and must not stop a worker that still runs steps.
 *
 * `soak.e2e.test.ts` runs the same mix for a shorter time. This file adds the
 * two things that a long-lived host gets wrong:
 *
 * - Hundreds of recycling cycles, with a worker death between them, and a
 *   check that the pool's own state does not grow with the cycles.
 * - A worker that keeps serving its runtime connections but no longer reads
 *   its IPC channel. Pings used to go over that channel, so the pool stopped a
 *   healthy worker every `blockedMs` and counted 0 steps for it.
 *
 * The workers run the compiled `step-worker.js`, so the test builds the
 * package first.
 */
import type { StepRequest } from '../protocol';
import { buildHostForTests, RuntimeClient, startTestHost, type TestHost } from './test-client';

/** The most connections that wfrt keeps to one host (`fallback_frames.zig`). */
const MAX_CONNS = 8;

/** One measurement of the host's own state in the middle of the soak. */
interface PoolSnapshot {
	state: PoolState;
	resources: Record<string, number>;
	listeners: Record<string, number>;
}

/** Workers that the pool has now, its copy sockets, and what waits for a worker. */
interface PoolState {
	workers: number;
	connections: number;
	pending: number;
	handovers: number;
	jobs: number;
}

/** The handles of this process, by type. A socket or a timer that never closes shows here. */
function resources(): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const name of process.getActiveResourcesInfo()) counts[name] = (counts[name] ?? 0) + 1;
	return counts;
}

/** The listeners of the events that a host uses. A listener added per hand-over shows here. */
function listeners(): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const event of ['message', 'disconnect', 'error', 'close', 'warning', 'exit']) {
		const count = process.listenerCount(event);
		if (count > 0) counts[event] = count;
	}
	return counts;
}

function code(id: string, body = 'return [{ v: 1 }];'): StepRequest {
	return {
		id,
		kind: 'code',
		step: 'Code',
		key: `key-${id}`,
		args: { name: 'Code', code: body, items: [{ n: 1 }] },
	};
}

function setNode(id: string, value: number): StepRequest {
	return {
		id,
		kind: 'node',
		step: 'Set',
		key: `key-${id}`,
		args: {
			name: 'Set',
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
	};
}

/** A step that ends its own worker as a native crash does. */
function crash(id: string): StepRequest {
	return code(id, "require('child_process').execSync('kill -9 ' + require('process').pid);");
}

function count(logs: string[], start: string): number {
	return logs.filter((l) => l.startsWith(start)).length;
}

describe('fallback host worker pool over a long run with recycling', () => {
	let host: TestHost | undefined;
	let client: RuntimeClient | undefined;

	beforeAll(() => buildHostForTests(), 120_000);

	afterEach(async () => {
		client?.close();
		await host?.stop();
		client = undefined;
		host = undefined;
	}, 60_000);

	it('answers pings, runs steps and keeps its state bounded over hundreds of recycles', async () => {
		const size = 3;
		const logs: string[] = [];
		process.env.WF_FALLBACK_CODE_ALLOW_MODULES = '*';
		try {
			host = await startTestHost(20_000, {
				size,
				stepTimeoutMs: 20_000,
				// A ping every 375 ms: a worker that misses four of them is stopped.
				blockedMs: 1_500,
				memoryMb: 1024,
				recycleSteps: 20,
				log: (message) => logs.push(message),
			});
			const pool = host.pool;
			if (!pool) throw new Error('The test host has no pool');
			client = await RuntimeClient.connect(host.socketPath);

			let sent = 0;
			const failures: string[] = [];
			/** Steps that this test ended on purpose. Their worker blamed them. */
			const crashed = new Set<string>();
			const deadline = Date.now() + 240_000;

			/** Steps keep coming, as in a replay: four lanes of three steps. */
			const lanes = async (until: () => boolean) => {
				const lane = async (laneId: number) => {
					while (!until() && Date.now() < deadline) {
						const batch = [0, 1, 2].map(() => code(`s${laneId}-${sent++}`));
						for (const reply of await client!.sendBatch(batch)) {
							if (!reply.ok && !crashed.has(reply.id) && failures.length < 8) {
								failures.push(JSON.stringify(reply));
							}
						}
						await new Promise((resolve) => setTimeout(resolve, 5));
					}
				};
				await Promise.all([0, 1, 2, 3].map(async (i) => await lane(i)));
			};

			/** A worker dies, with a connection and steps in it. */
			const killAWorker = async () => {
				const id = `crash-${sent++}`;
				crashed.add(id);
				// The runtime re-sends the other steps alone; the pool starts a new worker.
				await client!.send(crash(id));
			};

			let cycle = 0;
			let killing: Promise<unknown> = Promise.resolve();
			const killer = setInterval(() => {
				cycle += 1;
				if (cycle % 5 === 0) killing = killAWorker();
			}, 1_000);

			/** Runs lanes until the pool has recycled `target` workers, then measures. */
			const measure = async (target: number) => {
				await lanes(() => count(logs, 'Recycling a worker') >= target);
				return { state: pool.state(), resources: resources(), listeners: listeners() };
			};

			let first: PoolSnapshot;
			let second: PoolSnapshot;
			try {
				first = await measure(100);
				second = await measure(200);
			} finally {
				clearInterval(killer);
				await killing;
			}

			// The steps of the last cycles keep completing, node steps included.
			const last = await client.sendBatch([
				code(`last-a-${sent++}`),
				setNode(`last-b-${sent++}`, 4),
				code(`last-c-${sent++}`),
			]);
			expect(last.map((r) => r.ok)).toEqual([true, true, true]);

			const recycled = count(logs, 'Recycling a worker');
			const stopped = logs.filter((l) => l.startsWith('A worker stopped'));
			const pings = pool.pingStats();
			// eslint-disable-next-line no-console
			console.log(
				`soak-long: ${sent} steps, ${recycled} recycled, ${stopped.length} stopped, ${pings.answered}/${pings.sent} pings answered, ${JSON.stringify(second.state)}`,
			);

			expect(failures).toEqual([]);
			expect(recycled).toBeGreaterThanOrEqual(150);
			// A worker that still runs steps is never stopped: no ping may time out.
			expect(logs.filter((l) => l.includes('did not answer'))).toEqual([]);
			expect(logs.filter((l) => l.includes('did not take a runtime connection'))).toEqual([]);
			// The guard pinged, and every ping is answered except the one in
			// flight for each worker.
			expect(pings.sent).toBeGreaterThan(20);
			expect(pings.answered).toBeGreaterThanOrEqual(pings.sent - 2 * size);

			// The pool's own state does not grow with the number of cycles.
			expect(second.state.workers).toBeLessThanOrEqual(size + 4);
			expect(second.state.connections).toBeLessThanOrEqual(MAX_CONNS);
			expect(second.state.pending).toBeLessThanOrEqual(MAX_CONNS);
			expect(second.state.handovers).toBeLessThanOrEqual(2);
			expect(second.state.jobs).toBe(0);
			expect(second.state.connections).toBeLessThanOrEqual(first.state.connections + 2);

			for (const event of new Set([
				...Object.keys(first.listeners),
				...Object.keys(second.listeners),
			])) {
				const growth = (second.listeners[event] ?? 0) - (first.listeners[event] ?? 0);
				expect({ event, growth }).toMatchObject({ event });
				expect(growth, `${event} listeners`).toBeLessThanOrEqual(1);
			}

			// No socket, timer or child of this process grows with the cycles.
			for (const name of new Set([
				...Object.keys(first.resources),
				...Object.keys(second.resources),
			])) {
				const growth = (second.resources[name] ?? 0) - (first.resources[name] ?? 0);
				expect({ name, growth }).toMatchObject({ name });
				expect(growth, `${name} handles`).toBeLessThanOrEqual(4);
			}
		} finally {
			delete process.env.WF_FALLBACK_CODE_ALLOW_MODULES;
		}
	}, 420_000);

	it('keeps supervising a worker that no longer reads its IPC channel', async () => {
		process.env.WF_FALLBACK_CODE_ALLOW_MODULES = '*';
		try {
			const logs: string[] = [];
			host = await startTestHost(20_000, {
				size: 1,
				stepTimeoutMs: 10_000,
				blockedMs: 1_500,
				memoryMb: 1024,
				recycleSteps: 100_000,
				log: (message) => logs.push(message),
			});
			client = await RuntimeClient.connect(host.socketPath);
			// A step takes the IPC channel of its worker away, as a step that
			// closes a descriptor or removes the listener of a module can. The
			// worker goes on with the steps on its runtime connection.
			const deaf = await client.send(
				code('deaf', "require('process').removeAllListeners('message'); return [{ v: 0 }];"),
			);
			expect(deaf.ok).toBe(true);
			// Longer than `blockedMs`: the pool used to stop the worker here.
			await new Promise((resolve) => setTimeout(resolve, 3_000));
			const replies = await client.sendBatch(
				Array.from({ length: 6 }, (_, i) => code(`after-${i}`, `return [{ v: ${i} }];`)),
			);
			expect(replies.map((r) => r.ok)).toEqual([true, true, true, true, true, true]);
			// The worker is healthy: the pool keeps it and gives it the steps.
			expect(logs.filter((l) => l.startsWith('A worker stopped'))).toEqual([]);
			expect(client.lostReasons).toEqual([]);
			expect(host.pool?.pingStats().answered).toBeGreaterThan(0);
		} finally {
			delete process.env.WF_FALLBACK_CODE_ALLOW_MODULES;
		}
	}, 120_000);

	it('still stops a worker that blocks its event loop', async () => {
		const logs: string[] = [];
		host = await startTestHost(20_000, {
			size: 1,
			stepTimeoutMs: 20_000,
			blockedMs: 1_500,
			memoryMb: 1024,
			recycleSteps: 100_000,
			log: (message) => logs.push(message),
		});
		client = await RuntimeClient.connect(host.socketPath);
		// A step that never ends and does not give control back to the worker.
		const reply = await client.send(code('loop', 'for (;;) {}'));
		expect(reply).toMatchObject({ ok: false, error: expect.stringContaining('did not answer') });
		expect(logs.filter((l) => l.startsWith('A worker stopped'))).toHaveLength(1);
		// The step alone on the connection caused the stop, so the runtime blames it.
		expect(client.lostReasons).toEqual([expect.stringContaining('did not answer')]);
	}, 60_000);
});
