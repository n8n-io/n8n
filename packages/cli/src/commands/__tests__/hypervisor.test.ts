// Registers zod's `.alias()` extension before importing commands that use it (Start/Worker).
import '@/zod-alias-support';

import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import cluster from 'node:cluster';
import { Readable } from 'node:stream';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { Hypervisor, forwardPrefixed, createChildSupervisor } from '../hypervisor';
import type { Start } from '../start';
import type { Worker } from '../worker';

vi.mock('node:cluster', () => ({
	default: { isPrimary: true, fork: vi.fn(), on: vi.fn(), setupPrimary: vi.fn() },
}));

const mockedCluster = vi.mocked(cluster);
// `isPrimary` is readonly on the real cluster type; the mock lets us toggle it per test.
const clusterState = mockedCluster as unknown as { isPrimary: boolean };

mockInstance(Logger);

// Lets `run()`'s awaits settle without resolving its final blocking promise.
const flush = async () => await new Promise((resolve) => setImmediate(resolve));

describe('Hypervisor', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		mockedCluster.fork.mockReset();
		mockedCluster.on.mockReset();
		mockedCluster.fork.mockReturnValue({ process: { pid: 123 } } as never);
		clusterState.isPrimary = true;
		delete process.env.N8N_HYPERVISOR_ROLE;
	});

	it('forks two main and two worker children in the primary process', () => {
		const processOn = vi.spyOn(process, 'on').mockReturnValue(process);
		void new Hypervisor().run();

		expect(mockedCluster.setupPrimary).toHaveBeenCalledWith({
			silent: true,
			execArgv: process.execArgv,
		});
		expect(mockedCluster.fork).toHaveBeenCalledTimes(4);
		const mainEnv = {
			N8N_HYPERVISOR_ROLE: 'main',
			N8N_HYPERVISOR_MODE: '1',
			N8N_TRANSPORT_LEADER_ELECTION: 'ipc',
			N8N_TRANSPORT_INSTANCE_REGISTRY: 'ipc',
			N8N_TRANSPORT_PUBSUB: 'ipc',
			N8N_TRANSPORT_CACHE: 'ipc',
			N8N_TRANSPORT_QUEUE: 'ipc',
		};
		const workerEnv = {
			N8N_HYPERVISOR_ROLE: 'worker',
			N8N_HYPERVISOR_MODE: '1',
			N8N_TRANSPORT_LEADER_ELECTION: 'ipc',
			N8N_TRANSPORT_INSTANCE_REGISTRY: 'ipc',
			N8N_TRANSPORT_PUBSUB: 'ipc',
			N8N_TRANSPORT_CACHE: 'ipc',
			N8N_TRANSPORT_QUEUE: 'ipc',
		};
		expect(mockedCluster.fork).toHaveBeenNthCalledWith(1, mainEnv);
		expect(mockedCluster.fork).toHaveBeenNthCalledWith(2, mainEnv);
		expect(mockedCluster.fork).toHaveBeenNthCalledWith(3, workerEnv);
		expect(mockedCluster.fork).toHaveBeenNthCalledWith(4, workerEnv);
		expect(mockedCluster.on).toHaveBeenCalledWith('exit', expect.any(Function));
		expect(mockedCluster.on).toHaveBeenCalledWith('message', expect.any(Function));
		expect(processOn).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
		expect(processOn).toHaveBeenCalledWith('SIGINT', expect.any(Function));
	});

	it('applies per-role OOM heap limits from env when set', () => {
		vi.spyOn(process, 'on').mockReturnValue(process);
		vi.stubEnv('N8N_HYPERVISOR_OOM_DEMO_HEAP_MB_MAIN', '512');
		vi.stubEnv('N8N_HYPERVISOR_OOM_DEMO_HEAP_MB_WORKER', '64');

		void new Hypervisor().run();

		const setupCalls = mockedCluster.setupPrimary.mock.calls.map(([settings]) => settings);
		// Two main forks with the main limit, two worker forks with the worker limit.
		expect(setupCalls).toContainEqual({
			silent: true,
			execArgv: [...process.execArgv, '--max-old-space-size=512'],
		});
		expect(setupCalls).toContainEqual({
			silent: true,
			execArgv: [...process.execArgv, '--max-old-space-size=64'],
		});

		vi.unstubAllEnvs();
	});

	it("delegates to the Start command in a 'main' child", async () => {
		clusterState.isPrimary = false;
		process.env.N8N_HYPERVISOR_ROLE = 'main';
		const start = mock<Start>();
		const command = new Hypervisor();
		vi.spyOn(Container, 'get').mockReturnValue(start);

		void command.run();
		await flush();

		expect(start.flags).toEqual({});
		expect(start.init).toHaveBeenCalled();
		expect(start.run).toHaveBeenCalled();
		expect(mockedCluster.fork).not.toHaveBeenCalled();
	});

	it("delegates to the Worker command with a default concurrency in a 'worker' child", async () => {
		clusterState.isPrimary = false;
		process.env.N8N_HYPERVISOR_ROLE = 'worker';
		const worker = mock<Worker>();
		const command = new Hypervisor();
		vi.spyOn(Container, 'get').mockReturnValue(worker);

		void command.run();
		await flush();

		expect(worker.flags).toEqual({ concurrency: 10 });
		expect(worker.init).toHaveBeenCalled();
		expect(worker.run).toHaveBeenCalled();
	});

	it('throws for an unknown role in a child', async () => {
		clusterState.isPrimary = false;
		process.env.N8N_HYPERVISOR_ROLE = 'bogus';

		await expect(new Hypervisor().run()).rejects.toThrow('Unknown N8N_HYPERVISOR_ROLE: bogus');
	});
});

