import type {
	KnowledgeCollectionFileDto,
	KnowledgeCollectionFileListResponse,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { isUniqueConstraintError, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { formatMbOrGb } from '@n8n/utils/number/bytes';

import type { KnowledgeFile } from '../entities';
import { KnowledgeFileStore } from '../files/knowledge-file-store';
import { KnowledgeFileService } from '../files/knowledge-file.service';
import { KnowledgeUploadError } from '../files/knowledge-upload.error';
import { cleanupUploadedTempFiles } from '../files/knowledge-upload.middleware';
import { toKnowledgeCollectionFileDto, toKnowledgeContentFileName } from '../files/storage-naming';
import { KnowledgeCollectionFileRepository } from '../repositories/knowledge-collection-file.repository';
import {
	KnowledgeCollectionService,
	type KnowledgeCollectionRef,
} from './knowledge-collection.service';

/** The largest value of the `int` column `knowledge_file.fileSizeBytes`. */
const MAX_FILE_SIZE_BYTES = 2_147_483_647;

/** Upload, listing and deletion of the files of a knowledge collection. */
@Service()
export class KnowledgeCollectionFileService {
	private readonly logger: Logger;

	constructor(
		private readonly collectionService: KnowledgeCollectionService,
		private readonly fileRepository: KnowledgeCollectionFileRepository,
		private readonly fileStore: KnowledgeFileStore,
		private readonly knowledgeFileService: KnowledgeFileService,
		logger: Logger,
	) {
		this.logger = logger.scoped('knowledge');
	}

	async listFiles({
		projectId,
		collectionId,
	}: KnowledgeCollectionRef): Promise<KnowledgeCollectionFileListResponse> {
		await this.collectionService.getInProject({ projectId, collectionId });

		const files = await this.fileRepository.findByCollectionId(collectionId, {});
		return {
			count: files.length,
			totalSizeBytes: files.reduce((total, file) => total + file.fileSizeBytes, 0),
			data: files.map(toKnowledgeCollectionFileDto),
		};
	}

	/** Removes the multer temp files it was given, also when the upload is rejected. */
	async uploadFiles({
		user,
		projectId,
		collectionId,
		files,
	}: KnowledgeCollectionRef & {
		user: User;
		files: Express.Multer.File[];
	}): Promise<KnowledgeCollectionFileDto[]> {
		try {
			await this.collectionService.getInProject({ projectId, collectionId });
			this.knowledgeFileService.validateUploadMetadata(files);
			this.validateFileSizes(files);
			await this.validateFileNames({ collectionId, files });

			const uploadedFiles: KnowledgeFile[] = [];
			try {
				for (const file of files) {
					uploadedFiles.push(await this.storeFile({ user, collectionId, file }));
				}
			} catch (error) {
				await this.cleanupFailedUploadBatch(uploadedFiles);
				throw error;
			}

			return uploadedFiles.map(toKnowledgeCollectionFileDto);
		} finally {
			await cleanupUploadedTempFiles(files);
		}
	}

	/** Does nothing when the collection has no file with this id. */
	async deleteFile({
		projectId,
		collectionId,
		fileId,
	}: KnowledgeCollectionRef & { fileId: string }): Promise<void> {
		await this.collectionService.getInProject({ projectId, collectionId });

		const file = await this.fileRepository.findByIdAndCollectionId({ fileId, collectionId }, {});
		if (!file) {
			return;
		}

		await this.fileRepository.deleteByIdAndCollectionId({ fileId, collectionId }, {});
		await this.fileStore
			.delete([{ storedAt: file.storedAt, storageKey: file.storageKey }])
			.catch((error) => {
				this.logger.warn('Failed to delete knowledge collection file blob', {
					collectionId,
					fileId: file.id,
					error: getErrorMessage(error),
				});
			});
	}

	/** Rejects a file that is too large for the size column. The configured limit has no upper bound. */
	private validateFileSizes(files: Express.Multer.File[]) {
		for (const file of files) {
			if (file.size > MAX_FILE_SIZE_BYTES) {
				throw new KnowledgeUploadError(
					`"${file.originalname}" is too large. Files must be smaller than ${formatMbOrGb(MAX_FILE_SIZE_BYTES)}.`,
					'file_size',
				);
			}
		}
	}

	/**
	 * Rejects a name that a file of the collection or of the same upload has.
	 * The check compares stored names: a PDF is stored as text, so `a.pdf` and
	 * `a.txt` cannot both be in one collection.
	 */
	private async validateFileNames({
		collectionId,
		files,
	}: {
		collectionId: string;
		files: Express.Multer.File[];
	}) {
		const existingFiles = await this.fileRepository.findByCollectionId(collectionId, {});
		const contentFileNames = new Set(
			existingFiles.map((file) => toKnowledgeContentFileName(file.name)),
		);

		for (const file of files) {
			const contentFileName = toKnowledgeContentFileName(file.originalname);
			if (contentFileNames.has(contentFileName)) {
				throw this.duplicateFileNameError(file.originalname);
			}
			contentFileNames.add(contentFileName);
		}
	}

	/** Stores the bytes of the file, then its row. */
	private async storeFile({
		user,
		collectionId,
		file,
	}: {
		user: User;
		collectionId: string;
		file: Express.Multer.File;
	}): Promise<KnowledgeFile> {
		const fileId = generateNanoId();
		const content = await this.knowledgeFileService.prepareUploadContent(file);

		const storageReference = await this.fileStore.write({ collectionId, fileId }, content, {
			fileName: toKnowledgeContentFileName(file.originalname),
			mimeType: file.mimetype,
		});

		try {
			return await this.fileRepository.saveUploadedFile(
				{
					id: fileId,
					knowledgeCollectionId: collectionId,
					name: file.originalname,
					storedAt: storageReference.storedAt,
					storageKey: storageReference.storageKey,
					mimeType: file.mimetype,
					fileSizeBytes: file.size,
					createdById: user.id,
				},
				{},
			);
		} catch (error) {
			await this.fileStore.delete([storageReference]).catch(() => {});
			// The unique index decides when two uploads with the same name run together.
			if (isUniqueConstraintError(error)) {
				throw this.duplicateFileNameError(file.originalname);
			}
			throw error;
		}
	}

	private async cleanupFailedUploadBatch(files: KnowledgeFile[]): Promise<void> {
		for (const file of files) {
			await this.fileStore
				.delete([{ storedAt: file.storedAt, storageKey: file.storageKey }])
				.catch(() => {});
			await this.fileRepository
				.deleteByIdAndCollectionId(
					{ fileId: file.id, collectionId: file.knowledgeCollectionId },
					{},
				)
				.catch(() => {});
		}
	}

	private duplicateFileNameError(fileName: string): KnowledgeUploadError {
		return new KnowledgeUploadError(
			`A knowledge file named "${fileName}" already exists in this collection`,
			'duplicate_name',
		);
	}
}
