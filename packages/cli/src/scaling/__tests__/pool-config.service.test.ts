import type { ProjectPoolSettingsRepository, SettingsRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { PoolConfigService } from '@/scaling/pool-config.service';
import type { CacheService } from '@/services/cache/cache.service';

describe('PoolConfigService', () => {
	const settingsRepository = mock<SettingsRepository>();
	const projectPoolSettingsRepository = mock<ProjectPoolSettingsRepository>();
	const cacheService = mock<CacheService>();
	const service = new PoolConfigService(
		settingsRepository,
		projectPoolSettingsRepository,
		cacheService,
	);

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

	describe('getProjectPool', () => {
		const projectId = 'project-123';
		const cacheKey = `projectPool:${projectId}`;

		it('should return pool from DB on cache miss', async () => {
			cacheService.get.mockResolvedValue(undefined);
			projectPoolSettingsRepository.findOneBy.mockResolvedValue({
				projectId,
				productionPool: 'gpu',
				manualPool: null,
				evaluationPool: 'eval',
				allowedPools: [],
			} as never);

			const result = await service.getProjectPool(projectId, 'production');

			expect(result).toBe('gpu');
			expect(projectPoolSettingsRepository.findOneBy).toHaveBeenCalledWith({ projectId });
			expect(cacheService.set).toHaveBeenCalledWith(
				cacheKey,
				JSON.stringify({ productionPool: 'gpu', manualPool: null, evaluationPool: 'eval' }),
			);
		});

		it('should return pool from cache on cache hit', async () => {
			cacheService.get.mockResolvedValue(
				JSON.stringify({ productionPool: 'gpu', manualPool: null, evaluationPool: 'eval' }),
			);

			const result = await service.getProjectPool(projectId, 'production');

			expect(result).toBe('gpu');
			expect(projectPoolSettingsRepository.findOneBy).not.toHaveBeenCalled();
		});

		it('should return undefined when no settings row exists', async () => {
			cacheService.get.mockResolvedValue(undefined);
			projectPoolSettingsRepository.findOneBy.mockResolvedValue(null);

			const result = await service.getProjectPool(projectId, 'production');

			expect(result).toBeUndefined();
			expect(cacheService.set).toHaveBeenCalledWith(cacheKey, JSON.stringify({}));
		});

		it('should return undefined when category column is null', async () => {
			cacheService.get.mockResolvedValue(undefined);
			projectPoolSettingsRepository.findOneBy.mockResolvedValue({
				projectId,
				productionPool: null,
				manualPool: 'cpu',
				evaluationPool: null,
				allowedPools: [],
			} as never);

			const result = await service.getProjectPool(projectId, 'production');

			expect(result).toBeUndefined();
		});

		it('should return correct pool per category', async () => {
			cacheService.get.mockResolvedValue(
				JSON.stringify({ productionPool: 'gpu', manualPool: 'cpu', evaluationPool: 'eval' }),
			);

			expect(await service.getProjectPool(projectId, 'production')).toBe('gpu');
			expect(await service.getProjectPool(projectId, 'manual')).toBe('cpu');
			expect(await service.getProjectPool(projectId, 'evaluation')).toBe('eval');
		});
	});
});
