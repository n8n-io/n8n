import { Logger } from '@n8n/backend-common';
import { ProjectFilesConfig } from '@n8n/config';
import { ProjectRepository, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { sanitizeFilename } from '@n8n/utils/files/sanitize-filename';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { BinaryDataService, FileLocation } from 'n8n-core';
import { OperationalError, UserError, type IBinaryData } from 'n8n-workflow';
import type { Readable } from 'node:stream';

import { ProjectFileConcurrentModificationError } from './errors/project-file-concurrent-modification.error';
import { ProjectFileNameConflictError } from './errors/project-file-name-conflict.error';
import { ProjectFileNotFoundError } from './errors/project-file-not-found.error';
import { ProjectFileQuotaExceededError } from './errors/project-file-quota-exceeded.error';
import { ProjectFileTooLargeError } from './errors/project-file-too-large.error';
import type { ProjectFile } from './project-file.entity';
import { ProjectFileRepository } from './project-file.repository';
import type {
	ProjectFileActor,
	ProjectFileListOptions,
	ProjectFileQuotaScope,
	ProjectFileSource,
	ProjectFileUsage,
} from './project-files.types';

type IncomingFile = {
	name: string;
	mimeType: string;
	/** Declared size, used for a cheap pre-flight rejection before any bytes are written. */
	sizeBytes: number;
	source: ProjectFileSource;
};

type StoredBlob = { binaryDataId: string; fileSizeBytes: number };

export type StoreResult = {
	file: ProjectFile;
	/** True when this replaced the content of an existing file of the same name. */
	overwritten: boolean;
	/** Which project owns the file — determines the budget the bytes were charged to. */
	projectType: 'personal' | 'team';
};

@Service()
export class ProjectFileService {
	constructor(
		private readonly repository: ProjectFileRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly binaryDataService: BinaryDataService,
		private readonly transactionRunner: TransactionRunner,
		private readonly config: ProjectFilesConfig,
		private readonly logger: Logger,
	) {}

	async list(projectId: string, options: ProjectFileListOptions = {}) {
		const [data, count] = await this.repository.findManyByProjectId(projectId, options, {});

		return { count, data };
	}

	async getUsage(projectId: string): Promise<ProjectFileUsage> {
		const scope = await this.quotaScope(projectId);

		return {
			scope,
			usedBytes: await this.usedBytes(scope, projectId),
			quotaBytes: this.quotaBytes(scope),
		};
	}

	/**
	 * Stores a file's bytes through `BinaryDataService` and records the metadata row.
	 *
	 * Ordering is deliberate throughout: bytes are written before any row is
	 * written or updated, so a failure at any point leaves an unreferenced blob
	 * rather than a row pointing at bytes that do not exist.
	 */
	async store(
		projectId: string,
		actor: ProjectFileActor,
		file: IncomingFile,
		{ overwrite = false }: { overwrite?: boolean } = {},
	): Promise<StoreResult> {
		const name = this.toStoredName(file.name);
		const projectType = await this.projectType(projectId);

		this.assertWithinFileSizeLimit(file.sizeBytes);
		await this.assertWithinQuota(projectType, projectId, file.sizeBytes);

		const existing = await this.repository.findByProjectIdAndName(projectId, name, {});
		if (existing && !overwrite) throw new ProjectFileNameConflictError(name);

		// Reuse the row's id when overwriting so the blob path stays attributable to
		// one logical file across replacements.
		const fileId = existing?.id ?? generateNanoId();
		const blob = await this.writeBlob(projectId, fileId, name, file);

		const stored = existing
			? await this.replaceContent(existing, file.mimeType, blob, actor)
			: await this.insertNew({ fileId, projectId, name, mimeType: file.mimeType, blob, actor });

		return { file: stored, overwritten: existing !== null, projectType };
	}

	async rename(
		projectId: string,
		fileId: string,
		newName: string,
		actor: ProjectFileActor,
	): Promise<ProjectFile> {
		const file = await this.getOrFail(projectId, fileId);
		const name = this.toStoredName(newName);

		if (name === file.name) return file;

		const conflict = await this.repository.findByProjectIdAndName(projectId, name, {});
		if (conflict) throw new ProjectFileNameConflictError(name);

		// Metadata only — the blob key is a uuid, so the stored bytes are untouched.
		await this.repository.renameFile(fileId, name, actor, {});

		return await this.getOrFail(projectId, fileId);
	}

	async getAsStream(
		projectId: string,
		fileId: string,
	): Promise<{ file: ProjectFile; stream: Readable }> {
		const file = await this.getOrFail(projectId, fileId);
		const stream = await this.binaryDataService.getAsStream(file.binaryDataId);

		return { file, stream };
	}

	/**
	 * Deletes the row first, then the bytes. Blob deletion cannot join the
	 * transaction, so this ordering trades a possible unreferenced blob for never
	 * leaving a row that points at deleted bytes.
	 */
	async delete(projectId: string, fileId: string): Promise<void> {
		const file = await this.getOrFail(projectId, fileId);

		await this.transactionRunner.run({}, async (ctx) => {
			await this.repository.deleteFileById(fileId, ctx);
		});

		await this.deleteBlobs([file.binaryDataId]);
	}

	/** Removes every file of a project, including its bytes. */
	async deleteAllByProjectId(projectId: string): Promise<void> {
		const refs = await this.repository.findAllRefsByProjectId(projectId, {});

		await this.transactionRunner.run({}, async (ctx) => {
			await this.repository.deleteAllByProjectId(projectId, ctx);
		});

		await this.deleteBlobs(refs);
	}

	// ----------------------------------
	//         private methods
	// ----------------------------------

	private async getOrFail(projectId: string, fileId: string): Promise<ProjectFile> {
		const file = await this.repository.findByIdInProject(fileId, projectId, {});
		if (!file) throw new ProjectFileNotFoundError(fileId);

		return file;
	}

	/**
	 * Checked before sanitizing: `sanitizeFilename` falls back to 'untitled' for an
	 * empty input, which would silently rename the file instead of rejecting it.
	 */
	private toStoredName(name: string): string {
		const trimmed = name.trim();

		if (!trimmed) throw new UserError('File name is empty', { level: 'warning' });

		return sanitizeFilename(trimmed);
	}

	private async writeBlob(
		projectId: string,
		fileId: string,
		name: string,
		file: IncomingFile,
	): Promise<StoredBlob> {
		const location = FileLocation.ofCustom({
			pathSegments: ['projects', projectId, 'files'],
			sourceType: 'project_file',
			sourceId: fileId,
		});

		const binaryData: IBinaryData = {
			data: '',
			mimeType: file.mimeType,
			fileName: name,
			fileExtension: name.includes('.') ? name.split('.').pop() : undefined,
		};

		const stored =
			file.source.type === 'path'
				? // Takes a path and streams internally, so a large file never lands in memory.
					await this.binaryDataService.copyBinaryFile(location, binaryData, file.source.path)
				: await this.binaryDataService.store(
						location,
						// `store` accepts either, so a stream is passed straight through
						// instead of being buffered first.
						file.source.type === 'stream' ? file.source.stream : file.source.buffer,
						binaryData,
					);

		if (!stored.id) {
			// The in-memory `default` binary mode returns the bytes inline and no id,
			// so there is nothing durable to reference.
			throw new OperationalError('Project files require a persisted binary data storage mode');
		}

		const blob = { binaryDataId: stored.id, fileSizeBytes: stored.bytes ?? file.sizeBytes };

		// The declared size drove the pre-flight checks; this is the authoritative one.
		if (blob.fileSizeBytes > this.config.maxFileSize) {
			await this.deleteBlobs([blob.binaryDataId]);
			throw new ProjectFileTooLargeError(blob.fileSizeBytes, this.config.maxFileSize);
		}

		return blob;
	}

	private async insertNew({
		fileId,
		projectId,
		name,
		mimeType,
		blob,
		actor,
	}: {
		fileId: string;
		projectId: string;
		name: string;
		mimeType: string;
		blob: StoredBlob;
		actor: ProjectFileActor;
	}): Promise<ProjectFile> {
		try {
			await this.repository.insertFile(
				{ id: fileId, projectId, name, mimeType, actor, ...blob },
				{},
			);
		} catch (error) {
			// Nothing references these bytes, so drop them instead of leaking a blob.
			await this.deleteBlobs([blob.binaryDataId]);
			throw error;
		}

		return await this.getOrFail(projectId, fileId);
	}

	/**
	 * Swaps in new content only if the row still references the bytes we read.
	 * Whichever concurrent writer loses deletes its own blob, so no interleaving
	 * leaves an orphan or a row pointing at deleted bytes.
	 */
	private async replaceContent(
		existing: ProjectFile,
		mimeType: string,
		blob: StoredBlob,
		actor: ProjectFileActor,
	): Promise<ProjectFile> {
		const affected = await this.repository.updateBinaryRefIfUnchanged(
			existing.id,
			existing.binaryDataId,
			{ ...blob, mimeType, actor },
			{},
		);

		const won = affected > 0;
		await this.deleteBlobs([won ? existing.binaryDataId : blob.binaryDataId]);

		if (!won) throw new ProjectFileConcurrentModificationError(existing.name);

		return await this.getOrFail(existing.projectId, existing.id);
	}

	private async deleteBlobs(binaryDataIds: string[]): Promise<void> {
		if (binaryDataIds.length === 0) return;

		try {
			// Always by id: prefix deletion is absent on S3/Azure and would silently
			// leak every file there.
			await this.binaryDataService.deleteManyByBinaryDataId(binaryDataIds);
		} catch (error) {
			// The row is already gone or already re-pointed; a failure here leaves
			// unreferenced bytes, which must not fail the caller's operation.
			this.logger.warn('Failed to delete project file bytes', { binaryDataIds, error });
		}
	}

	private assertWithinFileSizeLimit(sizeBytes: number): void {
		if (sizeBytes > this.config.maxFileSize) {
			throw new ProjectFileTooLargeError(sizeBytes, this.config.maxFileSize);
		}
	}

	private async assertWithinQuota(
		projectType: 'personal' | 'team',
		projectId: string,
		incomingBytes: number,
	): Promise<void> {
		const scope = this.toQuotaScope(projectType);
		const quotaBytes = this.quotaBytes(scope);
		const usedBytes = await this.usedBytes(scope, projectId);

		if (usedBytes + incomingBytes > quotaBytes) {
			throw new ProjectFileQuotaExceededError(scope, usedBytes, quotaBytes);
		}
	}

	private async projectType(projectId: string): Promise<'personal' | 'team'> {
		const project = await this.projectRepository.findOneBy({ id: projectId });
		if (!project) throw new ProjectFileNotFoundError(projectId);

		return project.type;
	}

	/** Personal projects share one instance-wide budget; team projects get their own. */
	private toQuotaScope(projectType: 'personal' | 'team'): ProjectFileQuotaScope {
		return projectType === 'personal' ? 'personal' : 'project';
	}

	private async quotaScope(projectId: string): Promise<ProjectFileQuotaScope> {
		return this.toQuotaScope(await this.projectType(projectId));
	}

	private quotaBytes(scope: ProjectFileQuotaScope): number {
		return scope === 'personal' ? this.config.personalTotalMaxSize : this.config.projectMaxSize;
	}

	private async usedBytes(scope: ProjectFileQuotaScope, projectId: string): Promise<number> {
		return scope === 'personal'
			? await this.repository.sumSizeAcrossPersonalProjects({})
			: await this.repository.sumSizeByProjectId(projectId, {});
	}
}