describe('forwardPrefixed', () => {
	it('tags each line of a child stream with the given prefix', async () => {
		const out = mock<NodeJS.WriteStream>();
		const stream = Readable.from('alpha\nbeta\n');

		forwardPrefixed(stream, out, '[main pid=7]');
		await new Promise((resolve) => stream.on('close', resolve));
		await new Promise((resolve) => setImmediate(resolve));

		expect(out.write).toHaveBeenCalledWith('[main pid=7] alpha\n');
		expect(out.write).toHaveBeenCalledWith('[main pid=7] beta\n');
	});

	it('is a no-op when the stream is null', () => {
		const out = mock<NodeJS.WriteStream>();

		forwardPrefixed(null, out, '[main pid=7]');

		expect(out.write).not.toHaveBeenCalled();
	});
});

describe('createChildSupervisor', () => {
	type FakeChild = {
		id: number;
		process: { pid: number; kill: Mock<(signal: NodeJS.Signals) => void> };
		isDead: Mock<() => boolean>;
	};

	const setup = () => {
		const forked: Array<{
			role: string;
			env: Record<string, string>;
			execArgv?: string[];
			child: FakeChild;
		}> = [];
		const fork = vi.fn((role: string, env: Record<string, string>, execArgv?: string[]) => {
			const child: FakeChild = {
				id: forked.length + 1,
				process: { pid: 100 + forked.length, kill: vi.fn<(signal: NodeJS.Signals) => void>() },
				isDead: vi.fn<() => boolean>(() => false),
			};
			forked.push({ role, env, execArgv, child });
			return child;
		});
		const log = vi.fn();
		const exit = vi.fn();
		const supervisor = createChildSupervisor({ fork, log, exit, forceKillMs: 10_000 });
		return { forked, fork, log, exit, supervisor };
	};

	it('respawns a crashed child with the same role, env and execArgv', () => {
		const { forked, fork, supervisor } = setup();
		supervisor.spawn('worker', { A: '1' }, ['--max-old-space-size=64']);

		supervisor.onExit(forked[0].child.id, null, 'SIGABRT');

		expect(fork).toHaveBeenCalledTimes(2);
		expect(fork).toHaveBeenNthCalledWith(2, 'worker', { A: '1' }, ['--max-old-space-size=64']);
	});

	it('counts respawns per role', () => {
		const { forked, supervisor } = setup();
		supervisor.spawn('worker', {}, undefined);
		expect(supervisor.getRespawnCounts()).toEqual({});

		supervisor.onExit(forked[0].child.id, null, 'SIGKILL');
		supervisor.onExit(forked[1].child.id, null, 'SIGKILL'); // the respawn

		expect(supervisor.getRespawnCounts()).toEqual({ worker: 2 });
	});

	it('does not respawn during shutdown and exits once the last child is gone', () => {
		const { forked, fork, exit, supervisor } = setup();
		supervisor.spawn('worker', {}, undefined);

		supervisor.shutdown('SIGTERM');
		expect(forked[0].child.process.kill).toHaveBeenCalledWith('SIGTERM');

		supervisor.onExit(forked[0].child.id, 0, null);
		expect(fork).toHaveBeenCalledTimes(1); // no respawn
		expect(exit).toHaveBeenCalledTimes(1);
	});

	it('exits immediately on shutdown when there are no children', () => {
		const { exit, supervisor } = setup();
		supervisor.shutdown('SIGTERM');
		expect(exit).toHaveBeenCalledTimes(1);
	});

	it('force-kills only children still alive after the timeout', () => {
		vi.useFakeTimers();
		try {
			const { forked, supervisor } = setup();
			supervisor.spawn('main', {}, undefined);
			supervisor.spawn('worker', {}, undefined);

			supervisor.shutdown('SIGTERM');
			forked[0].child.isDead.mockReturnValue(true); // exited gracefully in time
			vi.advanceTimersByTime(10_000);

			expect(forked[0].child.process.kill).not.toHaveBeenCalledWith('SIGKILL');
			expect(forked[1].child.process.kill).toHaveBeenCalledWith('SIGKILL');
		} finally {
			vi.useRealTimers();
		}
	});

	it.each([
		['SIGKILL', null, 'SIGKILL' as string | null, /SIGKILL/],
		['SIGABRT', null, 'SIGABRT' as string | null, /OOM/],
		['exit code 134', 134, null as string | null, /OOM/],
		['plain crash', 1, null as string | null, /crash/],
	])('classifies %s in the respawn log', (_label, code, signal, pattern) => {
		const { forked, log, supervisor } = setup();
		supervisor.spawn('worker', {}, undefined);

		supervisor.onExit(forked[0].child.id, code, signal);

		expect(log).toHaveBeenCalledWith(expect.stringMatching(pattern));
	});
});
