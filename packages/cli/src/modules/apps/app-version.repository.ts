import { Service } from '@n8n/di';
import { DataSource, In, IsNull, Not, Repository } from '@n8n/typeorm';

import { AppVersion } from './app-version.entity';

@Service()
export class AppVersionRepository extends Repository<AppVersion> {
	constructor(dataSource: DataSource) {
		super(AppVersion, dataSource.manager);
	}

	async insertVersion(
		version: Pick<AppVersion, 'id' | 'appId' | 'storedAt' | 'sourceStorageKey' | 'distStorageKey'>,
	) {
		return await this.save(this.create(version));
	}

	async findById(id: string) {
		return await this.findOneBy({ id });
	}

	/** Newest first. */
	async listByAppId(appId: string) {
		return await this.find({ where: { appId }, order: { createdAt: 'DESC', id: 'DESC' } });
	}

	/** Versions that still have a dist beyond the newest `keep`, never the active one. */
	async findDistPrunable(appId: string, keep: number, activeVersionId: string | null) {
		const withDist = await this.find({
			where: { appId, distStorageKey: Not(IsNull()) },
			order: { createdAt: 'DESC', id: 'DESC' },
		});
		return withDist.slice(keep).filter((version) => version.id !== activeVersionId);
	}

	async clearDist(ids: string[]) {
		if (ids.length === 0) return;
		await this.update({ id: In(ids) }, { distStorageKey: null });
	}

	async deleteByAppId(appId: string) {
		await this.delete({ appId });
	}
}
