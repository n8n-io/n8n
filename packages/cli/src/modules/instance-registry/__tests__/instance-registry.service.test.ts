import type { InstanceRegistration } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { ExecutionsConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'jest-mock-extended';

import { InstanceRegistryService } from '../instance-registry.service';
import { REGISTRY_CONSTANTS } from '../instance-registry.types';
import type { InstanceStorage } from '../storage/instance-storage.interface';
import type { MemoryInstanceStorage } from '../storage/memory-storage';
import { RedisInstanceStorage } from '../storage/redis-instance-storage';

jest.mock('../storage/redis-instance-storage', () => {
	class MockRedisStorage implements InstanceStorage {
		readonly kind = 'redis' as const;

		private registrations = new Map<string, InstanceRegistration>();

		// Match the real class's constructor shape so callers can instantiate
		// without type juggling. Arguments are unused in the mock.
		constructor(..._args: unknown[]) {}

		async register(registration: InstanceRegistration) {
			this.registrations.set(registration.instanceKey, registration);
		}

		async heartbeat(registration: InstanceRegistration) {
			this.registrations.set(registration.instanceKey, registration);
		}

		async unregister(instanceKey: string) {
			this.registrations.delete(instanceKey);
		}

		async getAllRegistrations() {
			return [...this.registrations.values()];
		}

		async getRegistration(instanceKey: string) {
			return this.registrations.get(instanceKey) ?? null;
		}

		async getLastKnownState() {
			return new Map<string, InstanceRegistration>();
		}

		async saveLastKnownState() {}

		async cleanupStaleMembers() {
			return 0;
		}

		async destroy() {}
	}

	return { RedisInstanceStorage: MockRedisStorage };
});

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const makeInstanceSettings = (overrides: Partial<InstanceSettings> = {}) =>
	mock<InstanceSettings>({
		isMultiMain: false,
		hostId: 'main-abc123',
		instanceType: 'main',
		instanceRole: 'unset',
		...overrides,
	});

const makeExecutionsConfig = (mode: 'regular' | 'queue' = 'regular') =>
	mock<ExecutionsConfig>({ mode });

const makeLogger = () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	return logger;
};

