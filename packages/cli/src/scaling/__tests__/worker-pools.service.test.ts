import type { InstanceRegistration } from '@n8n/api-types';
import { mock } from 'jest-mock-extended';

import type { InstanceRegistryService } from '@/modules/instance-registry/instance-registry.service';
import type { PoolConfigService } from '@/scaling/pool-config.service';
import { WorkerPoolsService } from '@/scaling/worker-pools.service';

const buildWorker = (overrides: Partial<InstanceRegistration> = {}): InstanceRegistration => ({
	schemaVersion: 1 as const,
	instanceKey: 'worker-1',
	hostId: 'host-1',
	instanceType: 'worker',
	instanceRole: 'unset',
	version: '1.0.0',
	registeredAt: 0,
	lastSeen: 0,
	...overrides,
});

describe('WorkerPoolsService', () => {
	const poolConfigService = mock<PoolConfigService>();
	const instanceRegistryService = mock<InstanceRegistryService>();
	const service = new WorkerPoolsService(poolConfigService, instanceRegistryService);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getAvailablePools', () => {
		it('should return distinct pool names from worker registrations, sorted', async () => {
			instanceRegistryService.getAllInstances.mockResolvedValue([
				buildWorker({ instanceKey: 'w1', poolName: 'gpu' }),
				buildWorker({ instanceKey: 'w2', poolName: 'cpu' }),
				buildWorker({ instanceKey: 'w3', poolName: 'gpu' }),
			]);

			await expect(service.getAvailablePools()).resolves.toEqual(['cpu', 'gpu']);
		});

		it('should skip non-worker instances', async () => {
			instanceRegistryService.getAllInstances.mockResolvedValue([
				buildWorker({ instanceKey: 'm1', instanceType: 'main' }),
				buildWorker({ instanceKey: 'wh1', instanceType: 'webhook' }),
				buildWorker({ instanceKey: 'w1', poolName: 'gpu' }),
			]);

			await expect(service.getAvailablePools()).resolves.toEqual(['gpu']);
		});

		it('should skip workers without a pool name', async () => {
			instanceRegistryService.getAllInstances.mockResolvedValue([
				buildWorker({ instanceKey: 'w1' }),
				buildWorker({ instanceKey: 'w2', poolName: '' }),
				buildWorker({ instanceKey: 'w3', poolName: 'gpu' }),
			]);

			await expect(service.getAvailablePools()).resolves.toEqual(['gpu']);
		});

		it('should return an empty array when no workers are registered with pools', async () => {
			instanceRegistryService.getAllInstances.mockResolvedValue([
				buildWorker({ instanceKey: 'm1', instanceType: 'main' }),
			]);

			await expect(service.getAvailablePools()).resolves.toEqual([]);
		});
	});

	describe('getPoolsState', () => {
		it('should return pools and assignment together', async () => {
			instanceRegistryService.getAllInstances.mockResolvedValue([buildWorker({ poolName: 'gpu' })]);
			poolConfigService.getPoolAssignment.mockResolvedValue({ production: 'gpu' });

			const result = await service.getPoolsState();

			expect(result).toEqual({
				pools: ['gpu'],
				assignment: { production: 'gpu' },
			});
			expect(poolConfigService.getPoolAssignment).toHaveBeenCalledTimes(1);
		});
	});
});
