import { mock } from 'jest-mock-extended';

import type { PoolConfigService } from '@/scaling/pool-config.service';
import { WorkerPoolsService } from '@/scaling/worker-pools.service';

describe('WorkerPoolsService', () => {
	const poolConfigService = mock<PoolConfigService>();
	const service = new WorkerPoolsService(poolConfigService);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getAvailablePools', () => {
		it('should return default pool', async () => {
			await expect(service.getAvailablePools()).resolves.toEqual(['default']);
		});
	});

	describe('getPoolsState', () => {
		it('should return pools and assignment together', async () => {
			poolConfigService.getPoolAssignment.mockResolvedValue({ production: 'gpu' });

			const result = await service.getPoolsState();

			expect(result).toEqual({
				pools: ['default'],
				assignment: { production: 'gpu' },
			});
			expect(poolConfigService.getPoolAssignment).toHaveBeenCalledTimes(1);
		});
	});
});
