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
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import {
	fromVolumeStorageReference,
	isFilesystemNotFoundError,
	KNOWLEDGE_FILES_DIR,
	storageFileNameForOriginalFileName,
	toAgentFileDto,
	toVolumeStorageReference,
	type AgentKnowledgeFileUpload,
	type AgentKnowledgeFilesystem,
} from './agent-knowledge-storage';
import { AgentKnowledgeSandboxService } from './agent-knowledge-sandbox.service';
import type { AgentFile } from './entities/agent-file.entity';
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
		private readonly logger: Logger,
	) {}

	async uploadFiles(
		agentId: string,
		projectId: string,
		files: Express.Multer.File[],
		userId: string,
	): Promise<AgentFileDto[]> {
		try {
			await this.ensureAgentBelongsToProject(agentId, projectId);
			this.validateUploadMetadata(files);
			await this.validateUploadBatch(agentId, files);
			const uploadedFiles: AgentFile[] = [];

			await this.agentKnowledgeSandboxService.withKnowledgeFilesystem(
				projectId,
				agentId,
				userId,
				async (filesystem) => {
					const volumeUploads: AgentKnowledgeFileUpload[] = [];
					try {
						for (const file of files) {
							const storageFileName = storageFileNameForOriginalFileName(file.originalname);
							const agentFile = await this.reserveAgentFile(agentId, file, storageFileName);
							uploadedFiles.push(agentFile);
							const upload = await this.prepareVolumeUpload(file, storageFileName);
							volumeUploads.push(upload);
						}
						await filesystem.ensureDir(KNOWLEDGE_FILES_DIR);
						await filesystem.uploadFiles(volumeUploads);
					} catch (error) {
						await this.cleanupUploadedFiles(filesystem, uploadedFiles);
						throw error;
					}
				},
			);

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

	async warmSandbox(agentId: string, projectId: string, userId: string): Promise<void> {
		await this.ensureAgentBelongsToProject(agentId, projectId);
		await this.agentKnowledgeSandboxService.warmSandbox(projectId, agentId, userId);
	}

	async deleteFile(
		agentId: string,
		projectId: string,
		fileId: string,
		userId: string,
	): Promise<void> {
		await this.ensureAgentBelongsToProject(agentId, projectId);

		const file = await this.agentFileRepository.findByIdAndAgentId(fileId, agentId);
		if (!file) {
			return;
		}

		await this.agentFileRepository.delete({ id: fileId, agentId });
		this.deleteVolumeFileInBackground(projectId, agentId, userId, file);
	}

	async deleteAllFilesForAgent(projectId: string, agentId: string, userId: string): Promise<void> {
		await this.agentFileRepository.delete({ agentId });
		this.deleteKnowledgeDirectoryInBackground(projectId, agentId, userId);
	}

	private async reserveAgentFile(
		agentId: string,
		file: Express.Multer.File,
		storageFileName: string,
	): Promise<AgentFile> {
		const fileId = generateNanoId();
		const agentFile = this.agentFileRepository.create({
			id: fileId,
			agentId,
			binaryDataId: toVolumeStorageReference(storageFileName),
			fileName: file.originalname,
			mimeType: file.mimetype,
			fileSizeBytes: file.size,
		});

		try {
			return await this.agentFileRepository.save(agentFile);
		} catch (error) {
			if (isUniqueConstraintError(error)) {
				throw this.duplicateFileNameError(file.originalname);
			}
			throw error;
		}
	}

	private async prepareVolumeUpload(
		file: Express.Multer.File,
		storageFileName: string,
	): Promise<AgentKnowledgeFileUpload> {
		if (!file.path) {
			throw new BadRequestError('Uploaded file path is missing');
		}

		const extension = path.extname(file.originalname).toLowerCase();
		if (extension === '.pdf') {
			const extractedText = await this.extractPdfText(file.path);
			return {
				source: Buffer.from(extractedText, 'utf-8'),
				destination: this.storagePathFor(storageFileName),
			};
		}

		return {
			source: file.path,
			destination: this.storagePathFor(storageFileName),
		};
	}

	private async cleanupUploadedFiles(
		filesystem: AgentKnowledgeFilesystem,
		files: AgentFile[],
	): Promise<void> {
		for (const file of files) {
			await this.deleteVolumeFile(filesystem, file).catch(() => {});
			await this.agentFileRepository.delete({ id: file.id, agentId: file.agentId }).catch(() => {});
		}
	}

	private async extractPdfText(filePath: string): Promise<string> {
		const loader = new N8nPdfLoader(filePath, { splitPages: false });
		const documents = await loader.load();
		const extractedText = documents
			.map((document: { pageContent: string }) => document.pageContent)
			.join('\n\n')
			.trim();
		if (!extractedText) {
			throw new BadRequestError(
				'PDF contains no extractable text and cannot be added to knowledge',
			);
		}
		return extractedText;
	}

	private async deleteVolumeFile(
		filesystem: AgentKnowledgeFilesystem,
		file: AgentFile,
	): Promise<void> {
		const storageFileName = fromVolumeStorageReference(file.binaryDataId);
		try {
			await filesystem.deleteFile(this.storagePathFor(storageFileName));
		} catch (error) {
			if (!isFilesystemNotFoundError(error)) {
				throw error;
			}
		}
	}

	private deleteVolumeFileInBackground(
		projectId: string,
		agentId: string,
		userId: string,
		file: AgentFile,
	): void {
		void this.agentKnowledgeSandboxService
			.withKnowledgeFilesystem(projectId, agentId, userId, async (filesystem) => {
				await this.deleteVolumeFile(filesystem, file);
			})
			.catch((error) => {
				this.logger.warn('Failed to delete knowledge file from volume', {
					agentId,
					fileId: file.id,
					error: error instanceof Error ? error.message : error,
				});
			});
	}

	private deleteKnowledgeDirectoryInBackground(
		projectId: string,
		agentId: string,
		userId: string,
	): void {
		void this.agentKnowledgeSandboxService
			.withKnowledgeFilesystem(projectId, agentId, userId, async (filesystem) => {
				await this.deleteKnowledgeDirectory(filesystem);
			})
			.catch((error) => {
				this.logger.warn('Failed to delete knowledge files from volume', {
					agentId,
					error: error instanceof Error ? error.message : error,
				});
			});
	}

	private async deleteKnowledgeDirectory(filesystem: AgentKnowledgeFilesystem): Promise<void> {
		try {
			await filesystem.deleteFile(KNOWLEDGE_FILES_DIR, true);
		} catch (error) {
			if (!isFilesystemNotFoundError(error)) {
				throw error;
			}
		}
	}

	private storagePathFor(storageFileName: string): string {
		return `${KNOWLEDGE_FILES_DIR}/${storageFileName}`;
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
		const existingStorageNames = new Set<string>();

		for (const file of existingFiles) {
			try {
				existingStorageNames.add(fromVolumeStorageReference(file.binaryDataId));
			} catch {
				// Ignore unknown legacy storage references during duplicate checks.
			}
		}

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
	}

	private async cleanupUploadTempFiles(files: Express.Multer.File[]) {
		await Promise.all(files.map(async (file) => await this.cleanupUploadTempFile(file)));
	}

	private async cleanupUploadTempFile(file: Express.Multer.File) {
		if (!file.path) return;

		await unlink(file.path).catch(() => {});
	}
}
