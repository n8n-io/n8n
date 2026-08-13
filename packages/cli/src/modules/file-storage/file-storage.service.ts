import type { ListProjectFilesQueryDto, ProjectFileConflictMode } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { generateNanoId } from '@n8n/db';
import { Service } from '@n8n/di';
import { createReadStream } from 'node:fs';
import { unlink } from 'node:fs/promises';
import type { Readable } from 'node:stream';

import { FileStorageValidationError } from './errors/file-storage-validation.error';
import { ProjectFileNameConflictError } from './errors/project-file-name-conflict.error';
import { ProjectFileNotFoundError } from './errors/project-file-not-found.error';
import { FileStorageSizeValidator } from './file-storage-size-validator.service';
import { ProjectFileStore, type StoredProjectFile } from './project-file-store';
import { ProjectFile } from './project-file.entity';
import { ProjectFileRepository } from './project-file.repository';
import { ProjectFilesSnapshotService } from './project-files-snapshot.service';
import type { FileStorageSizeResult } from './types';
import { formatBytes } from './utils/size-utils';

/** Quota-check surface, forwarded to telemetry on limit hits. */
export type WriteSurface = 'ui-upload' | 'node-write';

@Service()
export class ProjectFileService {
	constructor(
		private readonly repository: ProjectFileRepository,
		private readonly store: ProjectFileStore,
		private readonly sizeValidator: FileStorageSizeValidator,
		private readonly globalConfig: GlobalConfig,
		private readonly logger: Logger,
		private readonly snapshotService: ProjectFilesSnapshotService,
	) {
		this.logger = this.logger.scoped('file-storage');
	}

	async getManyAndCount(options: Partial<ListProjectFilesQueryDto>) {
		return await this.repository.getManyAndCount(options);
	}

	async getFileInProject(fileId: string, projectId: string): Promise<ProjectFile> {
		const file = await this.repository.findByIdInProject(fileId, projectId);
		if (!file) throw new ProjectFileNotFoundError(fileId);
		return file;
	}

	/**
	 * Lookup by id alone, for callers that authorize on the file's own project
	 * (the Public API's `:fileId` routes) rather than a projectId in the path.
	 */
	async getFileById(fileId: string): Promise<ProjectFile> {
		const file = await this.repository.findById(fileId);
		if (!file) throw new ProjectFileNotFoundError(fileId);
		return file;
	}

	async findByNameInProject(name: string, projectId: string): Promise<ProjectFile | null> {
		return await this.repository.findByNameInProject(name, projectId);
	}

	/** Streams a received multipart temp file into storage, then removes it. */
	async uploadFromPath(
		projectId: string,
		tempFilePath: string,
		meta: { name: string; mimeType: string },
		conflictMode: ProjectFileConflictMode,
		surface: WriteSurface = 'ui-upload',
	): Promise<ProjectFile> {
		try {
			return await this.upload(
				projectId,
				() => createReadStream(tempFilePath),
				meta,
				conflictMode,
				surface,
			);
		} finally {
			await unlink(tempFilePath).catch((error) => {
				this.logger.warn('Failed to remove upload temp file', { path: tempFilePath, error });
			});
		}
	}

	/**
	 * Writes new content under the project, resolving name conflicts per
	 * `conflictMode`: `error` rejects, `keepBoth` auto-suffixes (`report (1).csv`),
	 * `replace` swaps the existing row's content while keeping name, id, and
	 * every reference to it.
	 */
	async upload(
		projectId: string,
		body: Readable | Buffer | (() => Readable),
		meta: { name: string; mimeType: string },
		conflictMode: ProjectFileConflictMode,
		surface: WriteSurface = 'ui-upload',
	): Promise<ProjectFile> {
		await this.validateQuota(surface);

		const existing = await this.repository.findByNameInProject(meta.name, projectId);

		if (existing) {
			if (conflictMode === 'error') throw new ProjectFileNameConflictError(meta.name);

			if (conflictMode === 'replace') {
				return await this.replaceContent(existing, this.resolveBody(body), meta.mimeType, surface);
			}

			meta = { ...meta, name: await this.nextFreeName(meta.name, projectId) };
		}

		const fileId = generateNanoId();
		const stored = await this.store.write({ projectId, fileId }, this.resolveBody(body), {
			fileName: meta.name,
			mimeType: meta.mimeType,
		});
		await this.enforcePostWriteLimits(stored, surface);

		try {
			const file = await this.repository.insertFile({
				id: fileId,
				projectId,
				name: meta.name,
				storedAt: stored.storedAt,
				storageKey: stored.storageKey,
				mimeType: meta.mimeType,
				fileSizeBytes: stored.bytesWritten,
			} as ProjectFile);
			this.sizeValidator.reset();
			await this.invalidateSnapshot(projectId);
			return file;
		} catch (error) {
			// Key-first rollback: never leave bytes the row doesn't reference.
			await this.rollbackWrite(stored);
			// A concurrent upload can land the same name between the check and the
			// insert; surface it as the conflict it is.
			if (this.isUniqueConstraintViolation(error)) {
				throw new ProjectFileNameConflictError(meta.name);
			}
			throw error;
		}
	}

