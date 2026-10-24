import { BaseRepository, BinaryDataFile, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError } from '@n8n/errors';
import { DataSource, MoreThanOrEqual } from '@n8n/typeorm';

import { AppArtifact, type AppArtifactRef } from './app-artifact.entity';
import { AppVersion } from '../versions/app-version.entity';
import type { AppBlob } from './app-blob-store';

@Service()
export class AppArtifactRepository extends BaseRepository<AppArtifact> {
	constructor(dataSource: DataSource, txRunner: TransactionRunner) {
		super(AppArtifact, dataSource.manager, txRunner);
	}

	async reserve(
		appId: string,
		blob: AppBlob,
		sizeBytes: number,
		ctx: OperationContext,
	): Promise<AppArtifact> {
		return await this.managerFor(ctx).save(AppArtifact, {
			...blob,
			appId,
			sizeBytes,
			uploadStatus: 'pending',
		});
	}

	async totalSize(ctx: OperationContext): Promise<number> {
		return (await this.managerFor(ctx).sum(AppArtifact, 'sizeBytes')) ?? 0;
	}

	async findArtifact(id: number, ctx: OperationContext = {}): Promise<AppArtifact | null> {
		return await this.managerFor(ctx).findOneBy(AppArtifact, { id });
	}

	async completeUpload(
		ref: AppArtifactRef,
		oldestAllowed: Date,
		ctx: OperationContext,
	): Promise<boolean> {
		const result = await this.managerFor(ctx).update(
			AppArtifact,
			{
				id: ref.id,
				appId: ref.appId,
				storageKey: ref.storageKey,
				uploadStatus: 'pending',
				createdAt: MoreThanOrEqual(oldestAllowed),
			},
			{ uploadStatus: 'completed' },
		);
		return result.affected === 1;
	}

	async isReferenced(id: number, ctx: OperationContext): Promise<boolean> {
		return await this.managerFor(ctx).exists(AppVersion, {
			where: [{ sourceArtifactId: id }, { bundleArtifactId: id }],
		});
	}

	async storeDatabaseContent(
		ref: AppArtifactRef,
		body: Buffer,
		ctx: OperationContext,
	): Promise<void> {
		const manager = this.managerFor(ctx);
		const artifact = await manager.findOneBy(AppArtifact, {
			id: ref.id,
			appId: ref.appId,
			storageKey: ref.storageKey,
			storedAt: 'db',
			uploadStatus: 'pending',
		});
		if (!artifact) throw new ConflictError('App artifact upload expired. Save the artifact again.');
		await manager.insert(BinaryDataFile, {
			fileId: artifact.storageKey,
			sourceType: 'app_artifact',
			sourceId: String(artifact.id),
			data: body,
			fileSize: body.length,
			mimeType: 'application/gzip',
			fileName: 'artifact.tgz',
		});
	}

	async findUnused(pendingBefore: Date, afterId: number): Promise<AppArtifact[]> {
		const query = this.createQueryBuilder('artifact');
		const references = query
			.subQuery()
			.select('1')
			.from(AppVersion, 'version')
			.where('version.sourceArtifactId = artifact.id OR version.bundleArtifactId = artifact.id');
		return await query
			.where(`NOT EXISTS ${references.getQuery()}`)
			.andWhere('artifact.id > :afterId', { afterId })
			.andWhere('(artifact.uploadStatus = :completed OR artifact.createdAt < :pendingBefore)', {
				completed: 'completed',
				pendingBefore,
			})
			.orderBy('artifact.id', 'ASC')
			.take(100)
			.getMany();
	}

	async removeUnused(ref: AppArtifactRef, ctx: OperationContext): Promise<void> {
		await this.managerFor(ctx).delete(AppArtifact, {
			id: ref.id,
			appId: ref.appId,
			storageKey: ref.storageKey,
		});
	}
}
