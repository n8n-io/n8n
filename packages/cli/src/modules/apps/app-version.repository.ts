import type { AppVersionSnapshot } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { AppVersion } from './app-version.entity';

@Service()
export class AppVersionRepository extends Repository<AppVersion> {
	constructor(dataSource: DataSource) {
		super(AppVersion, dataSource.manager);
	}

	async createFromSnapshot(
		appId: string,
		snapshot: AppVersionSnapshot,
		createdById: string | null,
	) {
		const version = this.create({ appId, snapshot, createdById });
		return await this.save(version);
	}

	async findSnapshot(id: string) {
		return await this.findOneBy({ id });
	}

	/** Newest first. */
	async findManyByAppId(appId: string, limit: number) {
		return await this.find({ where: { appId }, order: { createdAt: 'DESC' }, take: limit });
	}
}
