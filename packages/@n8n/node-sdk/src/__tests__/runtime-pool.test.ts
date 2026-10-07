import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { INode } from 'n8n-workflow';

import { packAction } from '../pack';
import { hostRuntime, type ExecutorHost } from '../runtime';
import { pooledRuntime } from '../runtimes/pool';
import {
	sandboxedVersionOf,
	wasmSidecarRuntime,
	type Connection,
	type GuestRuntime,
	type GuestSession,
} from '../sandbox';

const SANDBOX = path.resolve(__dirname, '..', '..', 'sandbox');
const SIDECAR = path.join(SANDBOX, 'sidecar', 'target', 'release', 'n8n-sandbox');
const GUESTS = path.join(SANDBOX, 'dist');

const sessionOf = (bundleHash: string, grants = ['http', 'log']) =>
	({
		kind: 'action',
		manifest: { bundleHash },
		bundleFile: `/cache/${bundleHash}.cjs`,
		grants,
		limits: { memoryMb: 64, cpuMs: 1_000, wallMs: 20_000, maxMessageBytes: 1_000 },
		cacheDir: '/cache',
	}) as unknown as GuestSession;

type FakeConnection = Connection & { id: number; closed: boolean };

const settled = async () => await new Promise((resolve) => setImmediate(resolve));

/** Counts starts and starts no process. The starts in `fails` reject one tick later. */
function fakeRuntime(fails: number[] = []) {
	const started: FakeConnection[] = [];
	const calls = { starts: 0 };
	const runtime: GuestRuntime = {
		name: 'fake',
		async start() {
			calls.starts += 1;
			const id = calls.starts;
			if (fails.includes(id)) {
				await settled();
				throw new Error(`start ${id} failed`);
			}
			const connection: FakeConnection = {
				id,
				closed: false,
				request: async () => null,
				notify: () => undefined,
				serve: () => () => true,
				close: () => {
					connection.closed = true;
				},
			};
			started.push(connection);
			return connection;
		},
	};
	return { runtime, started, calls };
}

const idOf = (connection: Connection) => (connection as FakeConnection).id;

describe('pooledRuntime', () => {
	it('starts the first connection directly and prestarts the pool', async () => {
		const fake = fakeRuntime();
		const pool = pooledRuntime(fake.runtime, { size: 2 });
		const first = await pool.start(sessionOf('a'));
		await settled();
		expect(fake.calls.starts).toBe(3);
		expect(first).toBe(fake.started[0]);
		pool.close();
	});

	it('hands out a prestarted connection once and refills the pool', async () => {
		const fake = fakeRuntime();
		const pool = pooledRuntime(fake.runtime, { size: 1 });
		const first = await pool.start(sessionOf('a'));
		const second = await pool.start(sessionOf('a'));
		const third = await pool.start(sessionOf('a'));
		expect([first, second, third]).toEqual([fake.started[0], fake.started[1], fake.started[2]]);
		expect(new Set([first, second, third]).size).toBe(3);
		expect(fake.calls.starts).toBe(4);
		pool.close();
	});

	it('keeps one pool per session key, whatever the order of the grants', async () => {
		const fake = fakeRuntime();
		const pool = pooledRuntime(fake.runtime, { size: 1 });
		await pool.start(sessionOf('a', ['http', 'log']));
		const sameKey = await pool.start(sessionOf('a', ['log', 'http']));
		const otherBundle = await pool.start(sessionOf('b'));
		expect(sameKey).toBe(fake.started[1]);
		expect(otherBundle).toBe(fake.started[3]);
		pool.close();
	});

	it('starts directly after a failed prestart and keeps prestarting', async () => {
		const fake = fakeRuntime([2]);
		const pool = pooledRuntime(fake.runtime, { size: 1 });
		await pool.start(sessionOf('a'));
		await settled();
		const second = await pool.start(sessionOf('a'));
		const third = await pool.start(sessionOf('a'));
		expect([second, third].map(idOf)).toEqual([3, 4]);
		pool.close();
	});

	it('starts directly when the prestart it takes fails', async () => {
		const fake = fakeRuntime([2]);
		const pool = pooledRuntime(fake.runtime, { size: 1 });
		const both = await Promise.all([pool.start(sessionOf('a')), pool.start(sessionOf('a'))]);
		expect(both.map(idOf)).toEqual([1, 4]);
		pool.close();
	});

	it('keeps at most 8 waiting connections and closes those of the key used longest ago', async () => {
		const fake = fakeRuntime();
		const pool = pooledRuntime(fake.runtime, { size: 2 });
		for (const key of ['a', 'b', 'c', 'd', 'e']) await pool.start(sessionOf(key));
		await settled();
		const open = fake.started.filter(({ closed }) => !closed);
		expect(fake.started.filter(({ closed }) => closed).map(idOf)).toEqual([2, 3]);
		expect(open.length - 5).toBe(8);
		await pool.start(sessionOf('a'));
		expect(fake.calls.starts).toBe(18);
		pool.close();
	});

	it('closes a connection that waits 30 s', async () => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		try {
			const fake = fakeRuntime();
			const pool = pooledRuntime(fake.runtime, { size: 1 });
			await pool.start(sessionOf('a'));
			vi.advanceTimersByTime(29_999);
			await settled();
			expect(fake.started.map(({ closed }) => closed)).toEqual([false, false]);
			vi.advanceTimersByTime(1);
			await settled();
			expect(fake.started.map(({ closed }) => closed)).toEqual([false, true]);
			await pool.start(sessionOf('a'));
			expect(idOf(fake.started[2]!)).toBe(3);
			pool.close();
		} finally {
			vi.useRealTimers();
		}
	});

	it('closes the waiting connections and prestarts no more after close', async () => {
		const fake = fakeRuntime();
		const pool = pooledRuntime(fake.runtime, { size: 2 });
		const used = await pool.start(sessionOf('a'));
		pool.close();
		await settled();
		expect(fake.started.map(({ closed }) => closed)).toEqual([false, true, true]);
		expect(used).toBe(fake.started[0]);
		await pool.start(sessionOf('a'));
		expect(fake.calls.starts).toBe(4);
	});
});

