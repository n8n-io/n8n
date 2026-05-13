import { SettingsRepository } from '@n8n/db';
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
}
