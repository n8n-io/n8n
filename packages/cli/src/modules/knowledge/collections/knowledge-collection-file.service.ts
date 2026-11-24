import {
	MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES,
	type KnowledgeCollectionFileDto,
	type KnowledgeCollectionFileListResponse,
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
import { KnowledgeConfig } from '../knowledge.config';
import { KnowledgeCollectionFileRepository } from '../repositories/knowledge-collection-file.repository';
import {
	KnowledgeCollectionCatalogService,
	type KnowledgeCollectionRef,
} from './knowledge-collection-catalog.service';

/**
 * The largest file of a collection: the size limit of a knowledge base today.
 * It also keeps the size in the range of the `int` column `knowledge_file.fileSizeBytes`.
 */
const MAX_FILE_SIZE_BYTES = MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES;

/** Upload, listing and deletion of the files of a knowledge collection. */
@Service()
export class KnowledgeCollectionFileService {
	private readonly logger: Logger;

	constructor(
		private readonly catalogService: KnowledgeCollectionCatalogService,
		private readonly fileRepository: KnowledgeCollectionFileRepository,
		private readonly fileStore: KnowledgeFileStore,
		private readonly knowledgeFileService: KnowledgeFileService,
		private readonly config: KnowledgeConfig,
		logger: Logger,
	) {
		this.logger = logger.scoped('knowledge');
	}

	async listFiles(
		user: User,
		{ projectId, collectionId }: KnowledgeCollectionRef,
	): Promise<KnowledgeCollectionFileListResponse> {
		await this.catalogService.getInProject(user, { projectId, collectionId }, 'agent:read');

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
			await this.catalogService.getInProject(user, { projectId, collectionId }, 'agent:update');
			this.knowledgeFileService.validateUploadMetadata(files);
			this.validateFileSizes(files);
			await this.validateUploadBatch({ collectionId, files });

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
		user,
		projectId,
		collectionId,
		fileId,
	}: KnowledgeCollectionRef & { user: User; fileId: string }): Promise<void> {
		await this.catalogService.getInProject(user, { projectId, collectionId }, 'agent:update');

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

	/** Rejects a file above the fixed limit. The configured file size limit has no upper bound. */
	private validateFileSizes(files: Express.Multer.File[]) {
		for (const file of files) {
			if (file.size > MAX_FILE_SIZE_BYTES) {
				throw new KnowledgeUploadError(
					`"${file.originalname}" is too large. A file can't be larger than ${formatMbOrGb(MAX_FILE_SIZE_BYTES)}.`,
					'file_size',
				);
			}
		}
	}

	/**
	 * Rejects an upload that takes the collection above the total size limit, the
	 * limit of the knowledge base of an agent. Then rejects a name that a file of
	 * the collection or of the same upload has. The name check compares stored
	 * names: a PDF is stored as text, so `a.pdf` and `a.txt` cannot both be in one
	 * collection.
	 */
	private async validateUploadBatch({
		collectionId,
		files,
	}: {
		collectionId: string;
		files: Express.Multer.File[];
	}) {
		const existingFiles = await this.fileRepository.findByCollectionId(collectionId, {});

		const existingTotalSizeBytes = existingFiles.reduce(
			(total, file) => total + file.fileSizeBytes,
			0,
		);
		const uploadTotalSizeBytes = files.reduce((total, file) => total + file.size, 0);
		if (existingTotalSizeBytes + uploadTotalSizeBytes > this.config.maxTotalSizeBytes) {
			throw new KnowledgeUploadError(
				`Collection limit reached. The total size can't be larger than ${formatMbOrGb(this.config.maxTotalSizeBytes)}.`,
				'total_limit',
			);
		}

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
			await this.fileStore.delete([storageReference]).catch((deleteError) => {
				this.logger.warn('Failed to delete knowledge collection file blob', {
					collectionId,
					fileId,
					error: getErrorMessage(deleteError),
				});
			});
			// The unique index decides when two uploads with the same name run together.
			if (isUniqueConstraintError(error)) {
				throw this.duplicateFileNameError(file.originalname);
			}
			throw error;
		}
	}

	private async cleanupFailedUploadBatch(files: KnowledgeFile[]): Promise<void> {
		for (const file of files) {
			const context = { collectionId: file.knowledgeCollectionId, fileId: file.id };
			await this.fileStore
				.delete([{ storedAt: file.storedAt, storageKey: file.storageKey }])
				.catch((error) => {
					this.logger.warn('Failed to delete knowledge collection file blob', {
						...context,
						error: getErrorMessage(error),
					});
				});
			await this.fileRepository.deleteByIdAndCollectionId(context, {}).catch((error) => {
				this.logger.warn('Failed to delete knowledge collection file row', {
					...context,
					error: getErrorMessage(error),
				});
			});
		}
	}

	private duplicateFileNameError(fileName: string): KnowledgeUploadError {
		return new KnowledgeUploadError(
			`A knowledge file named "${fileName}" already exists in this collection`,
			'duplicate_name',
		);
	}
}
