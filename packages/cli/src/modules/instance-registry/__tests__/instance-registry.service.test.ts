import type { InstanceRegistration } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { ExecutionsConfig, ScalingModeConfig } from '@n8n/config';
import { WorkerPoolConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { N8N_VERSION } from '@/constants';

import { InstanceRegistryService } from '../instance-registry.service';
import { REGISTRY_CONSTANTS } from '../instance-registry.types';
import type { InstanceStorage } from '../storage/instance-storage.interface';
import type { MemoryInstanceStorage } from '../storage/memory-storage';
import { RedisInstanceStorage } from '../storage/redis-instance-storage';

vi.mock('../storage/redis-instance-storage', () => {
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

const makeScalingModeConfig = (poolName: string = '', enabled: boolean = true) => {
	const workerPool = Object.assign(new WorkerPoolConfig(), { name: poolName, enabled });
	return mock<ScalingModeConfig>({ workerPool });
};

const makeLogger = () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	return logger;
};

describe('InstanceRegistryService', () => {
	let service: InstanceRegistryService;
	let logger: ReturnType<typeof makeLogger>;

	beforeEach(() => {
		vi.useFakeTimers();
		logger = makeLogger();
	});

	afterEach(async () => {
		// Ensure shutdown to clean up timers
		try {
			await service?.shutdown();
		} catch {}
		Container.reset();
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	const createService = (
		settingsOverrides: Partial<InstanceSettings> = {},
		executionMode: 'regular' | 'queue' = 'regular',
		poolName: string = '',
		poolsEnabled: boolean = true,
	) =>
		new InstanceRegistryService(
			makeInstanceSettings(settingsOverrides),
			makeExecutionsConfig(executionMode),
			makeScalingModeConfig(poolName, poolsEnabled),
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
				// The vi.mock above replaces RedisInstanceStorage with a stub
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

		it('should not start a heartbeat timer', async () => {
			service = createService();
			await service.init();
			const storage = (service as unknown as { storage: MemoryInstanceStorage }).storage;
			const heartbeatSpy = vi.spyOn(storage, 'heartbeat');

			await vi.advanceTimersByTimeAsync(REGISTRY_CONSTANTS.HEARTBEAT_INTERVAL_MS * 3);

			expect(heartbeatSpy).not.toHaveBeenCalled();
		});
	});

	describe('startup cluster version log', () => {
		let storage: ReturnType<typeof mock<RedisInstanceStorage>>;
		let registrations: InstanceRegistration[];

		const makePeer = (overrides: Partial<InstanceRegistration> = {}): InstanceRegistration => ({
			schemaVersion: 1,
			instanceKey: 'peer-key',
			hostId: 'peer-host',
			instanceType: 'main',
			instanceRole: 'leader',
			version: '1.0.0',
			registeredAt: 0,
			lastSeen: 0,
			...overrides,
		});

		beforeEach(() => {
			registrations = [];
			storage = mock<RedisInstanceStorage>({ kind: 'redis' });
			storage.register.mockImplementation(async (registration) => {
				registrations.push(registration);
			});
			storage.getAllRegistrations.mockResolvedValue(registrations);
			Container.set(RedisInstanceStorage, storage);
		});

		it.each([
			{ instanceType: 'main', instanceRole: 'leader' },
			{ instanceType: 'main', instanceRole: 'follower' },
			{ instanceType: 'main', instanceRole: 'unset' },
			{ instanceType: 'worker', instanceRole: 'unset' },
			{ instanceType: 'webhook', instanceRole: 'unset' },
			{ instanceType: 'engine', instanceRole: 'unset' },
		] as const)('logs a mismatch on $instanceType/$instanceRole', async (settings) => {
			registrations.push(makePeer());
			service = createService(settings, 'queue');

			await service.init();

			expect(logger.info).toHaveBeenCalledWith(
				`Cluster is running multiple n8n versions: 1.0.0, ${N8N_VERSION}`,
				{
					instances: [
						{
							hostId: 'peer-host',
							instanceType: 'main',
							instanceRole: 'leader',
							version: '1.0.0',
						},
						{
							hostId: 'main-abc123',
							...settings,
							version: N8N_VERSION,
						},
					],
				},
			);
		});

		it('logs an aligned cluster after the local instance registers', async () => {
			service = createService({}, 'queue');

			await service.init();

			expect(logger.info).toHaveBeenCalledWith(`Cluster aligned on version ${N8N_VERSION}`, {
				instances: [
					{
						hostId: 'main-abc123',
						instanceType: 'main',
						instanceRole: 'unset',
						version: N8N_VERSION,
					},
				],
			});
		});

		it('logs each version once in sorted order', async () => {
			registrations.push(
				makePeer({ instanceKey: 'peer-1', version: '9.0.0' }),
				makePeer({ instanceKey: 'peer-2', version: '1.0.0' }),
				makePeer({ instanceKey: 'peer-3', version: '1.0.0' }),
			);
			service = createService({}, 'queue');

			await service.init();

			expect(logger.info).toHaveBeenCalledWith(
				`Cluster is running multiple n8n versions: 1.0.0, ${N8N_VERSION}, 9.0.0`,
				expect.any(Object),
			);
		});

		it('logs an aligned cluster when multiple instances use the same version', async () => {
			registrations.push(makePeer({ version: N8N_VERSION }));
			service = createService({}, 'queue');

			await service.init();

			expect(logger.info).toHaveBeenCalledWith(
				`Cluster aligned on version ${N8N_VERSION}`,
				expect.objectContaining({ instances: expect.arrayContaining([expect.any(Object)]) }),
			);
		});

		it('does not repeat the startup log during heartbeats', async () => {
			registrations.push(makePeer());
			service = createService({}, 'queue');
			await service.init();
			logger.info.mockClear();

			await service.heartbeat();
			await service.heartbeat();

			expect(storage.getAllRegistrations).toHaveBeenCalledTimes(1);
			expect(logger.info).not.toHaveBeenCalled();
		});

		it('keeps startup successful when the version snapshot read fails', async () => {
			const error = new Error('Registry unavailable');
			storage.getAllRegistrations.mockRejectedValueOnce(error);
			service = createService({}, 'queue');

			await expect(service.init()).resolves.toBeUndefined();

			expect(logger.warn).toHaveBeenCalledWith('Failed to get all registrations', { error });
			expect(logger.info).toHaveBeenCalledTimes(1);
			expect(logger.info).toHaveBeenCalledWith('Instance registered', expect.any(Object));
		});

		it('does not report alignment when the registry snapshot is empty', async () => {
			storage.getAllRegistrations.mockResolvedValueOnce([]);
			service = createService({}, 'queue');

			await service.init();

			expect(logger.info).toHaveBeenCalledTimes(1);
			expect(logger.info).toHaveBeenCalledWith('Instance registered', expect.any(Object));
		});
	});

	describe('heartbeat', () => {
		it('should refresh lastSeen in storage', async () => {
			service = createService();
			await service.init();
			const [before] = await service.getAllInstances();

			vi.advanceTimersByTime(1_000);
			await service.heartbeat();

			const [after] = await service.getAllInstances();
			expect(after.lastSeen).toBeGreaterThan(before.lastSeen);
		});

		it('should preserve registeredAt across heartbeats', async () => {
			service = createService();
			await service.init();
			const [before] = await service.getAllInstances();

			vi.advanceTimersByTime(1_000);
			await service.heartbeat();

			const [after] = await service.getAllInstances();
			expect(after.registeredAt).toBe(before.registeredAt);
		});

		it('should write the live instanceRole to storage', async () => {
			const settings = makeInstanceSettings({ instanceRole: 'unset' });
			service = new InstanceRegistryService(
				settings,
				makeExecutionsConfig(),
				makeScalingModeConfig(),
				logger,
			);
			await service.init();

			Object.defineProperty(settings, 'instanceRole', { value: 'leader', writable: true });
			await service.heartbeat();

			const [registration] = await service.getAllInstances();
			expect(registration.instanceRole).toBe('leader');
		});

		it('should let a storage failure reach the caller', async () => {
			service = createService();
			await service.init();
			const storage = (service as unknown as { storage: MemoryInstanceStorage }).storage;
			const error = new Error('Redis down');
			vi.spyOn(storage, 'heartbeat').mockRejectedValueOnce(error);

			await expect(service.heartbeat()).rejects.toBe(error);
			expect(logger.warn).not.toHaveBeenCalled();
		});
	});

	describe('shutdown', () => {
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
			const destroySpy = vi.spyOn(storage, 'destroy');

			await service.shutdown();

			expect(destroySpy).toHaveBeenCalled();
			destroySpy.mockRestore();
		});

		it('should not throw if unregister fails', async () => {
			service = createService();
			await service.init();

			const storage = (service as unknown as { storage: MemoryInstanceStorage }).storage;
			vi.spyOn(storage, 'unregister').mockRejectedValueOnce(new Error('fail'));

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

		it('should read the live instanceRole when building the local registration', async () => {
			const settings = makeInstanceSettings({ instanceRole: 'unset' });
			service = new InstanceRegistryService(
				settings,
				makeExecutionsConfig(),
				makeScalingModeConfig(),
				logger,
			);
			await service.init();

			Object.defineProperty(settings, 'instanceRole', { value: 'leader', writable: true });

			expect(service.getLocalInstance().instanceRole).toBe('leader');
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

	describe('poolName', () => {
		it('records poolName on worker registration when pool is set', async () => {
			service = createService({ instanceType: 'worker', instanceRole: 'unset' }, 'queue', 'gpu');

			await service.init();
			const [reg] = await service.getAllInstances();

			expect(reg.poolName).toBe('gpu');
		});

		it('records empty poolName on worker registration when pool is unset', async () => {
			service = createService({ instanceType: 'worker', instanceRole: 'unset' }, 'queue');

			await service.init();
			const [reg] = await service.getAllInstances();

			expect(reg.poolName).toBe('');
		});

		it('records empty poolName on worker registration when pool is set but pools are disabled', async () => {
			service = createService(
				{ instanceType: 'worker', instanceRole: 'unset' },
				'queue',
				'gpu',
				false,
			);

			await service.init();
			const [reg] = await service.getAllInstances();

			expect(reg.poolName).toBe('');
		});

		it('omits poolName on main registration even when config has a pool', async () => {
			service = createService({ instanceType: 'main', instanceRole: 'leader' }, 'regular', 'gpu');

			await service.init();
			const [reg] = await service.getAllInstances();

			expect(reg.poolName).toBeUndefined();
		});

		it('omits poolName on webhook registration even when config has a pool', async () => {
			service = createService({ instanceType: 'webhook', instanceRole: 'unset' }, 'regular', 'gpu');

			await service.init();
			const [reg] = await service.getAllInstances();

			expect(reg.poolName).toBeUndefined();
		});
	});

	describe('storage failures', () => {
		const storageOf = (s: InstanceRegistryService): InstanceStorage =>
			(s as unknown as { storage: InstanceStorage }).storage;

		it('getAllInstances returns an empty list when the storage read fails', async () => {
			service = createService();
			await service.init();
			vi.spyOn(storageOf(service), 'getAllRegistrations').mockRejectedValueOnce(
				new Error('Redis down'),
			);

			await expect(service.getAllInstances()).resolves.toEqual([]);
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to get all registrations',
				expect.any(Object),
			);
		});

		it('getLastKnownState returns an empty map when the storage read fails', async () => {
			service = createService();
			await service.init();
			vi.spyOn(storageOf(service), 'getLastKnownState').mockRejectedValueOnce(
				new Error('Redis down'),
			);

			await expect(service.getLastKnownState()).resolves.toEqual(new Map());
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to get last known state',
				expect.any(Object),
			);
		});

		it('readClusterState rejects when the registrations read fails', async () => {
			service = createService();
			await service.init();
			const error = new Error('Redis down');
			vi.spyOn(storageOf(service), 'getAllRegistrations').mockRejectedValueOnce(error);

			await expect(service.readClusterState()).rejects.toBe(error);
		});

		it('readClusterState rejects when the baseline read fails', async () => {
			service = createService();
			await service.init();
			const error = new Error('Redis down');
			vi.spyOn(storageOf(service), 'getLastKnownState').mockRejectedValueOnce(error);

			await expect(service.readClusterState()).rejects.toBe(error);
		});
	});
});
