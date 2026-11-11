import {
	MAX_AGENT_FILE_SIZE_BYTES,
	MAX_AGENT_FILE_SIZE_MB,
	MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES,
	MAX_AGENT_KNOWLEDGE_BASE_SIZE_GB,
	type AgentFileDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { isUniqueConstraintError, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError } from '@n8n/errors';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { InstanceSettings } from 'n8n-core';
import { createReadStream } from 'node:fs';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import type { Readable } from 'node:stream';

import type { KnowledgeFile } from '../entities/knowledge-file.entity';
import type { KnowledgeConsumerScope } from '../knowledge-consumer-scope';
import { createKnowledgeTelemetryHmac } from '../telemetry/helpers';
import { KnowledgeFileRepository } from '../repositories/knowledge-file.repository';
import { KnowledgeFileStore, type StoredKnowledgeFile } from './knowledge-file-store';
import { KnowledgeUploadError, type KnowledgeUploadFailureReason } from './knowledge-upload.error';
import { extractPdfText } from './pdf-text';
import { storageFileNameForOriginalFileName, toAgentFileDto } from './storage-naming';

const MAX_FILE_METADATA_LENGTH = 255;

export interface UploadedKnowledgeFile {
	file: AgentFileDto;
	contentHash?: string;
}

/**
 * Runs the insert of one knowledge file row. The consumer wraps it in the
 * fence its own writes need: the agents module holds its project-deletion lock
 * for the duration of the write. The context the fence hands over carries its
 * transaction and reaches the repository.
 */
export type KnowledgeWriteRunner = <T>(write: (ctx: OperationContext) => Promise<T>) => Promise<T>;

/**
 * Upload, listing and deletion of the knowledge files of one consumer scope.
 * The caller owns the availability and ownership checks, and the retrieval
 * side effects (sandbox warm-up and teardown).
 */
@Service()
export class KnowledgeFileService {
	private readonly logger: Logger;

	constructor(
		private readonly fileRepository: KnowledgeFileRepository,
		private readonly fileStore: KnowledgeFileStore,
		private readonly instanceSettings: InstanceSettings,
		private readonly globalConfig: GlobalConfig,
		logger: Logger,
	) {
		this.logger = logger.scoped('knowledge');
	}

	/** Removes the multer temp files it was given, also when the upload is rejected. */
	async uploadFiles(
		scope: KnowledgeConsumerScope,
		files: Express.Multer.File[],
		reserveRow: KnowledgeWriteRunner,
	): Promise<UploadedKnowledgeFile[]> {
		try {
			this.validateUploadMetadata(files);
			await this.validateUploadBatch(scope, files);

			const uploadedFiles: KnowledgeFile[] = [];
			const results: UploadedKnowledgeFile[] = [];
			try {
				for (const file of files) {
					const contentHash = await this.hashUploadedFile(file.path);
					const storedFile = await this.storeFile(scope, file, reserveRow);
					uploadedFiles.push(storedFile);
					results.push({ file: toAgentFileDto(storedFile), contentHash });
				}
			} catch (error) {
				await this.cleanupUploadedFiles(uploadedFiles);
				throw error;
			}

			return results;
		} finally {
			await this.cleanupUploadTempFiles(files);
		}
	}

	async listFiles(scope: KnowledgeConsumerScope): Promise<AgentFileDto[]> {
		const files = await this.fileRepository.findByAgentId(scope.agentId, {});
		return files.map((file) => toAgentFileDto(file));
	}

	async hasFiles(scope: KnowledgeConsumerScope): Promise<boolean> {
		return await this.fileRepository.hasFilesForAgent(scope.agentId, {});
	}

	/** Returns false when the scope has no file with this id, so nothing was deleted. */
	async deleteFile(scope: KnowledgeConsumerScope, fileId: string): Promise<boolean> {
		const file = await this.fileRepository.findByIdAndAgentId(fileId, scope.agentId, {});
		if (!file) {
			return false;
		}

		await this.fileRepository.deleteByIdAndAgentId(fileId, scope.agentId, {});
		await this.fileStore
			.delete([{ storedAt: file.storedAt, storageKey: file.storageKey }])
			.catch((error) => {
				this.logger.warn('Failed to delete knowledge file blob', {
					agentId: scope.agentId,
					fileId: file.id,
					error: error instanceof Error ? error.message : error,
				});
			});

		return true;
	}

	/** Deletes every file of the scope and its stored bytes. */
	async deleteAll(scope: KnowledgeConsumerScope): Promise<void> {
		const files = await this.fileRepository.findByAgentId(scope.agentId, {});
		await this.fileRepository.deleteByAgentId(scope.agentId, {});
		if (files.length > 0) {
			await this.fileStore
				.delete(
					files.map((file) => ({
						storedAt: file.storedAt,
						storageKey: file.storageKey,
					})),
				)
				.catch((error) => {
					this.logger.warn('Failed to delete knowledge file blobs', {
						agentId: scope.agentId,
						error: error instanceof Error ? error.message : error,
					});
				});
		}
	}

	private async hashUploadedFile(filePath: string): Promise<string | undefined> {
		// The hash exists only for telemetry, so skip the extra read when telemetry is off.
		if (!this.globalConfig.diagnostics.enabled) {
			return undefined;
		}

		try {
			const hash = createKnowledgeTelemetryHmac(this.instanceSettings.hmacSignatureSecret);
			for await (const chunk of createReadStream(filePath)) {
				hash.update(chunk as Buffer);
			}

			return hash.digest('hex');
		} catch {
			// A telemetry read must not reject an otherwise valid upload.
			this.logger.warn('Could not hash an agent knowledge upload for telemetry');
			return undefined;
		}
	}

	/** Stores the file's bytes via KnowledgeFileStore, then reserves its DB row. */
	private async storeFile(
		scope: KnowledgeConsumerScope,
		file: Express.Multer.File,
		reserveRow: KnowledgeWriteRunner,
	): Promise<KnowledgeFile> {
		const fileId = generateNanoId();
		const storageFileName = storageFileNameForOriginalFileName(file.originalname);
		const content = await this.prepareUploadContent(file);

		const stored = await this.fileStore.write({ agentId: scope.agentId, fileId }, content, {
			fileName: storageFileName,
			mimeType: file.mimetype,
		});

		try {
			return await reserveRow(
				async (ctx) => await this.saveFileRow(scope, fileId, file, stored, ctx),
			);
		} catch (error) {
			await this.fileStore.delete([stored]).catch(() => {});
			if (isUniqueConstraintError(error)) {
				throw this.duplicateFileNameError(file.originalname);
			}
			throw error;
		}
	}

	private async saveFileRow(
		scope: KnowledgeConsumerScope,
		fileId: string,
		file: Express.Multer.File,
		stored: StoredKnowledgeFile,
		ctx: OperationContext,
	): Promise<KnowledgeFile> {
		return await this.fileRepository.saveUploadedFile(
			{
				id: fileId,
				agentId: scope.agentId,
				storedAt: stored.storedAt,
				storageKey: stored.storageKey,
				fileName: file.originalname,
				mimeType: file.mimetype,
				fileSizeBytes: file.size,
			},
			ctx,
		);
	}

	private async prepareUploadContent(file: Express.Multer.File): Promise<Buffer | Readable> {
		if (!file.path) {
			throw new BadRequestError('Uploaded file path is missing');
		}

		const extension = path.extname(file.originalname).toLowerCase();
		if (extension === '.pdf') {
			const extractedText = Buffer.from(await extractPdfText(file.path), 'utf-8');
			// Extracted text can be larger than the compressed PDF, and the sandbox rejects files above the limit.
			if (extractedText.byteLength > MAX_AGENT_FILE_SIZE_BYTES) {
				throw new KnowledgeUploadError(
					`The text in "${file.originalname}" is larger than ${MAX_AGENT_FILE_SIZE_MB} MB`,
					'file_size',
				);
			}
			return extractedText;
		}

		return createReadStream(file.path);
	}

	private async cleanupUploadedFiles(files: KnowledgeFile[]): Promise<void> {
		for (const file of files) {
			await this.fileStore
				.delete([{ storedAt: file.storedAt, storageKey: file.storageKey }])
				.catch(() => {});
			await this.fileRepository.deleteByIdAndAgentId(file.id, file.agentId, {}).catch(() => {});
		}
	}

	private validateUploadMetadata(files: Express.Multer.File[]) {
		for (const file of files) {
			this.validateMetadataLength('File name', file.originalname, 'invalid_file_name');
			// No reason fits a MIME type that is too long, so the failure event reports `unknown`.
			this.validateMetadataLength('MIME type', file.mimetype);
		}
	}

	private async validateUploadBatch(scope: KnowledgeConsumerScope, files: Express.Multer.File[]) {
		const existingFiles = await this.fileRepository.findByAgentId(scope.agentId, {});
		const existingTotalSizeBytes = existingFiles.reduce(
			(total, file) => total + file.fileSizeBytes,
			0,
		);
		const uploadTotalSizeBytes = files.reduce((total, file) => total + file.size, 0);
		if (existingTotalSizeBytes + uploadTotalSizeBytes > MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES) {
			throw new KnowledgeUploadError(
				`Knowledge base limit reached. The total size can't be larger than ${MAX_AGENT_KNOWLEDGE_BASE_SIZE_GB} GB.`,
				'total_limit',
			);
		}

		const existingFileNames = new Set(existingFiles.map((file) => file.fileName));
		const existingStorageNames = new Set(
			existingFiles.map((file) => storageFileNameForOriginalFileName(file.fileName)),
		);

		const batchFileNames = new Set<string>();
		const batchStorageNames = new Set<string>();

		for (const file of files) {
			if (batchFileNames.has(file.originalname)) {
				throw this.duplicateFileNameError(file.originalname);
			}
			batchFileNames.add(file.originalname);

			if (existingFileNames.has(file.originalname)) {
				throw this.duplicateFileNameError(file.originalname);
			}

			const storageFileName = storageFileNameForOriginalFileName(file.originalname);
			if (batchStorageNames.has(storageFileName)) {
				throw this.duplicateFileNameError(file.originalname);
			}
			batchStorageNames.add(storageFileName);

			if (existingStorageNames.has(storageFileName)) {
				throw this.duplicateFileNameError(file.originalname);
			}
		}
	}

	private duplicateFileNameError(fileName: string): KnowledgeUploadError {
		return new KnowledgeUploadError(
			`A knowledge file named "${fileName}" already exists for this agent`,
			'duplicate_name',
		);
	}

	private validateMetadataLength(
		label: string,
		value: string,
		reason?: KnowledgeUploadFailureReason,
	) {
		if (value.length > MAX_FILE_METADATA_LENGTH) {
			const message = `${label} must be ${MAX_FILE_METADATA_LENGTH} characters or less`;
			throw reason ? new KnowledgeUploadError(message, reason) : new BadRequestError(message);
		}
	}

	private async cleanupUploadTempFiles(files: Express.Multer.File[]) {
		await Promise.all(files.map(async (file) => await this.cleanupUploadTempFile(file)));
	}

	private async cleanupUploadTempFile(file: Express.Multer.File) {
		if (!file.path) return;

		await unlink(file.path).catch(() => {});
	}
}
