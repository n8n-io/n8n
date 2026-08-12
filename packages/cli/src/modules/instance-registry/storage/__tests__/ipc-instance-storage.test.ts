import { Logger } from '@n8n/backend-common';
import type { InstanceRegistration } from '@n8n/api-types';
import { mockInstance } from '@n8n/backend-test-utils';

import type { HypervisorWorker } from '@/scaling/hypervisor-message-router';

import { IpcInstanceStorage, InstanceRegistryHost } from '../ipc-instance-storage';
import { REGISTRY_CONSTANTS } from '../../instance-registry.types';

mockInstance(Logger);

const makeReg = (over: Partial<InstanceRegistration> = {}): InstanceRegistration => ({
	schemaVersion: 1,
	instanceKey: 'key-1',
	hostId: 'main-shared',
	instanceType: 'main',
	instanceRole: 'unset',
	version: '1.0.0',
	registeredAt: 0,
	lastSeen: 0,
	pid: 111,
	...over,
});

const emitToProcess = (message: unknown) =>
	(process.emit as (event: string, message: unknown) => boolean)('message', message);

describe('IpcInstanceStorage', () => {
	let storage: IpcInstanceStorage;
	let originalSend: typeof process.send;

	beforeEach(() => {
		originalSend = process.send;
		process.send = vi.fn();
		storage = new IpcInstanceStorage();
	});

	afterEach(async () => {
		await storage.destroy();
		process.send = originalSend;
	});

	it('sends fire-and-forget writes to the primary', async () => {
		const registration = makeReg();

		await storage.register(registration);
		await storage.heartbeat(registration);
		await storage.unregister('key-1');

		expect(process.send).toHaveBeenCalledWith({ type: 'registry:register', registration });
		expect(process.send).toHaveBeenCalledWith({ type: 'registry:heartbeat', registration });
		expect(process.send).toHaveBeenCalledWith({
			type: 'registry:unregister',
			instanceKey: 'key-1',
		});
	});

	it('resolves getAllRegistrations from the primary snapshot', async () => {
		const registrations = [makeReg({ instanceKey: 'a' }), makeReg({ instanceKey: 'b' })];

		const pending = storage.getAllRegistrations();
		expect(process.send).toHaveBeenCalledWith({ type: 'registry:query', requestId: 0 });
		emitToProcess({ type: 'registry:snapshot', requestId: 0, registrations });

		await expect(pending).resolves.toEqual(registrations);
	});

	it('filters getRegistration by instanceKey', async () => {
		const registrations = [makeReg({ instanceKey: 'a' }), makeReg({ instanceKey: 'b' })];

		const pending = storage.getRegistration('b');
		emitToProcess({ type: 'registry:snapshot', requestId: 0, registrations });

		await expect(pending).resolves.toEqual(registrations[1]);
	});

	it('resolves empty when the primary does not answer within the timeout', async () => {
		vi.useFakeTimers();
		try {
			const pending = storage.getAllRegistrations();
			vi.advanceTimersByTime(REGISTRY_CONSTANTS.OPERATION_TIMEOUT_MS);
			await expect(pending).resolves.toEqual([]);
		} finally {
			vi.useRealTimers();
		}
	});

	it('round-trips last-known state locally and never GCs stale members', async () => {
		const state = new Map([['a', makeReg({ instanceKey: 'a' })]]);

		await storage.saveLastKnownState(state);

		await expect(storage.getLastKnownState()).resolves.toEqual(state);
		await expect(storage.cleanupStaleMembers()).resolves.toBe(0);
	});
});

describe('InstanceRegistryHost', () => {
	const makeWorker = (id: number): HypervisorWorker => ({
		id,
		send: vi.fn(),
		process: { pid: 1000 + id },
	});
	const registerMsg = (registration: InstanceRegistration) => ({
		type: 'registry:register',
		registration,
	});
	const queryMsg = (requestId: number) => ({ type: 'registry:query', requestId });

	it('stamps a unique hostId from the primary-known pid on register', () => {
		const host = new InstanceRegistryHost();
		const worker = makeWorker(1);

		host.onMessage(worker, registerMsg(makeReg()));
		host.onMessage(worker, queryMsg(7));

		expect(worker.send).toHaveBeenCalledWith({
			type: 'registry:snapshot',
			requestId: 7,
			registrations: [expect.objectContaining({ hostId: 'main-1001' })],
		});
	});

	it('prunes a worker from the snapshot on exit', () => {
		const host = new InstanceRegistryHost();
		const w1 = makeWorker(1);
		const w2 = makeWorker(2);
		host.onMessage(w1, registerMsg(makeReg({ instanceKey: 'a' })));
		host.onMessage(w2, registerMsg(makeReg({ instanceKey: 'b' })));

		host.onExit(w1);
		host.onMessage(w2, queryMsg(1));

		const snapshot = vi.mocked(w2.send).mock.calls[0][0] as {
			registrations: InstanceRegistration[];
		};
		expect(snapshot.registrations).toHaveLength(1);
		expect(snapshot.registrations[0].hostId).toBe('main-1002');
	});
});
