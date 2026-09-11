import { Service } from '@n8n/di';
import { DataSource, In, IsNull, MoreThanOrEqual, Not, Repository } from '@n8n/typeorm';

import { AppVersion } from './app-version.entity';

@Service()
export class AppVersionRepository extends Repository<AppVersion> {
	constructor(dataSource: DataSource) {
		super(AppVersion, dataSource.manager);
	}

	async insertVersion(
		version: Pick<
			AppVersion,
			| 'id'
			| 'appId'
			| 'storedAt'
			| 'sourceStorageKey'
			| 'distStorageKey'
			| 'sourceSizeBytes'
			| 'distSizeBytes'
		> &
			Partial<Pick<AppVersion, 'label'>>,
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

	/** Unlabeled versions of an app created at or after `since`. */
	async findUnlabeledSince(appId: string, since: Date) {
		return await this.find({
			where: { appId, label: IsNull(), createdAt: MoreThanOrEqual(since) },
		});
	}

	async setLabel(ids: string[], label: string) {
		if (ids.length === 0) return;
		await this.update({ id: In(ids) }, { label });
	}

	async countByAppId(appId: string): Promise<number> {
		return await this.countBy({ appId });
	}

	/** Sum of source+dist bytes across every version of every app in a project. */
	async sumSizeByProjectId(projectId: string): Promise<number> {
		const row = await this.createQueryBuilder('v')
			.innerJoin('v.app', 'app')
			.select('COALESCE(SUM(v.sourceSizeBytes), 0) + COALESCE(SUM(v.distSizeBytes), 0)', 'total')
			.where('app.projectId = :projectId', { projectId })
			.getRawOne<{ total: string | null }>();
		return Number(row?.total ?? 0);
	}

	/** Versions that still have a dist beyond the newest `keep`, never the active one. */
	async findDistPrunable(appId: string, keep: number, activeVersionId: string | null) {
		const withDist = await this.find({
			where: { appId, distStorageKey: Not(IsNull()) },
			order: { createdAt: 'DESC', id: 'DESC' },
		});
		return withDist.slice(keep).filter((version) => version.id !== activeVersionId);
	}

	/** Source-only versions beyond the newest `keep`, never the active one. */
	async findSourceOnlyPrunable(appId: string, keep: number, activeVersionId: string | null) {
		const sourceOnly = await this.find({
			where: { appId, distStorageKey: IsNull() },
			order: { createdAt: 'DESC', id: 'DESC' },
		});
		return sourceOnly.slice(keep).filter((version) => version.id !== activeVersionId);
	}

	async clearDist(ids: string[]) {
		if (ids.length === 0) return;
		await this.update({ id: In(ids) }, { distStorageKey: null, distSizeBytes: null });
	}

	async deleteByIds(ids: string[]) {
		if (ids.length === 0) return;
		await this.delete({ id: In(ids) });
	}

	async deleteByAppId(appId: string) {
		await this.delete({ appId });
	}
}