	/**
	 * Replaces a file's content atomically-by-swap: new bytes land under a fresh
	 * key, then a single row update repoints the reference. The old key stays
	 * readable for in-flight streams until the orphan sweeper reclaims it.
	 */
	async replaceContent(
		file: ProjectFile,
		body: Readable | Buffer,
		mimeType: string,
		surface: WriteSurface = 'ui-upload',
	): Promise<ProjectFile> {
		await this.validateQuota(surface);

		const stored = await this.store.write({ projectId: file.projectId, fileId: file.id }, body, {
			fileName: file.name,
			mimeType,
		});
		await this.enforcePostWriteLimits(stored, surface);

		await this.repository.swapStorageRef(file.id, {
			storedAt: stored.storedAt,
			storageKey: stored.storageKey,
			mimeType,
			fileSizeBytes: stored.bytesWritten,
		});
		this.sizeValidator.reset();
		await this.invalidateSnapshot(file.projectId);

		return {
			...file,
			storedAt: stored.storedAt,
			storageKey: stored.storageKey,
			mimeType,
			fileSizeBytes: stored.bytesWritten,
			updatedAt: new Date(),
		};
	}

	async replaceContentFromPath(
		fileId: string,
		projectId: string,
		tempFilePath: string,
		mimeType: string,
	): Promise<ProjectFile> {
		const file = await this.getFileInProject(fileId, projectId);
		try {
			return await this.replaceContent(file, createReadStream(tempFilePath), mimeType);
		} finally {
			await unlink(tempFilePath).catch((error) => {
				this.logger.warn('Failed to remove upload temp file', { path: tempFilePath, error });
			});
		}
	}

	/**
	 * Content stream for a file. A read racing a replace/delete can find the key
	 * gone (the row and the bytes are read in two steps); that surfaces as
	 * not-found and is safe to retry.
	 */
	async download(fileId: string, projectId: string) {
		const file = await this.getFileInProject(fileId, projectId);
		const stream = await this.store.readStream(file);
		if (stream === null) throw new ProjectFileNotFoundError(file.name);
		return { file, stream };
	}

	async renameFile(fileId: string, projectId: string, name: string): Promise<ProjectFile> {
		const file = await this.getFileInProject(fileId, projectId);
		if (file.name === name) return file;

		const existing = await this.repository.findByNameInProject(name, projectId);
		if (existing) throw new ProjectFileNameConflictError(name);

		await this.repository.renameFile(fileId, name);
		await this.invalidateSnapshot(projectId);
		return { ...file, name, updatedAt: new Date() };
	}

	/**
	 * Deletes rows only — the source of truth disappears first, and the orphan
	 * sweeper reclaims the unreferenced bytes after its grace period, so a read
	 * that raced the delete can still finish its stream.
	 */
	async deleteFiles(fileIds: string[], projectId: string): Promise<void> {
		await this.repository.deleteByIdsInProject(fileIds, projectId);
		this.sizeValidator.reset();
		await this.invalidateSnapshot(projectId);
	}

	async deleteFile(fileId: string, projectId: string): Promise<ProjectFile> {
		const file = await this.getFileInProject(fileId, projectId);
		await this.deleteFiles([fileId], projectId);
		return file;
	}