const node: INode = {
	id: '1',
	name: 'Counter',
	type: 'counter',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const COUNTER = `import { defineNode, t } from '@n8n/node-sdk';
const counter = defineNode({ id: 'counter', displayName: 'Counter' });
const state = { runs: 0 };
export const count = counter.action('count', {
	action: 'Count',
	summary: 'Count the runs of this guest.',
	flow: { effect: 'read', cardinality: 'per-item' },
	input: {},
	output: t.obj({ runs: t.num() }),
	run: async () => ({ runs: ++state.runs }),
});
`;

describe.skipIf(!existsSync(SIDECAR) || !existsSync(path.join(GUESTS, 'action.wasm')))(
	'pooledRuntime with the wasm sidecar',
	() => {
		const dirs = { root: '' };

		beforeAll(async () => {
			dirs.root = await mkdtemp(path.join(tmpdir(), 'node-sdk-pool-'));
			await writeFile(path.join(dirs.root, 'counter.ts'), COUNTER);
		});

		afterAll(async () => {
			await rm(dirs.root, { recursive: true, force: true });
		});

		it('runs every execution in a fresh guest', async () => {
			const inner = wasmSidecarRuntime({ sidecar: SIDECAR, guests: GUESTS });
			const calls = { starts: 0 };
			const counting: GuestRuntime = {
				name: inner.name,
				start: async (session) => {
					calls.starts += 1;
					return await inner.start(session);
				},
			};
			const pool = pooledRuntime(counting, { size: 1 });
			const packed = await packAction(path.join(dirs.root, 'counter.ts'), 'count');
			const { executor } = await sandboxedVersionOf(
				{ manifest: packed.manifest, origin: 'private', readBundle: async () => packed.bundle },
				{
					runtime: pool,
					cacheDir: path.join(dirs.root, 'cache'),
					credentialType: () => undefined,
					limits: { cpuMs: 1_000, memoryMb: 64, wallMs: 20_000 },
				},
				hostRuntime(),
			);
			const host: ExecutorHost = {
				items: [{ json: {} }],
				node,
				parameter: () => undefined,
				request: async () => ({}),
				continueOnFail: () => false,
			};
			const outputs = [await executor(host), await executor(host), await executor(host)];
			pool.close();
			expect(outputs.map((output) => output[0]?.[0]?.json)).toEqual([
				{ runs: 1 },
				{ runs: 1 },
				{ runs: 1 },
			]);
			// One start describes the action, one per execution, and one waits in the pool.
			expect(calls.starts).toBe(5);
		});
	},
);
