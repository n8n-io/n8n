import type { OperationContext } from '@n8n/db';
import {
	MAX_AGENT_FILE_SIZE_BYTES,
	MAX_AGENT_FILE_SIZE_MB,
	MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES,
	MAX_AGENT_KNOWLEDGE_BASE_SIZE_GB,
	type AgentFileDto,
} from '@n8n/api-types';
import { N8nPdfLoader } from '@n8n/ai-utilities';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { isUniqueConstraintError } from '@n8n/db';
import { Service } from '@n8n/di';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { InstanceSettings } from 'n8n-core';
import { createReadStream } from 'node:fs';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import type { Readable } from 'node:stream';
import { BadRequestError } from '@n8n/errors';

import { AgentKnowledgeMirrorService } from '@/modules/agents/agent-knowledge-mirror.service';
import { createKnowledgeTelemetryHmac } from '@/modules/agents/agent-knowledge-telemetry';
import { AgentSandboxRuntimeService } from '@/modules/agents/agent-sandbox-runtime.service';
import { AgentProjectDeletionRepository } from '@/modules/agents/repositories/agent-project-deletion.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { getAgentOrThrow } from '@/modules/agents/utils/get-agent-or-throw';

import type { KnowledgeFile } from '../entities/knowledge-file.entity';
import { KnowledgeAvailabilityService } from '../knowledge-availability.service';
import { KnowledgeFileRepository } from '../repositories/knowledge-file.repository';
import { KnowledgeFileStore, type StoredKnowledgeFile } from './knowledge-file-store';
import { KnowledgeUploadError, type KnowledgeUploadFailureReason } from './knowledge-upload.error';
import { storageFileNameForOriginalFileName, toAgentFileDto } from './storage-naming';

const MAX_AGENT_FILE_METADATA_LENGTH = 255;

export interface UploadedKnowledgeFile {
	file: AgentFileDto;
	contentHash?: string;
}

@Service()
export class AgentKnowledgeService {
	constructor(
		private readonly agentRepository: AgentRepository,
		private readonly agentFileRepository: KnowledgeFileRepository,
		private readonly agentSandboxRuntimeService: AgentSandboxRuntimeService,
		private readonly agentKnowledgeMirrorService: AgentKnowledgeMirrorService,
		private readonly agentKnowledgeFileStore: KnowledgeFileStore,
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
		private readonly knowledgeAvailabilityService: KnowledgeAvailabilityService,
		private readonly globalConfig: GlobalConfig,
		private readonly projectDeletion: AgentProjectDeletionRepository,
	) {}

