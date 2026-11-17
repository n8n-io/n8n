/**
 * Isolation between workflows in the fallback host (`docs/isolation.md`): a
 * step of one workflow that holds the event loop of a worker must not delay
 * the steps of another workflow.
 *
 * The times are scaled down: `BLOCK_MS` stands for a block of 10 s or 40 s,
 * `GUARD_MS` for the CPU guard of the normal lane. The steps go as wfrt sends
 * them (`RuntimeClient`).
 *
 * `ISOLATION_BASELINE=1` runs the host without the lanes, as it was before:
 * the tests then fail and print the delay that the lanes remove.
 */
import { setTimeout as wait } from 'node:timers/promises';

import type { StepResponse } from '../protocol';
import { buildHostForTests, RuntimeClient, startTestHost, type TestHost } from './test-client';

const BASELINE = process.env.ISOLATION_BASELINE === '1';
const BLOCK_MS = 3_000;
const GUARD_MS = 1_000;
/** The longest delay of a step of another workflow while the slow lane has the block. */
const QUIET_MS = 500;
/** A new worker loads its modules in this time; steps that go again wait for an idle connection. */
const RESTART_MS = 1_500;

const spin = (id: string, workflowId: string, step: string, ms: number) => ({
	id,
	kind: 'code',
	step,
	key: `key-${id}`,
	workflowId,
	args: {
		name: step,
		code: `const end = Date.now() + ${ms}; let n = 0; while (Date.now() < end) n++; return [{ spun: ${ms} }];`,
		items: [{}],
	},
});

const quick = (id: string) => ({
	id,
	kind: 'node',
	step: 'Edit Fields',
	key: `key-${id}`,
	workflowId: 'wf-quick',
	args: {
		name: 'Edit Fields',
		type: 'n8n-nodes-base.set',
		typeVersion: 3.4,
		parameters: {
			assignments: { assignments: [{ id: 'a', name: 'v', value: '={{ 1 + 1 }}', type: 'number' }] },
			options: {},
		},
		items: [{}],
	},
});

