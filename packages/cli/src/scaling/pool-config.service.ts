import type { ProjectPoolSettingsResponse, UpdateProjectPoolSettingsDto } from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import { ProjectPoolSettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { IWorkflowExecutionDataProcess } from 'n8n-workflow';

import { CacheService } from '@/services/cache/cache.service';

import { DEFAULT_QUEUE_NAME, poolQueueName } from './queue-name';
import { WorkerPoolsService } from './worker-pools.service';

/**
 * Single resolution seam for routing executions to worker pools.
 *
 * The eventual precedence ladder is:
 *   workflow override > project per-category > project default > instance default > system queue
 * The MVP implements exactly one rung (project default). Re-introducing the other rungs later is a
 * change inside `resolvePoolForExecution`, not a re-spread across call sites.
 */
@Service()
export class PoolConfigService {
	constructor(
		private readonly projectPoolSettingsRepository: ProjectPoolSettingsRepository,
		private readonly cacheService: CacheService,
		private readonly workerPoolsService: WorkerPoolsService,
		private readonly globalConfig: GlobalConfig,
	) {}

	/**
	 * Resolve the queue an execution should run on. Returns the project's default pool when worker
	 * pools are enabled and the pool is live; otherwise the system default queue. Never routes to a
	 * pool that isn't registered by a worker.
	 */
	async resolvePoolForExecution(
		data: Pick<IWorkflowExecutionDataProcess, 'projectId'>,
	): Promise<{ queueName: string; poolName: string | undefined }> {
		const systemDefault = { queueName: DEFAULT_QUEUE_NAME, poolName: undefined };

		if (!this.globalConfig.queue.workerPool.enabled) return systemDefault;
		if (!data.projectId) return systemDefault;

		const pool = await this.getProjectDefaultPool(data.projectId);
		if (!pool) return systemDefault;

		const availablePools = await this.workerPoolsService.getAvailablePools();
		if (!availablePools.includes(pool)) return systemDefault;

		return { queueName: poolQueueName(pool), poolName: pool };
	}

	async getProjectPoolSettings(projectId: string): Promise<ProjectPoolSettingsResponse> {
		const [defaultPool, availablePools] = await Promise.all([
			this.getProjectDefaultPool(projectId),
			this.workerPoolsService.getAvailablePools(),
		]);

		return { defaultPool: defaultPool ?? null, availablePools };
	}

	async setProjectPoolSettings(
		projectId: string,
		patch: UpdateProjectPoolSettingsDto,
	): Promise<ProjectPoolSettingsResponse> {
		const defaultPool = patch.defaultPool ? patch.defaultPool : null;

		await this.projectPoolSettingsRepository.setDefaultPool(projectId, defaultPool);
		await this.cacheService.delete(this.cacheKey(projectId));

		const availablePools = await this.workerPoolsService.getAvailablePools();
		return { defaultPool, availablePools };
	}

	private cacheKey(projectId: string): string {
		return `projectPool:${projectId}`;
	}

	private async getProjectDefaultPool(projectId: string): Promise<string | undefined> {
		const cacheKey = this.cacheKey(projectId);

		const cached = await this.cacheService.get<string>(cacheKey);
		if (cached !== undefined) return cached || undefined;

		const pool = await this.projectPoolSettingsRepository.getDefaultPool(projectId);
		void this.cacheService.set(cacheKey, pool ?? '');
		return pool ?? undefined;
	}
}
