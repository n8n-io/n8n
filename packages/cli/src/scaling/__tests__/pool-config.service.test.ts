import type { SettingsRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { PoolConfigService } from '@/scaling/pool-config.service';
import type { CacheService } from '@/services/cache/cache.service';

describe('PoolConfigService', () => {
	const settingsRepository = mock<SettingsRepository>();
	const cacheService = mock<CacheService>();
	const service = new PoolConfigService(settingsRepository, cacheService);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('setPoolAssignment', () => {
		it('should merge partial updates with the existing assignment', async () => {
			cacheService.get.mockResolvedValue(undefined);
			settingsRepository.findByKey.mockResolvedValue({
				key: 'workerPools.assignment',
				value: JSON.stringify({ production: 'gpu' }),
				loadOnStartup: true,
			});

			const result = await service.setPoolAssignment({ manual: 'cpu' });

			expect(result).toEqual({ production: 'gpu', manual: 'cpu' });
			expect(settingsRepository.upsert).toHaveBeenCalledWith(
				{
					key: 'workerPools.assignment',
					value: JSON.stringify({ production: 'gpu', manual: 'cpu' }),
					loadOnStartup: true,
				},
				['key'],
			);
			expect(cacheService.set).toHaveBeenCalledWith(
				'workerPools.assignment',
				JSON.stringify({ production: 'gpu', manual: 'cpu' }),
			);
		});

		it('should remove a category when its value is an empty string', async () => {
			cacheService.get.mockResolvedValue(JSON.stringify({ production: 'gpu', manual: 'cpu' }));

			const result = await service.setPoolAssignment({ manual: '' });

			expect(result).toEqual({ production: 'gpu' });
			expect(settingsRepository.upsert).toHaveBeenCalledWith(
				{
					key: 'workerPools.assignment',
					value: JSON.stringify({ production: 'gpu' }),
					loadOnStartup: true,
				},
				['key'],
			);
		});

		it('should write to settings repo and update cache', async () => {
			cacheService.get.mockResolvedValue(JSON.stringify({}));

			await service.setPoolAssignment({ evaluation: 'eval-pool' });

			expect(settingsRepository.upsert).toHaveBeenCalledTimes(1);
			expect(cacheService.set).toHaveBeenCalledTimes(1);
		});
	});
});