describe('fallback host isolation between workflows', () => {
	let host: TestHost;
	let client: RuntimeClient;
	let seq = 0;

	beforeAll(async () => {
		buildHostForTests();
		host = await startTestHost(20_000, {
			size: 2,
			slowSize: 2,
			stepTimeoutMs: 30_000,
			blockedMs: BASELINE ? 30_000 : GUARD_MS,
			lagMs: BASELINE ? 1e9 : 100,
			codeStartsSlow: !BASELINE,
		});
		client = await RuntimeClient.connect(host.socketPath);
		await client.sendBatch([quick('warm-1'), quick('warm-2'), quick('warm-3'), quick('warm-4')]);
	}, 120_000);

	afterAll(async () => {
		client.close();
		await host.stop();
	});

	/**
	 * Sends two quick steps of another workflow at a time (one for each worker)
	 * until `until` ends, and gives the longest time that one of them took.
	 */
	async function quickLatency(tag: string, until: Promise<unknown>): Promise<number> {
		let done = false;
		void until.then(() => (done = true));
		let longest = 0;
		while (!done) {
			const started = performance.now();
			const answers = await client.sendBatch([quick(`${tag}-${++seq}`), quick(`${tag}-${++seq}`)]);
			longest = Math.max(longest, performance.now() - started);
			for (const answer of answers) expect(answer.ok).toBe(true);
			await wait(25);
		}
		return longest;
	}

	const ok = (result: StepResponse) => expect(result).toMatchObject({ ok: true });

	it('a code step that blocks does not delay the steps of another workflow', async () => {
		const blocked = client.send(spin('first', 'wf-first', 'Code', BLOCK_MS));
		const longest = await quickLatency('first', blocked);
		console.log(
			`[isolation] one ${BLOCK_MS} ms block: other workflow waited ${longest.toFixed(0)} ms`,
		);
		ok(await blocked);
		expect(longest).toBeLessThan(QUIET_MS);
	}, 30_000);

	it('a step that starts to block moves to the slow lane after one block', async () => {
		// The key runs alone once without a block: the normal lane takes it.
		ok(await client.send(spin('learn-0', 'wf-learn', 'Code', 0)));
		// Shorter than the guard: the worker reports the block, and the key gets its mark.
		const short = client.send(spin('learn-1', 'wf-learn', 'Code', 400));
		const during = await quickLatency('learn-a', short);
		ok(await short);
		const again = client.send(spin('learn-2', 'wf-learn', 'Code', BLOCK_MS));
		const after = await quickLatency('learn-b', again);
		console.log(
			`[isolation] first 400 ms block: other workflow waited ${during.toFixed(0)} ms; next ${BLOCK_MS} ms block: ${after.toFixed(0)} ms`,
		);
		ok(await again);
		expect(during).toBeLessThan(400 + QUIET_MS);
		expect(after).toBeLessThan(QUIET_MS);
	}, 30_000);

	it('a block longer than the guard delays others once, and the step still gets its result', async () => {
		ok(await client.send(spin('guard-0', 'wf-guard', 'Code', 0)));
		const stopsBefore = host.pool?.stats().guardStops ?? 0;
		const long = client.send(spin('guard-1', 'wf-guard', 'Code', BLOCK_MS));
		const during = await quickLatency('guard-a', long);
		// The guard stopped the worker, and the step ran again in the slow lane.
		expect(await long).toEqual({ id: 'guard-1', ok: true, result: [{ spun: BLOCK_MS }] });
		expect((host.pool?.stats().guardStops ?? 0) - stopsBefore).toBe(1);
		const next = client.send(spin('guard-2', 'wf-guard', 'Code', BLOCK_MS));
		const after = await quickLatency('guard-b', next);
		console.log(
			`[isolation] block over the ${GUARD_MS} ms guard: other workflow waited ${during.toFixed(0)} ms; next block: ${after.toFixed(0)} ms`,
		);
		ok(await next);
		expect(during).toBeLessThan(GUARD_MS + RESTART_MS);
		expect(after).toBeLessThan(QUIET_MS);
	}, 60_000);

	it('many blocking steps of one workflow do not delay another workflow', async () => {
		const many = Array.from({ length: 20 }, (_, i) => spin(`many-${i}`, 'wf-many', 'Crunch', 200));
		const all = client.sendBatch(many);
		const longest = await quickLatency('many', all);
		console.log(`[isolation] 20 steps of 200 ms: other workflow waited ${longest.toFixed(0)} ms`);
		for (const answer of await all) ok(answer);
		expect(longest).toBeLessThan(QUIET_MS);
	}, 60_000);

	it('a step that blocks longer than the guard, alone, finishes with its result', async () => {
		const result = await client.send(spin('alone', 'wf-alone', 'Code', 4 * GUARD_MS));
		expect(result).toEqual({ id: 'alone', ok: true, result: [{ spun: 4 * GUARD_MS }] });
		const stats = host.pool?.stats();
		console.log(`[isolation] stats ${JSON.stringify(stats)}`);
		expect(stats?.slowWaiting).toBe(0);
		expect(stats?.movedToSlow).toBeGreaterThan(0);
	}, 30_000);

	it('a step in the slow lane reaches the services of its runtime connection', async () => {
		// A block with this key puts the key in the slow lane.
		ok(await client.send(spin('svc-0', 'wf-svc', 'Remove Duplicates', 300)));
		client.onService = (call) => {
			if (call.op !== 'checkProcessedAndRecord') return { ok: true, result: null };
			const items = (call.args as { items?: unknown[] }).items ?? [];
			return {
				ok: true,
				result: {
					new: items.filter((v) => String(v) !== '1'),
					processed: items.filter((v) => String(v) === '1'),
				},
			};
		};
		const moved = host.pool?.stats().movedToSlow ?? 0;
		const reply = await client.send({
			id: 'svc-1',
			kind: 'node',
			step: 'Remove Duplicates',
			key: 'key-svc-1',
			workflowId: 'wf-svc',
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
		expect(reply).toEqual({ id: 'svc-1', ok: true, result: [{ k: 2 }] });
		expect((host.pool?.stats().movedToSlow ?? 0) - moved).toBe(1);
		expect(client.serviceCalls).toContainEqual(
			expect.objectContaining({ type: 'service', id: 'svc-1', service: 'deduplication' }),
		);
	}, 30_000);
});
