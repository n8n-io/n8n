import type { ProjectPoolSettingsResponse, UpdateProjectPoolSettingsDto } from '@n8n/api-types';
import { ProjectPoolSettingsRepository, SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InstanceRegistryService } from '@/modules/instance-registry/instance-registry.service';
import { CacheService } from '@/services/cache/cache.service';

import { poolQueueName } from './queue-name';
import type { ExecutionCategory, PoolAssignment } from './scaling.types';

const EXECUTION_CATEGORIES: ExecutionCategory[] = ['production', 'manual', 'evaluation'];

const SETTINGS_KEY = 'workerPools.assignment';

/** Resolves execution categories to worker pool queue names using DB-backed settings with cache. */
@Service()
export class PoolConfigService {
	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly projectPoolSettingsRepository: ProjectPoolSettingsRepository,
		private readonly cacheService: CacheService,
		private readonly instanceRegistryService: InstanceRegistryService,
	) {}

	private async getAvailablePoolsFromCluster(): Promise<string[]> {
		const instances = await this.instanceRegistryService.getAllInstances();
		const names = new Set<string>();
		for (const instance of instances) {
			if (instance.instanceType !== 'worker') continue;
			if (instance.poolName) names.add(instance.poolName);
		}
		return Array.from(names).sort();
	}

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
		const cacheKey = `projectPool:${projectId}:${category}`;

		const cached = await this.cacheService.get<string>(cacheKey);
		if (cached !== undefined) return cached || undefined;

		const poolName = await this.projectPoolSettingsRepository.getPoolForCategory(
			projectId,
			category,
		);

		void this.cacheService.set(cacheKey, poolName ?? '');
		return poolName;
	}

	async getProjectPoolSettings(projectId: string): Promise<ProjectPoolSettingsResponse> {
		const [stored, availablePools, instanceDefaults] = await Promise.all([
			this.getStoredProjectPoolSettings(projectId),
			this.getAvailablePoolsFromCluster(),
			this.getPoolAssignment(),
		]);

		return {
			...stored,
			availablePools,
			instanceDefaults,
		};
	}

	private async getStoredProjectPoolSettings(
		projectId: string,
	): Promise<{ assignment: PoolAssignment; allowedPools: string[] }> {
		const cacheKey = `projectPoolSettings:${projectId}`;

		const cached = await this.cacheService.get<string>(cacheKey);
		if (cached !== undefined) {
			return jsonParse<{ assignment: PoolAssignment; allowedPools: string[] }>(cached, {
				fallbackValue: { assignment: {}, allowedPools: [] },
			});
		}

		const settings = await this.projectPoolSettingsRepository.getSettings(projectId);
		const result = settings ?? { assignment: {}, allowedPools: [] };

		void this.cacheService.set(cacheKey, JSON.stringify(result));
		return result;
	}

	async setProjectPoolSettings(
		projectId: string,
		patch: UpdateProjectPoolSettingsDto,
	): Promise<ProjectPoolSettingsResponse> {
		const current = await this.getStoredProjectPoolSettings(projectId);

		const nextAssignment: PoolAssignment = { ...current.assignment };
		if (patch.assignment) {
			for (const [category, pool] of Object.entries(patch.assignment) as Array<
				[ExecutionCategory, string | undefined]
			>) {
				if (pool === undefined || pool === '') {
					delete nextAssignment[category];
				} else {
					nextAssignment[category] = pool;
				}
			}
		}

		const nextAllowedPools = patch.allowedPools ?? current.allowedPools;

		// `allowedPools` is an optional allowlist that restricts which pools workflows in this
		// project may route to. An empty list means "no restriction" — any pool can be used.
		// We only enforce coherence between defaults and allowedPools when the allowlist is in use.
		if (nextAllowedPools.length > 0) {
			for (const category of EXECUTION_CATEGORIES) {
				const pool = nextAssignment[category];
				if (pool && !nextAllowedPools.includes(pool)) {
					throw new BadRequestError(`${category} pool "${pool}" must be one of allowedPools`);
				}
			}
		}

		await this.projectPoolSettingsRepository.setSettings(projectId, {
			assignment: nextAssignment,
			allowedPools: nextAllowedPools,
		});
		await this.invalidateProjectCaches(projectId);

		const [availablePools, instanceDefaults] = await Promise.all([
			this.getAvailablePoolsFromCluster(),
			this.getPoolAssignment(),
		]);

		return {
			assignment: nextAssignment,
			allowedPools: nextAllowedPools,
			availablePools,
			instanceDefaults,
		};
	}

	private async invalidateProjectCaches(projectId: string): Promise<void> {
		const keys = [
			`projectPoolSettings:${projectId}`,
			...EXECUTION_CATEGORIES.map((category) => `projectPool:${projectId}:${category}`),
		];
		await this.cacheService.deleteMany(keys);
	}
}