	async uploadFiles(
		agentId: string,
		projectId: string,
		files: Express.Multer.File[],
	): Promise<UploadedKnowledgeFile[]> {
		try {
			this.knowledgeAvailabilityService.assertModuleActive();
			await getAgentOrThrow(this.agentRepository, agentId, projectId);
			this.validateUploadMetadata(files);
			await this.validateUploadBatch(agentId, files);

			const uploadedFiles: KnowledgeFile[] = [];
			const results: UploadedKnowledgeFile[] = [];
			try {
				for (const file of files) {
					const contentHash = await this.hashUploadedFile(file.path);
					const storedFile = await this.storeAgentFile(agentId, projectId, file);
					uploadedFiles.push(storedFile);
					results.push({ file: toAgentFileDto(storedFile), contentHash });
				}
			} catch (error) {
				await this.cleanupUploadedFiles(uploadedFiles);
				throw error;
			}

			this.agentKnowledgeMirrorService.prewarmMirrorInBackground(projectId, agentId);

			return results;
		} finally {
			await this.cleanupUploadTempFiles(files);
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

	async listFiles(agentId: string, projectId: string): Promise<AgentFileDto[]> {
		this.knowledgeAvailabilityService.assertModuleActive();
		await getAgentOrThrow(this.agentRepository, agentId, projectId);
		const files = await this.agentFileRepository.findByAgentId(agentId, {});
		return files.map((file) => toAgentFileDto(file));
	}

	async warmKnowledgeSandbox(agentId: string, projectId: string): Promise<void> {
		this.knowledgeAvailabilityService.assertModuleActive();
		await getAgentOrThrow(this.agentRepository, agentId, projectId);
		if (!(await this.agentFileRepository.hasFilesForAgent(agentId, {}))) return;

		await this.agentSandboxRuntimeService.warmKnowledgeSandbox(projectId, agentId);
	}

	/** Returns false when the agent has no file with this id, so nothing was deleted. */
	async deleteFile(agentId: string, projectId: string, fileId: string): Promise<boolean> {
		this.knowledgeAvailabilityService.assertModuleActive();
		await getAgentOrThrow(this.agentRepository, agentId, projectId);

		const file = await this.agentFileRepository.findByIdAndAgentId(fileId, agentId, {});
		if (!file) {
			return false;
		}

		await this.agentFileRepository.deleteByIdAndAgentId(fileId, agentId, {});
		await this.agentKnowledgeFileStore
			.delete([{ storedAt: file.storedAt, storageKey: file.storageKey }])
			.catch((error) => {
				this.logger.warn('Failed to delete knowledge file blob', {
					agentId,
					fileId: file.id,
					error: error instanceof Error ? error.message : error,
				});
			});
		if (await this.agentFileRepository.hasFilesForAgent(agentId, {})) {
			this.agentKnowledgeMirrorService.prewarmMirrorInBackground(projectId, agentId);
		} else {
			await this.agentSandboxRuntimeService.destroyKnowledgeSandbox(projectId, agentId);
		}

		return true;
	}

	/**
	 * Cleanup for the agent and project deletion cascades. With the knowledge
	 * module off its entity is not registered, so the rows cannot be read: the
	 * database cascade still removes them with the agent, but their stored bytes
	 * stay (see the knowledge module AGENTS.md).
	 */
	async deleteAllFilesForAgent(_projectId: string, agentId: string): Promise<void> {
		if (!this.knowledgeAvailabilityService.isModuleActive()) {
			this.logger.warn(
				'Knowledge module is inactive, so the stored knowledge file bytes of the deleted agent are kept',
				{ agentId },
			);
			return;
		}

		const files = await this.agentFileRepository.findByAgentId(agentId, {});
		await this.agentFileRepository.deleteByAgentId(agentId, {});
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

	/** Stores the file's bytes via KnowledgeFileStore, then reserves its DB row. */
	private async storeAgentFile(
		agentId: string,
		projectId: string,
		file: Express.Multer.File,
	): Promise<KnowledgeFile> {
		const fileId = generateNanoId();
		const storageFileName = storageFileNameForOriginalFileName(file.originalname);
		const content = await this.prepareUploadContent(file);

		const stored = await this.agentKnowledgeFileStore.write({ agentId, fileId }, content, {
			fileName: storageFileName,
			mimeType: file.mimetype,
		});

		try {
			return await this.projectDeletion.withWritableProject(
				projectId,
				async (ctx) => await this.saveAgentFile(agentId, fileId, file, stored, ctx),
			);
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
		stored: StoredKnowledgeFile,
		ctx: OperationContext,
	): Promise<KnowledgeFile> {
		return await this.agentFileRepository.saveUploadedFile(
			{
				id: fileId,
				agentId,
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
			const extractedText = Buffer.from(await this.extractPdfText(file.path), 'utf-8');
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
			await this.agentKnowledgeFileStore
				.delete([{ storedAt: file.storedAt, storageKey: file.storageKey }])
				.catch(() => {});
			await this.agentFileRepository
				.deleteByIdAndAgentId(file.id, file.agentId, {})
				.catch(() => {});
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
			throw new KnowledgeUploadError(
				'PDF contains no extractable text and cannot be added to knowledge',
				'pdf_no_text',
			);
		}
		return extractedText;
	}

	private validateUploadMetadata(files: Express.Multer.File[]) {
		for (const file of files) {
			this.validateMetadataLength('File name', file.originalname, 'invalid_file_name');
			// No reason fits a MIME type that is too long, so the failure event reports `unknown`.
			this.validateMetadataLength('MIME type', file.mimetype);
		}
	}

	private async validateUploadBatch(agentId: string, files: Express.Multer.File[]) {
		const existingFiles = await this.agentFileRepository.findByAgentId(agentId, {});
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
		if (value.length > MAX_AGENT_FILE_METADATA_LENGTH) {
			const message = `${label} must be ${MAX_AGENT_FILE_METADATA_LENGTH} characters or less`;
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
