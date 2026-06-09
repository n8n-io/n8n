import type { AgentFileDto } from '@n8n/api-types';
import { N8nPdfLoader } from '@n8n/ai-utilities';
import { Service } from '@n8n/di';
import { generateNanoId } from '@n8n/utils';
import { readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { OperationalError } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import {
	fromVolumeStorageReference,
	isFilesystemNotFoundError,
	KNOWLEDGE_FILES_DIR,
	storageFileNameForAgentFile,
	toAgentFileDto,
	toVolumeStorageReference,
	type AgentKnowledgeFilesystem,
} from './agent-knowledge-storage';
import { AgentKnowledgeSandboxService } from './agent-knowledge-sandbox.service';
import type { AgentFile } from './entities/agent-file.entity';
import { AgentFileRepository } from './repositories/agent-file.repository';
import { AgentRepository } from './repositories/agent.repository';

const MAX_AGENT_FILE_METADATA_LENGTH = 255;

@Service()
export class AgentKnowledgeService {
	constructor(
		private readonly agentRepository: AgentRepository,
		private readonly agentFileRepository: AgentFileRepository,
		private readonly agentKnowledgeSandboxService: AgentKnowledgeSandboxService,
	) {}

	async uploadFiles(
		agentId: string,
		projectId: string,
		files: Express.Multer.File[],
	): Promise<AgentFileDto[]> {
		try {
			await this.ensureAgentBelongsToProject(agentId, projectId);
			this.validateUploadMetadata(files);
			const uploadedFiles: AgentFile[] = [];

			await this.agentKnowledgeSandboxService.withKnowledgeFilesystem(
				projectId,
				agentId,
				async (filesystem) => {
					try {
						for (const file of files) {
							uploadedFiles.push(await this.uploadFileToVolume(agentId, file, filesystem));
						}
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

	async deleteFile(agentId: string, projectId: string, fileId: string): Promise<void> {
		await this.ensureAgentBelongsToProject(agentId, projectId);

		const file = await this.agentFileRepository.findByIdAndAgentId(fileId, agentId);
		if (!file) {
			return;
		}

		await this.agentKnowledgeSandboxService.withKnowledgeFilesystem(
			projectId,
			agentId,
			async (filesystem) => {
				await this.deleteVolumeFile(filesystem, file);
			},
		);
		await this.agentFileRepository.delete({ id: fileId, agentId });
	}

	async deleteAllFilesForAgent(agentId: string): Promise<void> {
		const agent = await this.agentRepository.findOne({ where: { id: agentId } });
		if (!agent) return;

		const files = await this.agentFileRepository.findByAgentId(agentId);
		if (files.length === 0) return;

		await this.agentKnowledgeSandboxService.withKnowledgeFilesystem(
			agent.projectId,
			agentId,
			async (filesystem) => {
				const errors: unknown[] = [];
				for (const file of files) {
					try {
						await this.deleteVolumeFile(filesystem, file);
					} catch (error) {
						errors.push(error);
					}
				}
				if (errors.length > 0) {
					throw errors[0];
				}
			},
		);
		await this.agentFileRepository.delete({ agentId });
	}

	private async uploadFileToVolume(
		agentId: string,
		file: Express.Multer.File,
		filesystem: AgentKnowledgeFilesystem,
	): Promise<AgentFile> {
		if (!file.path) {
			throw new OperationalError('Uploaded file is missing a temp path');
		}

		const fileId = generateNanoId();
		const storageFileName = storageFileNameForAgentFile(fileId, file.originalname);
		const agentFile = this.agentFileRepository.create({
			id: fileId,
			agentId,
			binaryDataId: toVolumeStorageReference(storageFileName),
			fileName: file.originalname,
			mimeType: file.mimetype,
			fileSizeBytes: file.size,
		});
		const savedFile = await this.agentFileRepository.save(agentFile);

		try {
			const content = await this.readUploadedFileContent(file);
			await filesystem.ensureDir(KNOWLEDGE_FILES_DIR);
			await filesystem.writeFile(this.storagePathFor(storageFileName), content);
			return savedFile;
		} catch (error) {
			await this.agentFileRepository.delete({ id: fileId, agentId }).catch(() => {});
			throw error;
		}
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

	private async readUploadedFileContent(file: Express.Multer.File): Promise<string> {
		const extension = path.extname(file.originalname).toLowerCase();
		if (extension === '.pdf') {
			return await this.extractPdfText(file.path!);
		}

		const fileBuffer = await readFile(file.path!);
		return fileBuffer.toString('utf-8');
	}

	private async extractPdfText(filePath: string): Promise<string> {
		const loader = new N8nPdfLoader(filePath, { splitPages: false });
		const documents = await loader.load();
		return documents.map((document: { pageContent: string }) => document.pageContent).join('\n\n');
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

	private storagePathFor(storageFileName: string): string {
		return `${KNOWLEDGE_FILES_DIR}/${storageFileName}`;
	}

	private validateUploadMetadata(files: Express.Multer.File[]) {
		for (const file of files) {
			this.validateMetadataLength('File name', file.originalname);
			this.validateMetadataLength('MIME type', file.mimetype);
		}
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