	/**
	 * Moves all file rows to the target project inside the caller's transaction.
	 * Bytes don't move — keys are opaque and persisted (they embed the old
	 * projectId, which is fine). Name collisions in the target auto-suffix.
	 */
	async transferAllToProject(
		fromProjectId: string,
		toProjectId: string,
		trx?: Parameters<ProjectFileRepository['transferAllToProject']>[2],
	): Promise<void> {
		await this.repository.transferAllToProject(fromProjectId, toProjectId, trx);
		// A caller-owned transaction may not have committed yet, so a racing
		// read can re-cache pre-transfer rows; the snapshot TTL bounds that.
		await this.invalidateSnapshot(fromProjectId);
		await this.invalidateSnapshot(toProjectId);
	}

	/**
	 * Project deletion: per-key byte deletion driven from the rows (never
	 * deletePrefix — s3/az don't support it), then the rows themselves.
	 */
	async deleteAllByProjectId(projectId: string): Promise<void> {
		const files = await this.repository.findAllByProjectId(projectId);
		if (files.length === 0) return;

		await this.store.delete(files);
		await this.repository.deleteByIdsInProject(
			files.map((file) => file.id),
			projectId,
		);
		this.sizeValidator.reset();
		await this.invalidateSnapshot(projectId);
	}

	async getFileStorageSize(): Promise<FileStorageSizeResult> {
		const sizeData = await this.sizeValidator.getCachedSizeData(
			async () => await this.repository.getTotalSizeBytes(),
		);

		return {
			totalBytes: sizeData.totalBytes,
			maxBytes: this.globalConfig.fileStorage.maxSize,
			quotaStatus: this.sizeValidator.sizeToState(sizeData.totalBytes),
		};
	}

	// private methods

	/**
	 * Drops the cached `$files` expression snapshot after a mutation.
	 * Best-effort: the short cache TTL is the backstop, so a failed
	 * invalidation must never fail the mutation that triggered it.
	 */
	private async invalidateSnapshot(projectId: string): Promise<void> {
		await this.snapshotService.invalidateSnapshot(projectId).catch((error) => {
			this.logger.warn('Failed to invalidate the project files snapshot cache', {
				projectId,
				error,
			});
		});
	}

	private async validateQuota(surface: WriteSurface): Promise<void> {
		await this.sizeValidator.validateSize(
			async () => await this.repository.getTotalSizeBytes(),
			surface,
		);
	}

	/**
	 * The actual size is only known after the stream has been consumed, so the
	 * per-file cap and the quota are re-checked post-write; violating writes are
	 * rolled back key-first.
	 */
	private async enforcePostWriteLimits(
		stored: StoredProjectFile & { bytesWritten: number },
		surface: WriteSurface,
	): Promise<void> {
		const { maxFileSize, maxSize } = this.globalConfig.fileStorage;

		if (stored.bytesWritten > maxFileSize) {
			await this.rollbackWrite(stored);
			throw new FileStorageValidationError(`Files must be ${formatBytes(maxFileSize)} or smaller`);
		}

		const { totalBytes } = await this.repository.getTotalSizeBytes();
		if (totalBytes + stored.bytesWritten > maxSize) {
			await this.rollbackWrite(stored);
			this.sizeValidator.reset();
			await this.validateQuota(surface); // throws the limit error with telemetry
			throw new FileStorageValidationError(
				`Storage limit exceeded. Limit: ${formatBytes(maxSize)}`,
			);
		}
	}

	private async rollbackWrite(stored: StoredProjectFile): Promise<void> {
		await this.store.delete([stored]).catch((error) => {
			// The orphan sweeper reclaims the key if this best-effort delete fails.
			this.logger.warn('Failed to roll back file-storage write', {
				storageKey: stored.storageKey,
				error,
			});
		});
	}

	private resolveBody(body: Readable | Buffer | (() => Readable)): Readable | Buffer {
		return typeof body === 'function' ? body() : body;
	}

	private async nextFreeName(name: string, projectId: string): Promise<string> {
		for (let i = 1; ; i++) {
			const candidate = this.repository.suffixedName(name, i);
			if (!(await this.repository.findByNameInProject(candidate, projectId))) return candidate;
		}
	}

	private isUniqueConstraintViolation(error: unknown): boolean {
		if (!(error instanceof Error)) return false;
		const message = `${error.message} ${String((error as { driverError?: { message?: string } }).driverError?.message ?? '')}`;
		return /unique|duplicate/i.test(message);
	}
}
