import type { GlobalConfig } from '@n8n/config';
import type { ProjectPoolSettingsRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { PoolConfigService } from '@/scaling/pool-config.service';
import type { WorkerPoolsService } from '@/scaling/worker-pools.service';
import type { CacheService } from '@/services/cache/cache.service';

describe('PoolConfigService', () => {
	const projectPoolSettingsRepository = mock<ProjectPoolSettingsRepository>();
	const cacheService = mock<CacheService>();
	const workerPoolsService = mock<WorkerPoolsService>();
	const globalConfig = mock<GlobalConfig>();

	const setEnabled = (enabled: boolean) => {
		globalConfig.queue = { workerPool: { enabled } } as GlobalConfig['queue'];
	};

	const service = new PoolConfigService(
		projectPoolSettingsRepository,
		cacheService,
		workerPoolsService,
		globalConfig,
	);

	beforeEach(() => {
		jest.clearAllMocks();
		setEnabled(true);
		// Default: cache miss, no workers registered
		cacheService.get.mockResolvedValue(undefined);
		workerPoolsService.getAvailablePools.mockResolvedValue([]);
	});

	describe('resolvePoolForExecution', () => {
		const projectId = 'project-123';

		it("resolves to the project's configured pool", async () => {
			projectPoolSettingsRepository.getDefaultPool.mockResolvedValue('gpu');

			const result = await service.resolvePoolForExecution({ projectId });

			expect(result).toEqual({ queueName: 'jobs-gpu', poolName: 'gpu' });
		});

		it('routes to the configured pool without checking for live workers', async () => {
			projectPoolSettingsRepository.getDefaultPool.mockResolvedValue('gpu');

			const result = await service.resolvePoolForExecution({ projectId });

			expect(result).toEqual({ queueName: 'jobs-gpu', poolName: 'gpu' });
			// Routing must stay off the registry: it runs on the enqueue hot path.
			expect(workerPoolsService.getAvailablePools).not.toHaveBeenCalled();
		});

		it('falls back to the default queue when the project has no pool set', async () => {
			projectPoolSettingsRepository.getDefaultPool.mockResolvedValue(null);

			const result = await service.resolvePoolForExecution({ projectId });

			expect(result).toEqual({ queueName: 'jobs', poolName: undefined });
		});

		it('routes to the configured pool even when no worker is registered for it', async () => {
			projectPoolSettingsRepository.getDefaultPool.mockResolvedValue('gpu');
			workerPoolsService.getAvailablePools.mockResolvedValue(['cpu']);

			const result = await service.resolvePoolForExecution({ projectId });

			expect(result).toEqual({ queueName: 'jobs-gpu', poolName: 'gpu' });
		});

		it('falls back to the default queue when there is no project id', async () => {
			const result = await service.resolvePoolForExecution({ projectId: undefined });

			expect(result).toEqual({ queueName: 'jobs', poolName: undefined });
			expect(projectPoolSettingsRepository.getDefaultPool).not.toHaveBeenCalled();
		});

		it('forces the default queue when worker pools are disabled, ignoring DB rows', async () => {
			setEnabled(false);
			projectPoolSettingsRepository.getDefaultPool.mockResolvedValue('gpu');
			workerPoolsService.getAvailablePools.mockResolvedValue(['gpu']);

			const result = await service.resolvePoolForExecution({ projectId });

			expect(result).toEqual({ queueName: 'jobs', poolName: undefined });
			expect(projectPoolSettingsRepository.getDefaultPool).not.toHaveBeenCalled();
		});

		it('reads the project pool from cache on a cache hit', async () => {
			cacheService.get.mockResolvedValue('gpu');
			workerPoolsService.getAvailablePools.mockResolvedValue(['gpu']);

			const result = await service.resolvePoolForExecution({ projectId });

			expect(result).toEqual({ queueName: 'jobs-gpu', poolName: 'gpu' });
			expect(projectPoolSettingsRepository.getDefaultPool).not.toHaveBeenCalled();
		});
	});

	describe('getProjectPoolSettings', () => {
		const projectId = 'project-123';

		it('returns the stored default pool and the available pools', async () => {
			projectPoolSettingsRepository.getDefaultPool.mockResolvedValue('gpu');
			workerPoolsService.getAvailablePools.mockResolvedValue(['gpu', 'cpu']);

			const result = await service.getProjectPoolSettings(projectId);

			expect(result).toEqual({ defaultPool: 'gpu', availablePools: ['gpu', 'cpu'] });
		});

		it('returns null defaultPool when none is stored', async () => {
			projectPoolSettingsRepository.getDefaultPool.mockResolvedValue(null);

			const result = await service.getProjectPoolSettings(projectId);

			expect(result).toEqual({ defaultPool: null, availablePools: [] });
		});
	});

	describe('setProjectPoolSettings', () => {
		const projectId = 'project-123';

		it('persists the default pool and invalidates the project cache', async () => {
			workerPoolsService.getAvailablePools.mockResolvedValue(['gpu']);

			const result = await service.setProjectPoolSettings(projectId, { defaultPool: 'gpu' });

			expect(result).toEqual({ defaultPool: 'gpu', availablePools: ['gpu'] });
			expect(projectPoolSettingsRepository.setDefaultPool).toHaveBeenCalledWith(projectId, 'gpu');
			expect(cacheService.delete).toHaveBeenCalledWith(`projectPool:${projectId}`);
		});

		it('clears the default pool when given an empty string', async () => {
			const result = await service.setProjectPoolSettings(projectId, { defaultPool: '' });

			expect(result.defaultPool).toBeNull();
			expect(projectPoolSettingsRepository.setDefaultPool).toHaveBeenCalledWith(projectId, null);
		});

		it('clears the default pool when given null', async () => {
			const result = await service.setProjectPoolSettings(projectId, { defaultPool: null });

			expect(result.defaultPool).toBeNull();
			expect(projectPoolSettingsRepository.setDefaultPool).toHaveBeenCalledWith(projectId, null);
		});
	});
});
