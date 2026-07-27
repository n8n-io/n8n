import {
	MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES,
	MAX_AGENT_KNOWLEDGE_BASE_SIZE_GB,
	type AgentFileDto,
} from '@n8n/api-types';
import { N8nPdfLoader } from '@n8n/ai-utilities';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { QueryFailedError } from '@n8n/typeorm';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { BinaryDataConfig, BinaryDataService } from 'n8n-core';
import { OperationalError, type IBinaryData } from 'n8n-workflow';
import { createReadStream } from 'node:fs';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import type { Readable } from 'node:stream';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import {
	buildKnowledgeFileLocation,
	storageFileNameForOriginalFileName,
	toAgentFileDto,
} from './agent-knowledge-storage';
import { AgentKnowledgeSandboxService } from './agent-knowledge-sandbox.service';
import type { AgentFile } from './entities/agent-file.entity';
import type { Agent } from './entities/agent.entity';
import { AgentFileRepository } from './repositories/agent-file.repository';
import { AgentRepository } from './repositories/agent.repository';

const MAX_AGENT_FILE_METADATA_LENGTH = 255;

function isUniqueConstraintError(error: unknown): boolean {
	if (!(error instanceof QueryFailedError)) return false;

	const driverError = error.driverError;
	if (!driverError || typeof driverError !== 'object') return false;

	const code =
		'code' in driverError && typeof driverError.code === 'string' ? driverError.code : undefined;

	if (code === '23505') return true;
	if (code === 'SQLITE_CONSTRAINT_UNIQUE') return true;
	if (code === 'SQLITE_CONSTRAINT' && /UNIQUE constraint/i.test(error.message)) return true;

	return false;
}

@Service()
export class AgentKnowledgeService {
	constructor(
		private readonly agentRepository: AgentRepository,
		private readonly agentFileRepository: AgentFileRepository,
		private readonly agentKnowledgeSandboxService: AgentKnowledgeSandboxService,
		private readonly binaryDataService: BinaryDataService,
		private readonly binaryDataConfig: BinaryDataConfig,
		private readonly logger: Logger,
	) {}

	async uploadFiles(
		agentId: string,
		projectId: string,
		files: Express.Multer.File[],
	): Promise<AgentFileDto[]> {
		try {
			const agent = await this.ensureAgentBelongsToProject(agentId, projectId);
			this.assertAgentPublished(agent);
			if (this.binaryDataConfig.mode === 'default') {
				throw new OperationalError(
					'Agent knowledge base requires a persisted binary data storage mode',
				);
			}
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

			this.agentKnowledgeSandboxService.invalidateMirror(projectId, agentId);
			this.agentKnowledgeSandboxService.prewarmMirrorInBackground(projectId, agentId);

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

	async warmSandbox(agentId: string, projectId: string): Promise<void> {
		const agent = await this.ensureAgentBelongsToProject(agentId, projectId);
		this.assertAgentPublished(agent);
		await this.agentKnowledgeSandboxService.warmSandbox(projectId, agentId);
	}

	async deleteFile(agentId: string, projectId: string, fileId: string): Promise<void> {
		await this.ensureAgentBelongsToProject(agentId, projectId);

		const file = await this.agentFileRepository.findByIdAndAgentId(fileId, agentId);
		if (!file) {
			return;
		}

		await this.agentFileRepository.delete({ id: fileId, agentId });
		await this.binaryDataService.deleteManyByBinaryDataId([file.binaryDataId]).catch((error) => {
			this.logger.warn('Failed to delete knowledge file binary data', {
				agentId,
				fileId: file.id,
				error: error instanceof Error ? error.message : error,
			});
		});
		this.agentKnowledgeSandboxService.invalidateMirror(projectId, agentId);
		this.agentKnowledgeSandboxService.prewarmMirrorInBackground(projectId, agentId);
	}

	async deleteAllFilesForAgent(projectId: string, agentId: string): Promise<void> {
		const files = await this.agentFileRepository.findByAgentId(agentId);
		await this.agentFileRepository.delete({ agentId });
		if (files.length > 0) {
			await this.binaryDataService
				.deleteManyByBinaryDataId(files.map((file) => file.binaryDataId))
				.catch((error) => {
					this.logger.warn('Failed to delete knowledge files binary data', {
						agentId,
						error: error instanceof Error ? error.message : error,
					});
				});
		}
		this.agentKnowledgeSandboxService.invalidateMirror(projectId, agentId);
	}

	/** Best-effort passthrough for agent/project deletion; never throws. */
	async destroySandbox(projectId: string, agentId: string): Promise<void> {
		await this.agentKnowledgeSandboxService.destroySandbox(projectId, agentId);
	}

	/** Stores the file's bytes via BinaryDataService, then reserves its DB row. */
	private async storeAgentFile(agentId: string, file: Express.Multer.File): Promise<AgentFile> {
		const fileId = generateNanoId();
		const storageFileName = storageFileNameForOriginalFileName(file.originalname);
		const content = await this.prepareUploadContent(file);

		const binaryData: IBinaryData = {
			data: '',
			mimeType: file.mimetype,
			fileName: storageFileName,
		};
		const stored = await this.binaryDataService.store(
			buildKnowledgeFileLocation(agentId, fileId),
			content,
			binaryData,
		);
		if (!stored.id) {
			throw new OperationalError(
				'Agent knowledge base requires a persisted binary data storage mode',
			);
		}

		try {
			return await this.saveAgentFile(agentId, fileId, file, stored.id);
		} catch (error) {
			await this.binaryDataService.deleteManyByBinaryDataId([stored.id]).catch(() => {});
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
		binaryDataId: string,
	): Promise<AgentFile> {
		const agentFile = this.agentFileRepository.create({
			id: fileId,
			agentId,
			binaryDataId,
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
			await this.binaryDataService.deleteManyByBinaryDataId([file.binaryDataId]).catch(() => {});
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

	private assertAgentPublished(agent: Agent): void {
		if (agent.activeVersionId === null) {
			throw new BadRequestError(
				'Knowledge base is only available for published agents. Publish the agent first.',
			);
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
