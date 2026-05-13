import { ProjectPoolSettingsRepository, SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';

import { CacheService } from '@/services/cache/cache.service';

import { poolQueueName } from './queue-name';
import type { ExecutionCategory, PoolAssignment } from './scaling.types';

const SETTINGS_KEY = 'workerPools.assignment';

/** Resolves execution categories to worker pool queue names using DB-backed settings with cache. */
@Service()
export class PoolConfigService {
	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly projectPoolSettingsRepository: ProjectPoolSettingsRepository,
		private readonly cacheService: CacheService,
	) {}

	async getQueueNameForCategory(category: ExecutionCategory): Promise<string> {
		const assignment = await this.getPoolAssignment();
		return poolQueueName(assignment[category]);
	}

	async getPoolAssignment(): Promise<PoolAssignment> {
		const cached = await this.cacheService.get<string>(SETTINGS_KEY);
		if (cached !== undefined) {
			return jsonParse<PoolAssignment>(cached, { fallbackValue: {} });
		}

		const row = await this.settingsRepository.findByKey(SETTINGS_KEY);
		const assignment = row?.value
			? jsonParse<PoolAssignment>(row.value, { fallbackValue: {} })
			: {};

		await this.cacheService.set(SETTINGS_KEY, JSON.stringify(assignment));
		return assignment;
	}

	async setPoolAssignment(partial: PoolAssignment): Promise<PoolAssignment> {
		const current = await this.getPoolAssignment();
		const next: PoolAssignment = { ...current };
		for (const [category, pool] of Object.entries(partial) as Array<
			[ExecutionCategory, string | undefined]
		>) {
			if (pool === undefined || pool === '') {
				delete next[category];
			} else {
				next[category] = pool;
			}
		}

		const serialized = JSON.stringify(next);
		await this.settingsRepository.upsert(
			{ key: SETTINGS_KEY, value: serialized, loadOnStartup: true },
			['key'],
		);
		await this.cacheService.set(SETTINGS_KEY, serialized);

		return next;
	}

	async getProjectPool(
		projectId: string,
		category: ExecutionCategory,
	): Promise<string | undefined> {
		const cacheKey = `projectPool:${projectId}`;

		const cached = await this.cacheService.get<string>(cacheKey);
		if (cached !== undefined) {
			const settings = jsonParse<ProjectPoolColumns>(cached, { fallbackValue: {} });
			return pickPool(settings, category) ?? undefined;
		}

		const row = await this.projectPoolSettingsRepository.findOneBy({ projectId });

		const toCache = row
			? JSON.stringify({
					productionPool: row.productionPool,
					manualPool: row.manualPool,
					evaluationPool: row.evaluationPool,
				})
			: JSON.stringify({});
		await this.cacheService.set(cacheKey, toCache);

		if (!row) return undefined;
		return pickPool(row, category) ?? undefined;
	}
}

type ProjectPoolColumns = Partial<
	Pick<import('@n8n/db').ProjectPoolSettings, 'productionPool' | 'manualPool' | 'evaluationPool'>
>;

function pickPool(
	settings: ProjectPoolColumns,
	category: ExecutionCategory,
): string | null | undefined {
	switch (category) {
		case 'production':
			return settings.productionPool;
		case 'manual':
			return settings.manualPool;
		case 'evaluation':
			return settings.evaluationPool;
	}
}
