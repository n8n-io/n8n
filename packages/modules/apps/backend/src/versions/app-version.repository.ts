import {
	BaseRepository,
	chunkIds,
	isUniqueConstraintError,
	TransactionRunner,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError } from '@n8n/errors';
import { DataSource, In, IsNull, LessThan } from '@n8n/typeorm';

import type { AppBuildAttempt } from '../build/app-build.types';
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

	async hasRunningBuild(appId: string, ctx: OperationContext): Promise<boolean> {
		return await this.managerFor(ctx).existsBy(AppVersion, { appId, buildStatus: 'running' });
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
		attemptNumber: number,
		ctx: OperationContext,
	): Promise<boolean> {
		const result = await this.managerFor(ctx).update(
			AppVersion,
			{
				id: versionId,
				bundleArtifactId: IsNull(),
				buildStatus: 'running',
				buildAttempts: attemptNumber,
			},
			{ bundleArtifactId: artifactId, buildStatus: 'succeeded', buildStatusUpdatedAt: new Date() },
		);
		return result.affected === 1;
	}

	async claimBuild(
		appId: string,
		versionId: string,
		expected: 'queued' | 'failed' | number,
		ctx: OperationContext,
	): Promise<AppBuildAttempt | null> {
		const manager = this.managerFor(ctx);
		const status = typeof expected === 'number' ? 'running' : expected;
		const version = await manager.findOneBy(AppVersion, {
			id: versionId,
			appId,
			buildStatus: status,
		});
		if (!version || version.bundleArtifactId !== null) return null;
		if (typeof expected === 'number' && version.buildAttempts !== expected) return null;
		const attempt = {
			attemptNumber: version.buildAttempts + 1,
			startedAt: new Date(),
		};
		const result = await manager.update(
			AppVersion,
			{
				id: versionId,
				appId,
				buildStatus: status,
				buildAttempts: version.buildAttempts,
			},
			{
				buildStatus: 'running',
				buildAttempts: attempt.attemptNumber,
				buildStatusUpdatedAt: attempt.startedAt,
			},
		);
		return result.affected === 1 ? attempt : null;
	}

	async failBuild(
		versionId: string,
		attemptNumber: number,
		ctx: OperationContext,
	): Promise<AppVersion | null> {
		const manager = this.managerFor(ctx);
		const result = await manager.update(
			AppVersion,
			{
				id: versionId,
				buildStatus: 'running',
				buildAttempts: attemptNumber,
			},
			{ buildStatus: 'failed', buildStatusUpdatedAt: new Date() },
		);
		return result.affected === 1 ? await manager.findOneBy(AppVersion, { id: versionId }) : null;
	}

	async failInterruptedBuilds(queuedBefore: Date, runningBefore: Date): Promise<void> {
		const manager = this.managerFor({});
		await manager.update(
			AppVersion,
			{ buildStatus: 'queued', createdAt: LessThan(queuedBefore) },
			{ buildStatus: 'failed', buildStatusUpdatedAt: new Date() },
		);
		await manager.update(
			AppVersion,
			{ buildStatus: 'running', buildStatusUpdatedAt: LessThan(runningBefore) },
			{ buildStatus: 'failed', buildStatusUpdatedAt: new Date() },
		);
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
