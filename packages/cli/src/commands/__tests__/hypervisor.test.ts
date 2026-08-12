// Registers zod's `.alias()` extension before importing commands that use it (Start/Worker).
import '@/zod-alias-support';

import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import cluster from 'node:cluster';
import { Readable } from 'node:stream';
import { mock } from 'vitest-mock-extended';

import { Hypervisor, forwardPrefixed } from '../hypervisor';
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
		const mainEnv = {
			N8N_HYPERVISOR_ROLE: 'main',
			N8N_HYPERVISOR_MODE: '1',
			N8N_TRANSPORT_LEADER_ELECTION: 'ipc',
			N8N_TRANSPORT_INSTANCE_REGISTRY: 'ipc',
			N8N_TRANSPORT_PUBSUB: 'ipc',
		};
		const workerEnv = {
			N8N_HYPERVISOR_ROLE: 'worker',
			N8N_HYPERVISOR_MODE: '1',
			N8N_TRANSPORT_LEADER_ELECTION: 'ipc',
			N8N_TRANSPORT_INSTANCE_REGISTRY: 'ipc',
			N8N_TRANSPORT_PUBSUB: 'ipc',
		};
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
