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

		it('should return pool from DB on cache miss', async () => {
			cacheService.get.mockResolvedValue(undefined);
			projectPoolSettingsRepository.getPoolForCategory.mockResolvedValue('gpu');

			const result = await service.getProjectPool(projectId, 'production');

			expect(result).toBe('gpu');
			expect(projectPoolSettingsRepository.getPoolForCategory).toHaveBeenCalledWith(
				projectId,
				'production',
			);
			expect(cacheService.set).toHaveBeenCalledWith(`projectPool:${projectId}:production`, 'gpu');
		});

		it('should return pool from cache on cache hit', async () => {
			cacheService.get.mockResolvedValue('gpu');

			const result = await service.getProjectPool(projectId, 'production');

			expect(result).toBe('gpu');
			expect(projectPoolSettingsRepository.getPoolForCategory).not.toHaveBeenCalled();
		});

		it('should return undefined when no settings row exists', async () => {
			cacheService.get.mockResolvedValue(undefined);
			projectPoolSettingsRepository.getPoolForCategory.mockResolvedValue(undefined);

			const result = await service.getProjectPool(projectId, 'production');

			expect(result).toBeUndefined();
			expect(cacheService.set).toHaveBeenCalledWith(`projectPool:${projectId}:production`, '');
		});

		it('should return undefined when cached value is empty string', async () => {
			cacheService.get.mockResolvedValue('');

			const result = await service.getProjectPool(projectId, 'production');

			expect(result).toBeUndefined();
			expect(projectPoolSettingsRepository.getPoolForCategory).not.toHaveBeenCalled();
		});

		it('should cache per category', async () => {
			cacheService.get.mockResolvedValue(undefined);
			projectPoolSettingsRepository.getPoolForCategory
				.mockResolvedValueOnce('gpu')
				.mockResolvedValueOnce('cpu');

			await service.getProjectPool(projectId, 'production');
			await service.getProjectPool(projectId, 'manual');

			expect(cacheService.set).toHaveBeenCalledWith(`projectPool:${projectId}:production`, 'gpu');
			expect(cacheService.set).toHaveBeenCalledWith(`projectPool:${projectId}:manual`, 'cpu');
		});
	});

	describe('setProjectPoolSettings', () => {
		const projectId = 'project-123';

		beforeEach(() => {
			// By default, no existing row
			cacheService.get.mockResolvedValue(undefined);
			projectPoolSettingsRepository.getSettings.mockResolvedValue(undefined);
		});

		it('writes assignment and allowedPools when both are provided', async () => {
			const result = await service.setProjectPoolSettings(projectId, {
				assignment: { production: 'gpu' },
				allowedPools: ['gpu', 'cpu'],
			});

			expect(result).toEqual({
				assignment: { production: 'gpu' },
				allowedPools: ['gpu', 'cpu'],
			});
			expect(projectPoolSettingsRepository.setSettings).toHaveBeenCalledWith(projectId, {
				assignment: { production: 'gpu' },
				allowedPools: ['gpu', 'cpu'],
			});
		});

		it('merges assignment with existing values; keeps unspecified categories', async () => {
			projectPoolSettingsRepository.getSettings.mockResolvedValueOnce({
				assignment: { production: 'gpu', manual: 'cpu' },
				allowedPools: ['gpu', 'cpu'],
			});

			const result = await service.setProjectPoolSettings(projectId, {
				assignment: { evaluation: 'cpu' },
			});

			expect(result.assignment).toEqual({ production: 'gpu', manual: 'cpu', evaluation: 'cpu' });
			expect(result.allowedPools).toEqual(['gpu', 'cpu']);
		});

		it('clears a category when assignment value is an empty string', async () => {
			projectPoolSettingsRepository.getSettings.mockResolvedValueOnce({
				assignment: { production: 'gpu', manual: 'cpu' },
				allowedPools: ['gpu', 'cpu'],
			});

			const result = await service.setProjectPoolSettings(projectId, {
				assignment: { production: '' },
			});

			expect(result.assignment).toEqual({ manual: 'cpu' });
		});

		it('keeps existing allowedPools when not specified in patch', async () => {
			projectPoolSettingsRepository.getSettings.mockResolvedValueOnce({
				assignment: { production: 'gpu' },
				allowedPools: ['gpu', 'cpu'],
			});

			const result = await service.setProjectPoolSettings(projectId, {
				assignment: { manual: 'cpu' },
			});

			expect(result.allowedPools).toEqual(['gpu', 'cpu']);
		});

		it('rejects when a per-category default is not in allowedPools (new write)', async () => {
			await expect(
				service.setProjectPoolSettings(projectId, {
					assignment: { production: 'gpu' },
					allowedPools: ['cpu'],
				}),
			).rejects.toThrow('production pool "gpu" must be one of allowedPools');

			expect(projectPoolSettingsRepository.setSettings).not.toHaveBeenCalled();
		});

		it('rejects when shrinking allowedPools below an existing default', async () => {
			projectPoolSettingsRepository.getSettings.mockResolvedValueOnce({
				assignment: { production: 'gpu' },
				allowedPools: ['gpu', 'cpu'],
			});

			await expect(
				service.setProjectPoolSettings(projectId, {
					allowedPools: ['cpu'],
				}),
			).rejects.toThrow('production pool "gpu" must be one of allowedPools');
		});

		it('invalidates the project caches after a successful write', async () => {
			await service.setProjectPoolSettings(projectId, {
				assignment: { production: 'gpu' },
				allowedPools: ['gpu'],
			});

			expect(cacheService.deleteMany).toHaveBeenCalledWith([
				`projectPoolSettings:${projectId}`,
				`projectPool:${projectId}:production`,
				`projectPool:${projectId}:manual`,
				`projectPool:${projectId}:evaluation`,
			]);
		});
	});
});
