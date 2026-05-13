import { mock } from 'jest-mock-extended';

import { WorkerPoolDefaultsService } from '@/scaling/worker-pool-defaults.service';
import { WorkerPoolsService } from '@/scaling/worker-pools.service';

describe('WorkerPoolsService', () => {
	const poolDefaultsService = mock<WorkerPoolDefaultsService>();
	const service = new WorkerPoolsService(poolDefaultsService);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getAvailablePools', () => {
		it('should return default pool', async () => {
			await expect(service.getAvailablePools()).resolves.toEqual(['default']);
		});
	});

	describe('getPoolsState', () => {
		it('should return pools and defaults together', async () => {
			poolDefaultsService.getDefaults.mockResolvedValue({
				production: 'default',
				manual: 'default',
				evaluation: 'default',
			});

			const result = await service.getPoolsState();

			expect(result).toEqual({
				pools: ['default'],
				defaults: {
					production: 'default',
					manual: 'default',
					evaluation: 'default',
				},
			});
			expect(poolDefaultsService.getDefaults).toHaveBeenCalledTimes(1);
		});
	});
});
