import { Service } from '@n8n/di';
import { DataSource, In, Like, Repository } from '@n8n/typeorm';

import { Settings } from '../entities';

@Service()
export class SettingsRepository extends Repository<Settings> {
	constructor(dataSource: DataSource) {
		super(Settings, dataSource.manager);
	}

	async findByKey(key: string): Promise<Settings | null> {
		return await this.findOneBy({ key });
	}
	async findByKeys(keys: string[]): Promise<Settings[]> {
		return await this.findBy({ key: In(keys) });
	}

	async findByKeyPrefix(prefix: string): Promise<Settings[]> {
		return await this.findBy({ key: Like(`${prefix}%`) });
	}
}
