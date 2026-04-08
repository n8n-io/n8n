import { Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { DataSource, In, Like, Repository } from '@n8n/typeorm';

import { Settings } from '../entities';

@Service()
export class SettingsRepository extends Repository<Settings> {
	constructor(dataSource: DataSource) {
		super(Settings, dataSource.manager);
	}

	async findByKey(key: string, em?: EntityManager): Promise<Settings | null> {
		const manager = em ?? this.manager;
		return await manager.findOneBy(Settings, { key });
	}
	async findByKeys(keys: string[]): Promise<Settings[]> {
		return await this.findBy({ key: In(keys) });
	}

	async findByKeyPrefix(prefix: string): Promise<Settings[]> {
		return await this.findBy({ key: Like(`${prefix}%`) });
	}
}
