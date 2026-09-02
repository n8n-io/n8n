import { Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { DataSource, In, Like } from '@n8n/typeorm';

import { Settings } from '../entities';
import { BaseRepository } from './base-repository';
import type { OperationContext } from '../services/transaction';

@Service()
export class SettingsRepository extends BaseRepository<Settings> {
	constructor(dataSource: DataSource) {
		super(Settings, dataSource.manager);
	}

	async findByKey(key: string, em?: EntityManager): Promise<Settings | null> {
		const manager = em ?? this.manager;
		return await manager.findOneBy(Settings, { key });
	}

	async findByKeyInContext(key: string, ctx: OperationContext): Promise<Settings | null> {
		return await this.managerFor(ctx).findOneBy(Settings, { key });
	}

	async upsertByKey(
		key: string,
		value: string,
		loadOnStartup: boolean,
		ctx: OperationContext,
	): Promise<void> {
		await this.managerFor(ctx).upsert(Settings, { key, value, loadOnStartup }, ['key']);
	}

	async findByKeys(keys: string[]): Promise<Settings[]> {
		return await this.findBy({ key: In(keys) });
	}

	async findByKeyPrefix(prefix: string): Promise<Settings[]> {
		return await this.findBy({ key: Like(`${prefix}%`) });
	}
}
