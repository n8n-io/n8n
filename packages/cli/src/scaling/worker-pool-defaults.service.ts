import type {
	ExecutionPoolType,
	UpdateWorkerPoolDefaultsDto,
	WorkerPoolDefaults,
} from '@n8n/api-types';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';

const DEFAULT_POOL = 'default';

const SETTING_KEYS: Record<ExecutionPoolType, string> = {
	production: 'workers.defaultPool.production',
	manual: 'workers.defaultPool.manual',
	evaluation: 'workers.defaultPool.evaluation',
};

@Service()
export class WorkerPoolDefaultsService {
	constructor(private readonly settingsRepository: SettingsRepository) {}

	async getDefaults(): Promise<WorkerPoolDefaults> {
		const rows = await this.settingsRepository.findByKeys(Object.values(SETTING_KEYS));
		const valueByKey = new Map(rows.map((r) => [r.key, r.value]));

		return {
			production: valueByKey.get(SETTING_KEYS.production) ?? DEFAULT_POOL,
			manual: valueByKey.get(SETTING_KEYS.manual) ?? DEFAULT_POOL,
			evaluation: valueByKey.get(SETTING_KEYS.evaluation) ?? DEFAULT_POOL,
		};
	}

	async setDefaults(partial: UpdateWorkerPoolDefaultsDto): Promise<WorkerPoolDefaults> {
		for (const [executionType, pool] of Object.entries(partial) as Array<
			[ExecutionPoolType, string | undefined]
		>) {
			if (pool === undefined) continue;
			await this.settingsRepository.upsert(
				{ key: SETTING_KEYS[executionType], value: pool, loadOnStartup: true },
				['key'],
			);
		}

		return await this.getDefaults();
	}
}