describe('InstanceRegistryService', () => {
	let service: InstanceRegistryService;
	let logger: ReturnType<typeof makeLogger>;

	beforeEach(() => {
		jest.useFakeTimers();
		logger = makeLogger();
	});

	afterEach(async () => {
		// Ensure shutdown to clean up timers
		try {
			await service?.shutdown();
		} catch {}
		Container.reset();
		jest.useRealTimers();
		jest.restoreAllMocks();
	});

	const createService = (
		settingsOverrides: Partial<InstanceSettings> = {},
		executionMode: 'regular' | 'queue' = 'regular',
	) =>
		new InstanceRegistryService(
			makeInstanceSettings(settingsOverrides),
			makeExecutionsConfig(executionMode),
			logger,
		);

	describe('backend selection', () => {
		it('should select memory storage when not multi-main and not queue mode', async () => {
			service = createService({ isMultiMain: false }, 'regular');

			await service.init();

			expect(service.storageBackend).toBe('memory');
		});

		it('should select memory storage for worker in regular mode', async () => {
			service = createService({ isMultiMain: false, instanceType: 'worker' }, 'regular');

			await service.init();

			expect(service.storageBackend).toBe('memory');
		});

		describe('redis selection', () => {
			const bindRedisStub = () => {
				// The jest.mock above replaces RedisInstanceStorage with a stub
				// class whose constructor accepts any args.
				const MockCtor = RedisInstanceStorage as unknown as new () => RedisInstanceStorage;
				Container.set(RedisInstanceStorage, new MockCtor());
			};

			it('should select redis storage when isMultiMain', async () => {
				bindRedisStub();
				service = createService({ isMultiMain: true }, 'regular');

				await service.init();

				expect(service.storageBackend).toBe('redis');
			});

			it('should select redis storage in queue mode even when not multi-main', async () => {
				bindRedisStub();
				service = createService({ isMultiMain: false }, 'queue');

				await service.init();

				expect(service.storageBackend).toBe('redis');
			});

			it('should select redis storage when multi-main and queue mode', async () => {
				bindRedisStub();
				service = createService({ isMultiMain: true }, 'queue');

				await service.init();

				expect(service.storageBackend).toBe('redis');
			});
		});
	});

	describe('instance key generation', () => {
		it('should generate a standard UUID with dashes', async () => {
			service = createService();
			await service.init();

			const local = service.getLocalInstance();
			expect(local.instanceKey).toMatch(UUID_REGEX);
		});

		it('should generate a unique key per service instance', async () => {
			const service1 = createService();
			const service2 = createService();
			await service1.init();
			await service2.init();

			expect(service1.getLocalInstance().instanceKey).not.toBe(
				service2.getLocalInstance().instanceKey,
			);

			await service2.shutdown();
		});
	});

	describe('init', () => {
		it('should register with storage on init', async () => {
			service = createService();

			await service.init();

			const registrations = await service.getAllInstances();
			expect(registrations).toHaveLength(1);
		});

		it('should build registration with correct fields', async () => {
			service = createService({
				hostId: 'main-test123',
				instanceType: 'main',
				instanceRole: 'leader',
			});

			await service.init();

			const registrations = await service.getAllInstances();
			const reg = registrations[0];
			expect(reg.schemaVersion).toBe(1);
			expect(reg.hostId).toBe('main-test123');
			expect(reg.instanceType).toBe('main');
			expect(reg.instanceRole).toBe('leader');
			expect(reg.instanceKey).toMatch(UUID_REGEX);
			expect(reg.registeredAt).toBeGreaterThan(0);
			expect(reg.lastSeen).toBeGreaterThan(0);
		});

		it('should log registration info', async () => {
			service = createService();

			await service.init();

			expect(logger.info).toHaveBeenCalledWith(
				'Instance registered',
				expect.objectContaining({
					backend: 'memory',
					instanceType: 'main',
				}),
			);
		});
	});

	describe('heartbeat', () => {
		it('should update storage after heartbeat interval', async () => {
			service = createService();
			await service.init();

			const regBefore = await service.getAllInstances();
			const lastSeenBefore = regBefore[0].lastSeen;

			// Advance past heartbeat interval
			await jest.advanceTimersByTimeAsync(REGISTRY_CONSTANTS.HEARTBEAT_INTERVAL_MS);

			const regAfter = await service.getAllInstances();
			expect(regAfter[0].lastSeen).toBeGreaterThanOrEqual(lastSeenBefore);
		});

		it('should preserve registeredAt across heartbeats', async () => {
			service = createService();
			await service.init();

			const regBefore = await service.getAllInstances();
			const registeredAt = regBefore[0].registeredAt;

			await jest.advanceTimersByTimeAsync(REGISTRY_CONSTANTS.HEARTBEAT_INTERVAL_MS);

			const regAfter = await service.getAllInstances();
			expect(regAfter[0].registeredAt).toBe(registeredAt);
		});

		it('should continue after heartbeat failure', async () => {
			service = createService();
			await service.init();

			// Access the storage via getAllInstances to get a reference for spying
			// We need to spy on the storage's heartbeat method
			const storage = (service as unknown as { storage: MemoryInstanceStorage }).storage;
			const heartbeatSpy = jest
				.spyOn(storage, 'heartbeat')
				.mockRejectedValueOnce(new Error('Redis down'));

			await jest.advanceTimersByTimeAsync(REGISTRY_CONSTANTS.HEARTBEAT_INTERVAL_MS);

			expect(logger.warn).toHaveBeenCalledWith('Heartbeat failed', expect.any(Object));

			// Restore and verify heartbeat continues
			heartbeatSpy.mockRestore();
			await jest.advanceTimersByTimeAsync(REGISTRY_CONSTANTS.HEARTBEAT_INTERVAL_MS);

			const regs = await service.getAllInstances();
			expect(regs).toHaveLength(1);
		});

		it('should reflect instanceRole changes in heartbeat', async () => {
			const settings = makeInstanceSettings({ instanceRole: 'unset' });
			service = new InstanceRegistryService(settings, makeExecutionsConfig(), logger);
			await service.init();

			// Simulate role change (e.g., leader election completed)
			Object.defineProperty(settings, 'instanceRole', {
				value: 'leader',
				writable: true,
			});

			await jest.advanceTimersByTimeAsync(REGISTRY_CONSTANTS.HEARTBEAT_INTERVAL_MS);

			const local = service.getLocalInstance();
			expect(local.instanceRole).toBe('leader');
		});
	});

	describe('shutdown', () => {
		it('should stop heartbeat timer', async () => {
			service = createService();
			await service.init();

			const storage = (service as unknown as { storage: MemoryInstanceStorage }).storage;

			await service.shutdown();

			const heartbeatSpy = jest.spyOn(storage, 'heartbeat');
			await jest.advanceTimersByTimeAsync(REGISTRY_CONSTANTS.HEARTBEAT_INTERVAL_MS * 3);

			expect(heartbeatSpy).not.toHaveBeenCalled();
			heartbeatSpy.mockRestore();
		});

		it('should unregister from storage', async () => {
			service = createService();
			await service.init();

			const storage = (service as unknown as { storage: MemoryInstanceStorage }).storage;

			await service.shutdown();

			const registrations = await storage.getAllRegistrations();
			expect(registrations).toHaveLength(0);
		});

		it('should destroy storage', async () => {
			service = createService();
			await service.init();

			const storage = (service as unknown as { storage: MemoryInstanceStorage }).storage;
			const destroySpy = jest.spyOn(storage, 'destroy');

			await service.shutdown();

			expect(destroySpy).toHaveBeenCalled();
			destroySpy.mockRestore();
		});

		it('should not throw if unregister fails', async () => {
			service = createService();
			await service.init();

			const storage = (service as unknown as { storage: MemoryInstanceStorage }).storage;
			jest.spyOn(storage, 'unregister').mockRejectedValueOnce(new Error('fail'));

			await expect(service.shutdown()).resolves.toBeUndefined();
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to unregister during shutdown',
				expect.any(Object),
			);
		});

		it('should be safe to call before init', async () => {
			service = createService();

			await expect(service.shutdown()).resolves.toBeUndefined();
		});
	});

	describe('public API', () => {
		it('getAllInstances should return registrations from storage', async () => {
			service = createService();
			await service.init();

			const instances = await service.getAllInstances();
			expect(instances).toHaveLength(1);
			expect(instances[0].instanceKey).toMatch(UUID_REGEX);
		});

		it('getLocalInstance should return current registration', async () => {
			service = createService({ hostId: 'main-local' });
			await service.init();

			const local = service.getLocalInstance();
			expect(local.hostId).toBe('main-local');
			expect(local.schemaVersion).toBe(1);
		});

		it('getLastKnownState should delegate to storage', async () => {
			service = createService();
			await service.init();

			const state = await service.getLastKnownState();
			expect(state).toBeInstanceOf(Map);
			expect(state.size).toBe(0);
		});

		it('saveLastKnownState should delegate to storage', async () => {
			service = createService();
			await service.init();

			const reg = service.getLocalInstance();
			const state = new Map<string, InstanceRegistration>();
			state.set(reg.instanceKey, reg);

			await service.saveLastKnownState(state);

			const retrieved = await service.getLastKnownState();
			expect(retrieved.size).toBe(1);
		});

		it('storageBackend should return backend kind', async () => {
			service = createService();
			await service.init();

			expect(service.storageBackend).toBe('memory');
		});

		it('cleanupStaleMembers should delegate to storage', async () => {
			service = createService();
			await service.init();

			const removed = await service.cleanupStaleMembers();
			expect(removed).toBe(0);
		});
	});
});
