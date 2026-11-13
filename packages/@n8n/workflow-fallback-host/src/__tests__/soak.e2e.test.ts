/**
 * Soak test of the worker pool: thousands of mixed steps on one worker. The
 * reused expression isolate and the step contexts must not keep state of
 * each step, so the heap after a full garbage collection stays bounded.
 * Recycling replaces a worker after a number of steps without losing steps.
 *
 * The steps go as wfrt sends them, on runtime connections of protocol
 * version 2 (`RuntimeClient`). A recycled worker sends `goaway`, and the
 * client moves to a new connection.
 *
 * The workers run the compiled `step-worker.js`, so the test builds the
 * package first.
 */
import type { StepRequest } from '../protocol';
import { buildHostForTests, RuntimeClient, startTestHost, type TestHost } from './test-client';

const MB = 1024 * 1024;

function setStep(id: string, expression: string): StepRequest {
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
				assignments: { assignments: [{ id: 'a', name: 'v', value: expression, type: 'string' }] },
				options: {},
			},
			items: [{ n: 1, text: 'x'.repeat(2000) }],
		},
	};
}

/** Step `i` of the mix: Code, a native expression, and an expression in the isolate. */
function mixed(i: number): StepRequest {
	switch (i % 3) {
		case 0:
			return {
				id: `s${i}`,
				kind: 'code',
				step: 'Code',
				key: `key-${i}`,
				args: {
					name: 'Code',
					code: `return [{ v: ${i}, big: 'y'.repeat(4000) }];`,
					items: [{ n: i }],
				},
			};
		case 1:
			// A new expression text each time: the parse caches must stay bounded.
			return setStep(`s${i}`, `={{ $json.n + ${i} }}`);
		default:
			return setStep(
				`s${i}`,
				`={{ DateTime.fromISO("2024-01-01").plus({ days: ${i % 400} }).toISODate() + [${i}].map((x) => x * 2)[0] }}`,
			);
	}
}

async function runAll(client: RuntimeClient, from: number, count: number): Promise<number> {
	let failed = 0;
	for (let start = from; start < from + count; start += 100) {
		const batch = Array.from({ length: 100 }, (_, k) => mixed(start + k));
		const responses = await client.sendBatch(batch);
		failed += responses.filter((r) => !r.ok).length;
	}
	return failed;
}

describe('fallback host worker pool over a long run', () => {
	let host: TestHost | undefined;
	let client: RuntimeClient | undefined;

	beforeAll(() => buildHostForTests(), 120_000);

	afterEach(async () => {
		client?.close();
		await host?.stop();
		client = undefined;
		host = undefined;
	});

	it('keeps the heap of a worker bounded over 6,000 mixed steps', async () => {
		host = await startTestHost(5_000, {
			size: 1,
			stepTimeoutMs: 30_000,
			blockedMs: 10_000,
			memoryMb: 1024,
			recycleSteps: 1_000_000,
			execArgv: ['--expose-gc'],
		});
		const pool = host.pool;
		if (!pool) throw new Error('The test host has no pool');
		client = await RuntimeClient.connect(host.socketPath);
		expect(await runAll(client, 0, 1_500)).toBe(0);
		const [before] = await pool.memory();
		expect(await runAll(client, 1_500, 6_000)).toBe(0);
		const [after] = await pool.memory();
		const growth = (after.heapUsed - before.heapUsed) / MB;
		// eslint-disable-next-line no-console
		console.log(
			`heap ${Math.round(before.heapUsed / MB)} -> ${Math.round(after.heapUsed / MB)} MB, rss ${Math.round(before.rss / MB)} -> ${Math.round(after.rss / MB)} MB`,
		);
		expect(growth).toBeLessThan(16);
	}, 600_000);

	it('recycles a worker after a number of steps and loses none', async () => {
		const logs: string[] = [];
		host = await startTestHost(5_000, {
			size: 1,
			stepTimeoutMs: 30_000,
			// Pings carry the step count of the runtime connections: ping often.
			blockedMs: 400,
			memoryMb: 1024,
			recycleSteps: 150,
			log: (message) => logs.push(message),
		});
		client = await RuntimeClient.connect(host.socketPath);
		let failed = 0;
		for (let start = 0; start < 900; start += 100) {
			failed += await runAll(client, start, 100);
			// Give the pool a ping between batches, so it counts the steps.
			await new Promise((resolve) => setTimeout(resolve, 150));
		}
		expect(failed).toBe(0);
		expect(logs.filter((l) => l.startsWith('Recycling a worker')).length).toBeGreaterThanOrEqual(3);
		expect(client.recycled).toBeGreaterThanOrEqual(3);
		expect(logs.filter((l) => l.startsWith('A worker stopped')).length).toBe(0);
	}, 600_000);
});

describe('fallback host worker pool with recycling over a long run', () => {
	let host: TestHost | undefined;
	let client: RuntimeClient | undefined;

	beforeAll(() => buildHostForTests(), 120_000);

	afterAll(async () => {
		client?.close();
		await host?.stop();
	});

	it('keeps answering pings and running steps while workers recycle often', async () => {
		const seconds = Number(process.env.WF_SOAK_SECONDS ?? '60');
		const logs: string[] = [];
		host = await startTestHost(5_000, {
			size: 2,
			stepTimeoutMs: 20_000,
			blockedMs: 3_000,
			memoryMb: 1024,
			recycleSteps: 250,
			log: (message) => logs.push(message),
		});
		client = await RuntimeClient.connect(host.socketPath);
		const deadline = Date.now() + seconds * 1000;
		let sent = 0;
		let failed = 0;
		const failures: string[] = [];
		// Steps keep coming, as in a replay: 8 in flight at all times.
		const lane = async () => {
			while (Date.now() < deadline) {
				const reply = await client!.send(mixed(sent++));
				if (!reply.ok) {
					failed++;
					if (failures.length < 5) failures.push(JSON.stringify(reply));
				}
			}
		};
		await Promise.all(Array.from({ length: 8 }, lane));
		const recycled = logs.filter((l) => l.startsWith('Recycling a worker')).length;
		const stopped = logs.filter((l) => l.startsWith('A worker stopped'));
		// eslint-disable-next-line no-console
		console.log(
			`soak: ${sent} steps, ${failed} failed, ${recycled} recycled, ${stopped.length} stopped`,
		);
		expect(failures).toEqual([]);
		expect(stopped).toEqual([]);
		expect(recycled).toBeGreaterThanOrEqual(5);
		// The host still runs a step after the soak.
		expect(await client.send(mixed(sent))).toMatchObject({ ok: true });
	}, 600_000);
});
