// Registers zod's `.alias()` extension before importing commands that use it (Start/Worker).
import '@/zod-alias-support';

import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import cluster from 'node:cluster';
import { Readable } from 'node:stream';
import { mock } from 'vitest-mock-extended';

import { Hypervisor, forwardPrefixed, createLeaderCoordinator } from '../hypervisor';
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
		void new Hypervisor().run();

		expect(mockedCluster.setupPrimary).toHaveBeenCalledWith({ silent: true });
		expect(mockedCluster.fork).toHaveBeenCalledTimes(4);
		const mainEnv = { N8N_HYPERVISOR_ROLE: 'main', N8N_HYPERVISOR_MODE: '1' };
		const workerEnv = { N8N_HYPERVISOR_ROLE: 'worker', N8N_HYPERVISOR_MODE: '1' };
		expect(mockedCluster.fork).toHaveBeenNthCalledWith(1, mainEnv);
		expect(mockedCluster.fork).toHaveBeenNthCalledWith(2, mainEnv);
		expect(mockedCluster.fork).toHaveBeenNthCalledWith(3, workerEnv);
		expect(mockedCluster.fork).toHaveBeenNthCalledWith(4, workerEnv);
		expect(mockedCluster.on).toHaveBeenCalledWith('exit', expect.any(Function));
		expect(mockedCluster.on).toHaveBeenCalledWith('message', expect.any(Function));
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

describe('createLeaderCoordinator', () => {
	const TIMEOUT = 3000;
	const makeWorker = (id: number) => ({ id, send: vi.fn(), process: { pid: 1000 + id } });

	it('assigns leadership to the first claimant and follower to the rest', () => {
		const coord = createLeaderCoordinator(() => {}, TIMEOUT);
		const w1 = makeWorker(1);
		const w2 = makeWorker(2);

		coord.onClaim(w1, 0);
		coord.onClaim(w2, 0);

		expect(w1.send).toHaveBeenCalledWith({ type: 'leader:assign', isLeader: true });
		expect(w2.send).toHaveBeenCalledWith({ type: 'leader:assign', isLeader: false });
	});

	it('promotes a surviving claimant when the leader exits', () => {
		const coord = createLeaderCoordinator(() => {}, TIMEOUT);
		const w1 = makeWorker(1);
		const w2 = makeWorker(2);
		coord.onClaim(w1, 0);
		coord.onClaim(w2, 0);
		w2.send.mockClear();

		coord.onExit({ id: w1.id });

		expect(w2.send).toHaveBeenCalledWith({ type: 'leader:assign', isLeader: true });
	});

	it('does not reassign when a non-leader exits', () => {
		const coord = createLeaderCoordinator(() => {}, TIMEOUT);
		const w1 = makeWorker(1);
		const w2 = makeWorker(2);
		coord.onClaim(w1, 0);
		coord.onClaim(w2, 0);
		w1.send.mockClear();
		w2.send.mockClear();

		coord.onExit({ id: w2.id });

		expect(w1.send).not.toHaveBeenCalled();
		expect(w2.send).not.toHaveBeenCalled();
	});

	it('fails over a hung leader that stops heartbeating and demotes it best-effort', () => {
		const coord = createLeaderCoordinator(() => {}, TIMEOUT);
		const leader = makeWorker(1);
		const follower = makeWorker(2);
		coord.onClaim(leader, 0);
		coord.onClaim(follower, 0);
		// The follower keeps heartbeating; the leader goes silent after t=0.
		coord.onHeartbeat(follower.id, 4000);
		leader.send.mockClear();
		follower.send.mockClear();

		coord.checkTimeouts(4000); // leader last seen at 0, 4000 - 0 > 3000

		expect(follower.send).toHaveBeenCalledWith({ type: 'leader:assign', isLeader: true });
		expect(leader.send).toHaveBeenCalledWith({ type: 'leader:assign', isLeader: false });
	});

	it('keeps a leader that heartbeats within the timeout', () => {
		const coord = createLeaderCoordinator(() => {}, TIMEOUT);
		const leader = makeWorker(1);
		coord.onClaim(leader, 0);
		coord.onHeartbeat(leader.id, 2500);
		leader.send.mockClear();

		coord.checkTimeouts(4000); // last seen at 2500, 4000 - 2500 <= 3000

		expect(leader.send).not.toHaveBeenCalled();
	});
});
