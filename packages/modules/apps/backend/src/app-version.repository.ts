import {
	BaseRepository,
	chunkIds,
	isUniqueConstraintError,
	TransactionRunner,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError } from '@n8n/errors';
import { DataSource, In, IsNull } from '@n8n/typeorm';

import { AppVersion } from './app-version.entity';

@Service()
export class AppVersionRepository extends BaseRepository<AppVersion> {
	constructor(dataSource: DataSource, txRunner: TransactionRunner) {
		super(AppVersion, dataSource.manager, txRunner);
	}

	async insertVersion(
		data: Pick<AppVersion, 'id' | 'appId' | 'sourceArtifactId' | 'label'>,
		ctx: OperationContext,
	): Promise<void> {
		try {
			await this.managerFor(ctx).insert(AppVersion, {
				...data,
				bundleArtifactId: null,
				buildStatus: 'queued',
			});
		} catch (error) {
			if (isUniqueConstraintError(error)) {
				throw new ConflictError('App version already exists. Save the source as a new version.');
			}
			throw error;
		}
	}

	async findVersionById(versionId: string, ctx: OperationContext = {}): Promise<AppVersion | null> {
		return await this.managerFor(ctx).findOneBy(AppVersion, { id: versionId });
	}

	async listForApp(appId: string, ctx: OperationContext = {}): Promise<AppVersion[]> {
		return await this.managerFor(ctx).find(AppVersion, {
			where: { appId },
			order: { createdAt: 'DESC', id: 'DESC' },
		});
	}

	async listForRetention(appId: string, ctx: OperationContext) {
		const versions = await this.managerFor(ctx).find(AppVersion, {
			select: { id: true, buildStatus: true, bundleArtifactId: true },
			where: { appId },
			order: { createdAt: 'DESC', id: 'DESC' },
		});
		return versions.map(({ id, buildStatus, bundleArtifactId }) => ({
			id,
			buildStatus,
			hasBundle: bundleArtifactId !== null,
		}));
	}

	async attachBundle(
		versionId: string,
		artifactId: number,
		ctx: OperationContext,
	): Promise<boolean> {
		const result = await this.managerFor(ctx).update(
			AppVersion,
			{
				id: versionId,
				bundleArtifactId: IsNull(),
				buildStatus: In(['queued', 'running']),
			},
			{ bundleArtifactId: artifactId, buildStatus: 'succeeded' },
		);
		return result.affected === 1;
	}

	async setLabel(
		versionId: string,
		label: string | null,
		ctx: OperationContext = {},
	): Promise<AppVersion | null> {
		return await this.runInTransaction(ctx, async (manager) => {
			const where = { id: versionId };
			const result = await manager.update(AppVersion, where, { label });
			if (!result.affected) return null;
			return await manager.findOneBy(AppVersion, where);
		});
	}

	async clearBundles(versionIds: string[], ctx: OperationContext): Promise<void> {
		for (const ids of chunkIds(versionIds)) {
			await this.managerFor(ctx).update(AppVersion, { id: In(ids) }, { bundleArtifactId: null });
		}
	}

	async removeVersions(versionIds: string[], ctx: OperationContext): Promise<void> {
		for (const ids of chunkIds(versionIds))
			await this.managerFor(ctx).delete(AppVersion, { id: In(ids) });
	}
}
