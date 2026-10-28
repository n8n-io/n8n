import { Logger } from '@n8n/backend-common';
import { DbLock, DbLockService, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ConflictError, NotFoundError, UnexpectedError } from '@n8n/errors';

import type { AppArtifact, AppArtifactRef } from './app-artifact.entity';
import { AppArtifactRepository } from './app-artifact.repository';
import { appStorageLockSubKey } from './app-storage-lock';
import { AppsConfig } from '../apps.config';
import { AppBlobStore } from './app-blob-store';

const UPLOAD_LIFETIME_MS = 30 * 60 * 1000; // 30 minutes

@Service()
export class AppArtifactService {
	constructor(
		private readonly repository: AppArtifactRepository,
		private readonly blobs: AppBlobStore,
		private readonly config: AppsConfig,
		private readonly locks: DbLockService,
		private readonly logger: Logger,
	) {}

	async upload(appId: string, body: Buffer): Promise<AppArtifact> {
		if (body.length > this.config.maxArtifactSizeBytes) {
			throw new BadRequestError(
				'App artifact exceeds the compressed size limit. Reduce its size or increase the artifact limit.',
			);
		}
		const artifact = await this.locks.withLockContext(DbLock.APPS_STORAGE, async (ctx) => {
			if ((await this.repository.totalSize(ctx)) + body.length > this.config.maxStorageBytes) {
				throw new BadRequestError(
					'App artifact storage limit reached. Free storage space or increase the app storage limit.',
				);
			}
			return await this.repository.reserve(appId, this.blobs.newBlob(), body.length, ctx);
		});
		try {
			await this.blobs.write(artifact, body);
			if (artifact.createdAt.getTime() < Date.now() - UPLOAD_LIFETIME_MS)
				throw new ConflictError('App artifact upload expired. Save the artifact again.');
			this.logger.debug('Uploaded app artifact bytes.', {
				appId,
				artifactId: artifact.id,
				storedAt: artifact.storedAt,
				sizeBytes: body.length,
			});
			return artifact;
		} catch (error) {
			await this.deleteUnused(artifact, true);
			throw error;
		}
	}

	async completeUpload(ref: AppArtifactRef, ctx: OperationContext): Promise<void> {
		if (
			!(await this.repository.completeUpload(ref, new Date(Date.now() - UPLOAD_LIFETIME_MS), ctx))
		) {
			throw new ConflictError(
				'App artifact upload expired or was already completed. Save the artifact again.',
			);
		}
	}

	async read(id: number): Promise<Buffer> {
		const artifact = await this.repository.findArtifact(id);
		if (!artifact || artifact.uploadStatus !== 'completed')
			throw new NotFoundError('App artifact not found.');
		if (artifact.sizeBytes > this.config.maxArtifactSizeBytes)
			throw new BadRequestError('App artifact exceeds the compressed size limit.');
		const body = await this.blobs.read(artifact);
		if (!body) throw new NotFoundError('App artifact content not found.');
		if (body.length !== artifact.sizeBytes)
			throw new UnexpectedError('App artifact size does not match its record.');
		return body;
	}

	/** Call only after the write has settled and the caller has abandoned attachment. */
	async discard(artifact: AppArtifact): Promise<void> {
		await this.deleteUnused(artifact, true);
	}

	async cleanup(signal?: AbortSignal): Promise<void> {
		const pendingBefore = new Date(Date.now() - UPLOAD_LIFETIME_MS);
		let afterId = 0;
		while (true) {
			signal?.throwIfAborted();
			const artifacts = await this.repository.findUnused(pendingBefore, afterId);
			if (!artifacts.length) return;
			for (const artifact of artifacts) {
				signal?.throwIfAborted();
				await this.deleteUnused(artifact);
			}
			afterId = artifacts[artifacts.length - 1].id;
		}
	}

	private async deleteUnused(ref: AppArtifact, writeSettled = false): Promise<void> {
		try {
			const artifact = await this.locks.withLockContext(
				DbLock.APPS_STORAGE,
				async (ctx) => {
					const row = await this.repository.findArtifact(ref.id, ctx);
					// SQLite can reuse the ID after cleanup removes the original record.
					if (!row || row.storageKey !== ref.storageKey || row.appId !== ref.appId)
						return writeSettled ? ref : null;
					if (await this.repository.isReferenced(ref.id, ctx)) return null;
					if (
						!writeSettled &&
						row.uploadStatus === 'pending' &&
						row.createdAt.getTime() >= Date.now() - UPLOAD_LIFETIME_MS
					)
						return null;
					return row;
				},
				{ subKey: appStorageLockSubKey(ref.appId) },
			);
			if (!artifact) return;
			await this.blobs.delete(artifact);
			await this.locks.withLockContext(
				DbLock.APPS_STORAGE,
				async (ctx) => {
					await this.repository.removeUnused(ref, ctx);
				},
				{ subKey: appStorageLockSubKey(ref.appId) },
			);
			this.logger.debug('Deleted unused app artifact.', {
				appId: ref.appId,
				artifactId: ref.id,
				storedAt: artifact.storedAt,
				sizeBytes: artifact.sizeBytes,
			});
		} catch (error) {
			this.logger.warn('Could not delete an unused app artifact.', { artifactId: ref.id, error });
		}
	}
}
