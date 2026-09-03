import { N8nPdfLoader } from '@n8n/ai-utilities';
import {
	MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES,
	MAX_AGENT_KNOWLEDGE_BASE_SIZE_GB,
	type AgentFileDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { isUniqueConstraintError } from '@n8n/db';
import { Service } from '@n8n/di';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { UnexpectedError } from 'n8n-workflow';
import { createReadStream } from 'node:fs';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import type { Readable } from 'node:stream';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import {
	AgentKnowledgeFileStore,
	type StoredAgentKnowledgeFile,
} from './agent-knowledge-file-store';
import { AgentKnowledgeMirrorService } from './agent-knowledge-mirror.service';
import { storageFileNameForOriginalFileName, toAgentFileDto } from './agent-knowledge-storage';
import { AgentSandboxRuntimeService } from './agent-sandbox-runtime.service';
import type { AgentFile } from './entities/agent-file.entity';
import { AgentFileRepository } from './repositories/agent-file.repository';
import { AgentRepository } from './repositories/agent.repository';

const MAX_AGENT_FILE_METADATA_LENGTH = 255;

@Service()
export class AgentKnowledgeService {
	constructor(
		private readonly agentRepository: AgentRepository,
		private readonly agentFileRepository: AgentFileRepository,
		private readonly agentSandboxRuntimeService: AgentSandboxRuntimeService,
		private readonly agentKnowledgeMirrorService: AgentKnowledgeMirrorService,
		private readonly agentKnowledgeFileStore: AgentKnowledgeFileStore,
		private readonly logger: Logger,
	) {}

	async uploadFiles(
		agentId: string,
		projectId: string,
		files: Express.Multer.File[],
	): Promise<AgentFileDto[]> {
		try {
			await this.ensureAgentBelongsToProject(agentId, projectId);
			this.validateUploadMetadata(files);
			await this.validateUploadBatch(agentId, files);

			const uploadedFiles: AgentFile[] = [];
			try {
				for (const file of files) {
					uploadedFiles.push(await this.storeAgentFile(agentId, file));
				}
			} catch (error) {
				await this.cleanupUploadedFiles(uploadedFiles);
				throw error;
			}

			this.agentKnowledgeMirrorService.prewarmMirrorInBackground(projectId, agentId);

			return uploadedFiles.map((file) => toAgentFileDto(file));
		} finally {
			await this.cleanupUploadTempFiles(files);
		}
	}

	async listFiles(agentId: string, projectId: string): Promise<AgentFileDto[]> {
		await this.ensureAgentBelongsToProject(agentId, projectId);
		const files = await this.agentFileRepository.findByAgentId(agentId);
		return files.map((file) => toAgentFileDto(file));
	}

	/** Every knowledge file's row and stored bytes, for package export. */
	async getFilesWithContent(agentId: string): Promise<Array<{ file: AgentFile; content: Buffer }>> {
		const files = await this.agentFileRepository.findByAgentId(agentId);
		const result: Array<{ file: AgentFile; content: Buffer }> = [];
		for (const file of files) {
			const content = await this.agentKnowledgeFileStore.readAsBuffer({
				storedAt: file.storedAt,
				storageKey: file.storageKey,
			});
			if (!content) {
				throw new UnexpectedError('Knowledge file content is missing from storage', {
					extra: { agentId, fileId: file.id },
				});
			}
			result.push({ file, content });
		}
		return result;
	}

	/**
	 * Writes an already-prepared file's bytes and row, for package import. The
	 * bytes come from another instance's store, so no PDF extraction runs here;
	 * `fileSizeBytes` carries the source row's value.
	 */
	async importFile(
		agentId: string,
		meta: { fileName: string; mimeType: string; fileSizeBytes: number },
		content: Buffer,
	): Promise<AgentFile> {
		const fileId = generateNanoId();
		const stored = await this.agentKnowledgeFileStore.write({ agentId, fileId }, content, {
			fileName: storageFileNameForOriginalFileName(meta.fileName),
			mimeType: meta.mimeType,
		});

		try {
			const agentFile = this.agentFileRepository.create({
				id: fileId,
				agentId,
				storedAt: stored.storedAt,
				storageKey: stored.storageKey,
				fileName: meta.fileName,
				mimeType: meta.mimeType,
				fileSizeBytes: meta.fileSizeBytes,
			});
			return await this.agentFileRepository.save(agentFile);
		} catch (error) {
			await this.agentKnowledgeFileStore.delete([stored]).catch(() => {});
			if (isUniqueConstraintError(error)) {
				throw this.duplicateFileNameError(meta.fileName);
			}
			throw error;
		}
	}

	async warmKnowledgeSandbox(agentId: string, projectId: string): Promise<void> {
		await this.ensureAgentBelongsToProject(agentId, projectId);
		if (!(await this.agentFileRepository.hasFilesForAgent(agentId))) return;

		await this.agentSandboxRuntimeService.warmKnowledgeSandbox(projectId, agentId);
	}

	async deleteFile(agentId: string, projectId: string, fileId: string): Promise<void> {
		await this.ensureAgentBelongsToProject(agentId, projectId);

		const file = await this.agentFileRepository.findByIdAndAgentId(fileId, agentId);
		if (!file) {
			return;
		}

		await this.agentFileRepository.delete({ id: fileId, agentId });
		await this.agentKnowledgeFileStore
			.delete([{ storedAt: file.storedAt, storageKey: file.storageKey }])
			.catch((error) => {
				this.logger.warn('Failed to delete knowledge file blob', {
					agentId,
					fileId: file.id,
					error: error instanceof Error ? error.message : error,
				});
			});
		if (await this.agentFileRepository.hasFilesForAgent(agentId)) {
			this.agentKnowledgeMirrorService.prewarmMirrorInBackground(projectId, agentId);
		} else {
			await this.agentSandboxRuntimeService.destroyKnowledgeSandbox(projectId, agentId);
		}
	}

	async deleteAllFilesForAgent(_projectId: string, agentId: string): Promise<void> {
		const files = await this.agentFileRepository.findByAgentId(agentId);
		await this.agentFileRepository.delete({ agentId });
		if (files.length > 0) {
			await this.agentKnowledgeFileStore
				.delete(
					files.map((file) => ({
						storedAt: file.storedAt,
						storageKey: file.storageKey,
					})),
				)
				.catch((error) => {
					this.logger.warn('Failed to delete knowledge file blobs', {
						agentId,
						error: error instanceof Error ? error.message : error,
					});
				});
		}
	}

	/** Best-effort passthrough for agent/project deletion; never throws. */
	async destroyKnowledgeSandbox(projectId: string, agentId: string): Promise<void> {
		await this.agentSandboxRuntimeService.destroyKnowledgeSandbox(projectId, agentId);
	}

	/** Stores the file's bytes via AgentKnowledgeFileStore, then reserves its DB row. */
	private async storeAgentFile(agentId: string, file: Express.Multer.File): Promise<AgentFile> {
		const fileId = generateNanoId();
		const storageFileName = storageFileNameForOriginalFileName(file.originalname);
		const content = await this.prepareUploadContent(file);

		const stored = await this.agentKnowledgeFileStore.write({ agentId, fileId }, content, {
			fileName: storageFileName,
			mimeType: file.mimetype,
		});

		try {
			return await this.saveAgentFile(agentId, fileId, file, stored);
		} catch (error) {
			await this.agentKnowledgeFileStore.delete([stored]).catch(() => {});
			if (isUniqueConstraintError(error)) {
				throw this.duplicateFileNameError(file.originalname);
			}
			throw error;
		}
	}

	private async saveAgentFile(
		agentId: string,
		fileId: string,
		file: Express.Multer.File,
		stored: StoredAgentKnowledgeFile,
	): Promise<AgentFile> {
		const agentFile = this.agentFileRepository.create({
			id: fileId,
			agentId,
			storedAt: stored.storedAt,
			storageKey: stored.storageKey,
			fileName: file.originalname,
			mimeType: file.mimetype,
			fileSizeBytes: file.size,
		});

		return await this.agentFileRepository.save(agentFile);
	}

	private async prepareUploadContent(file: Express.Multer.File): Promise<Buffer | Readable> {
		if (!file.path) {
			throw new BadRequestError('Uploaded file path is missing');
		}

		const extension = path.extname(file.originalname).toLowerCase();
		if (extension === '.pdf') {
			const extractedText = await this.extractPdfText(file.path);
			return Buffer.from(extractedText, 'utf-8');
		}

		return createReadStream(file.path);
	}

	private async cleanupUploadedFiles(files: AgentFile[]): Promise<void> {
		for (const file of files) {
			await this.agentKnowledgeFileStore
				.delete([{ storedAt: file.storedAt, storageKey: file.storageKey }])
				.catch(() => {});
			await this.agentFileRepository.delete({ id: file.id, agentId: file.agentId }).catch(() => {});
		}
	}

	private async extractPdfText(filePath: string): Promise<string> {
		const loader = new N8nPdfLoader(filePath, { splitPages: false });
		const documents = await loader.load();
		const extractedText = documents
			.map((document: { pageContent: string }) => document.pageContent)
			.join('\n\n')
			// PDF extraction can leak NUL bytes, which make grep-like tools
			// treat the stored text as binary.
			.replaceAll('\u0000', '')
			.trim();
		if (!extractedText) {
			throw new BadRequestError(
				'PDF contains no extractable text and cannot be added to knowledge',
			);
		}
		return extractedText;
	}

	private validateUploadMetadata(files: Express.Multer.File[]) {
		for (const file of files) {
			this.validateMetadataLength('File name', file.originalname);
			this.validateMetadataLength('MIME type', file.mimetype);
		}
	}

	private async validateUploadBatch(agentId: string, files: Express.Multer.File[]) {
		const existingFiles = await this.agentFileRepository.findByAgentId(agentId);
		const existingTotalSizeBytes = existingFiles.reduce(
			(total, file) => total + file.fileSizeBytes,
			0,
		);
		const uploadTotalSizeBytes = files.reduce((total, file) => total + file.size, 0);
		if (existingTotalSizeBytes + uploadTotalSizeBytes > MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES) {
			throw new BadRequestError(
				`Knowledge base limit reached. The total size can't be larger than ${MAX_AGENT_KNOWLEDGE_BASE_SIZE_GB} GB.`,
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

	private duplicateFileNameError(fileName: string): BadRequestError {
		return new BadRequestError(
			`A knowledge file named "${fileName}" already exists for this agent`,
		);
	}

	private validateMetadataLength(label: string, value: string) {
		if (value.length > MAX_AGENT_FILE_METADATA_LENGTH) {
			throw new BadRequestError(
				`${label} must be ${MAX_AGENT_FILE_METADATA_LENGTH} characters or less`,
			);
		}
	}

	private async ensureAgentBelongsToProject(agentId: string, projectId: string) {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}
		return agent;
	}

	private async cleanupUploadTempFiles(files: Express.Multer.File[]) {
		await Promise.all(files.map(async (file) => await this.cleanupUploadTempFile(file)));
	}

	private async cleanupUploadTempFile(file: Express.Multer.File) {
		if (!file.path) return;

		await unlink(file.path).catch(() => {});
	}
}
