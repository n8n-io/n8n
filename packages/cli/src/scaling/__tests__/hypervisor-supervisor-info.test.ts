import { mockLogger } from '@n8n/backend-test-utils';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { HypervisorWorker } from '../hypervisor-message-router';
import { SupervisorInfoClient, SupervisorInfoHost } from '../hypervisor-supervisor-info';
import type { TransportModeService } from '../transport-mode.service';

const emitToProcess = (message: unknown) =>
	(process.emit as (event: string, message: unknown) => boolean)('message', message);

const PROCESS_INFO = {
	pid: 999,
	role: 'worker' as const,
	isLeader: false,
	uptimeSeconds: 5,
	memoryUsageMb: 42,
	transports: { cache: 'ipc' },
};

describe('SupervisorInfoHost', () => {
	it('answers a query with the provider counts', () => {
		const host = new SupervisorInfoHost();
		host.setCountsProvider(() => ({ worker: 2, main: 0 }));
		const worker = mock<HypervisorWorker>({ id: 1 });
		const query = { type: 'supervisor:query', requestId: 9 };

		host.onMessage(worker, query);

		expect(worker.send).toHaveBeenCalledWith({
			type: 'supervisor:counts',
			requestId: 9,
			counts: { worker: 2, main: 0 },
		});
	});

	const pushInfo = { type: 'supervisor:process-info', info: PROCESS_INFO };
	const allQuery = { type: 'supervisor:all-query', requestId: 4 };

	it('caches pushed process info (pid + respawnCount stamped by the primary) and answers an all-query', () => {
		const host = new SupervisorInfoHost();
		host.setCountsProvider(() => ({ worker: 3 }));
		const child = mock<HypervisorWorker>({ id: 7, process: { pid: 1234 } });
		host.onMessage(child, pushInfo);

		const asker = mock<HypervisorWorker>({ id: 1 });
		host.onMessage(asker, allQuery);

		expect(asker.send).toHaveBeenCalledWith({
			type: 'supervisor:all',
			requestId: 4,
			processes: [{ ...PROCESS_INFO, pid: 1234, respawnCount: 3 }],
		});
	});

	it('prunes a child from the cache on exit', () => {
		const host = new SupervisorInfoHost();
		const child = mock<HypervisorWorker>({ id: 7, process: { pid: 1234 } });
		host.onMessage(child, pushInfo);
		host.onExit(child);

		const asker = mock<HypervisorWorker>({ id: 1 });
		host.onMessage(asker, allQuery);

		expect(asker.send).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'supervisor:all', processes: [] }),
		);
	});
});

describe('SupervisorInfoClient', () => {
	const makeClient = (underHypervisor: boolean) => {
		const transportMode = mock<TransportModeService>();
		transportMode.isUnderHypervisor.mockReturnValue(underHypervisor);
		transportMode.resolve.mockReturnValue('ipc' as never);
		const instanceSettings = mock<InstanceSettings>({ instanceType: 'worker' });
		return new SupervisorInfoClient(mockLogger(), transportMode, instanceSettings);
	};

	let originalSend: typeof process.send;

	beforeEach(() => {
		originalSend = process.send;
		process.send = vi.fn();
	});

	afterEach(() => {
		process.send = originalSend;
	});

	it('returns undefined when not running under the hypervisor', async () => {
		const client = makeClient(false);

		await expect(client.getRespawnCount('worker')).resolves.toBeUndefined();
		expect(process.send).not.toHaveBeenCalled();
	});

	it('returns the role count from the primary reply', async () => {
		const client = makeClient(true);

		const pending = client.getRespawnCount('worker');
		expect(process.send).toHaveBeenCalledWith({ type: 'supervisor:query', requestId: 0 });
		emitToProcess({ type: 'supervisor:counts', requestId: 0, counts: { worker: 5 } });

		await expect(pending).resolves.toBe(5);
	});

	it('resolves undefined on timeout', async () => {
		vi.useFakeTimers();
		try {
			const client = makeClient(true);
			const pending = client.getRespawnCount('worker');
			vi.advanceTimersByTime(3_000);
			await expect(pending).resolves.toBeUndefined();
		} finally {
			vi.useRealTimers();
		}
	});

	it('getAllProcesses returns undefined off-hypervisor', async () => {
		const client = makeClient(false);

		await expect(client.getAllProcesses()).resolves.toBeUndefined();
		expect(process.send).not.toHaveBeenCalled();
	});

	it('getAllProcesses resolves the process list from the primary reply', async () => {
		const client = makeClient(true);

		const pending = client.getAllProcesses();
		expect(process.send).toHaveBeenCalledWith({ type: 'supervisor:all-query', requestId: 0 });
		const processes = [{ ...PROCESS_INFO, respawnCount: 1 }];
		emitToProcess({ type: 'supervisor:all', requestId: 0, processes });

		await expect(pending).resolves.toEqual(processes);
	});

	it('startPushing sends a process-info push and no-ops off-hypervisor', () => {
		makeClient(false).startPushing();
		expect(process.send).not.toHaveBeenCalled();

		makeClient(true).startPushing();
		expect(process.send).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'supervisor:process-info' }),
		);
	});
});
