import type { AgentFileDto } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { generateNanoId, sanitizeFilename } from '@n8n/utils';
import { BinaryDataService, FileLocation } from 'n8n-core';
import { UnexpectedError, type IBinaryData } from 'n8n-workflow';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AgentFile } from './entities/agent-file.entity';
import { AgentFileRepository } from './repositories/agent-file.repository';
import { AgentRepository } from './repositories/agent.repository';

/**
 * A knowledge file as seen by the agent runtime's `search_knowledge` tool.
 * Carries the stored metadata plus `relativePath`, the path the file is
 * written to inside the materialized workspace (see {@link
 * AgentKnowledgeService.materializeWorkspace}). This is distinct from the
 * API-facing `AgentFileDto`, which instead exposes `createdAt` for the UI.
 */
export interface KnowledgeWorkspaceFile {
	id: string;
	fileName: string;
	mimeType: string;
	fileSizeBytes: number;
	relativePath: string;
}

interface MaterializeWorkspaceOptions {
	fileReferences?: string[];
}

interface StoredFileContent {
	buffer: Buffer;
	mimeType: string;
	fileName: string;
	fileExtension: string | undefined;
}

type StoredAgentFile = AgentFile & { binaryDataId: string };

const MAX_AGENT_FILE_METADATA_LENGTH = 255;

/**
 * Abuse guardrails for a single materialization. Deliberately generous so
 * normal knowledge bases never hit them — they exist to stop a pathological
 * corpus from writing unbounded data to the shared temp dir per call.
 */
const MAX_WORKSPACE_FILES = 2_000;
const MAX_WORKSPACE_BYTES = 2 * 1024 * 1024 * 1024;

@Service()
export class AgentKnowledgeService {
	constructor(
		private readonly agentRepository: AgentRepository,
		private readonly agentFileRepository: AgentFileRepository,
		private readonly binaryDataService: BinaryDataService,
	) {}

	async uploadFiles(
		agentId: string,
		projectId: string,
		files: Express.Multer.File[],
	): Promise<AgentFileDto[]> {
		await this.ensureAgentBelongsToProject(agentId, projectId);

		const storedFiles: StoredAgentFile[] = [];

		try {
			// Process sequentially to bound peak memory: each file is read into
			// a buffer and PDFs are parsed in-process, so storing the whole
			// batch in parallel could spike RSS for large uploads.
			for (const file of files) {
				storedFiles.push(await this.storeFile(agentId, file));
			}
		} catch (error) {
			await this.cleanupStoredFiles(storedFiles).catch(() => {});
			throw error;
		} finally {
			await this.cleanupUploadTempFiles(files);
		}

		return storedFiles.map((file) => this.toDto(file));
	}

	/**
	 * List files for the UI/API. Returns `AgentFileDto`s (with `createdAt`,
	 * no workspace path) for the Agent Builder and REST responses.
	 */
	async listFiles(agentId: string, projectId: string): Promise<AgentFileDto[]> {
		await this.ensureAgentBelongsToProject(agentId, projectId);

		const files = await this.agentFileRepository.findByAgentId(agentId);
		return files.map((file) => this.toDto(file));
	}

	/**
	 * List files for the agent runtime's `search_knowledge` tool. Returns
	 * `KnowledgeWorkspaceFile`s, which add the on-disk `relativePath` used
	 * inside the materialized workspace and omit API-only fields like
	 * `createdAt`.
	 */
	async listWorkspaceFiles(agentId: string, projectId: string) {
		await this.ensureAgentBelongsToProject(agentId, projectId);

		const files = await this.agentFileRepository.findByAgentId(agentId);
		return files.map((file) => this.toWorkspaceFile(file));
	}

	async deleteFile(agentId: string, projectId: string, fileId: string): Promise<void> {
		await this.ensureAgentBelongsToProject(agentId, projectId);

		const file = await this.agentFileRepository.findByIdAndAgentId(fileId, agentId);
		if (!file) {
			throw new NotFoundError(`Agent file "${fileId}" not found`);
		}

		await this.binaryDataService.deleteManyByBinaryDataId([file.binaryDataId]);
		await this.agentFileRepository.delete({ id: fileId, agentId });
	}

	async deleteAllFilesForAgent(agentId: string): Promise<void> {
		const files = await this.agentFileRepository.findByAgentId(agentId);
		if (files.length === 0) return;

		await this.binaryDataService.deleteManyByBinaryDataId(files.map((file) => file.binaryDataId));
		await this.agentFileRepository.delete({ agentId });
	}

	/**
	 * Resolve the workspace-file metadata that {@link materializeWorkspace}
	 * would write for these references, without touching the binary store. Used
	 * to build a stable workspace cache key and to drive operations against a
	 * reused workspace.
	 */
	async resolveWorkspaceFiles(
		agentId: string,
		projectId: string,
		fileReferences?: string[],
	): Promise<KnowledgeWorkspaceFile[]> {
		await this.ensureAgentBelongsToProject(agentId, projectId);
		const files = this.filterFilesForWorkspace(
			await this.agentFileRepository.findByAgentId(agentId),
			fileReferences,
		);
		this.assertWorkspaceWithinLimits(files);
		return files.map((file) => this.toWorkspaceFile(file));
	}

	async materializeWorkspace(
		agentId: string,
		projectId: string,
		workspaceRoot: string,
		options: MaterializeWorkspaceOptions = {},
	) {
		await this.ensureAgentBelongsToProject(agentId, projectId);
		await mkdir(workspaceRoot, { recursive: true });

		const files = this.filterFilesForWorkspace(
			await this.agentFileRepository.findByAgentId(agentId),
			options.fileReferences,
		);
		this.assertWorkspaceWithinLimits(files);
		const materializedFiles: KnowledgeWorkspaceFile[] = [];

		for (const file of files) {
			const relativePath = this.getWorkspaceRelativePath(file);
			const targetPath = path.join(workspaceRoot, relativePath);

			// Stream the stored content straight to the workspace file rather
			// than buffering the whole file in memory — knowledge files can be
			// up to the upload size limit.
			const contentStream = await this.binaryDataService.getAsStream(file.binaryDataId);
			await pipeline(contentStream, createWriteStream(targetPath));

			materializedFiles.push(this.toWorkspaceFile(file));
		}

		return materializedFiles;
	}

	private async ensureAgentBelongsToProject(agentId: string, projectId: string) {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}
	}

	private async storeFile(agentId: string, file: Express.Multer.File): Promise<StoredAgentFile> {
		let storedBinaryDataId: string | undefined;
		try {
			const fileId = generateNanoId();
			const fileName = sanitizeFilename(
				Buffer.from(file.originalname, 'latin1').toString('utf8'),
				MAX_AGENT_FILE_METADATA_LENGTH + 1,
			);
			this.validateMetadataLength('File name', fileName);
			const buffer = file.buffer ?? (await readFile(file.path));
			const storedContent = await this.prepareStoredContent(fileName, file.mimetype, buffer);
			this.validateMetadataLength('MIME type', storedContent.mimeType);
			const binaryData: IBinaryData = {
				data: '',
				mimeType: storedContent.mimeType,
				fileName: storedContent.fileName,
				fileSize: `${storedContent.buffer.length}`,
				bytes: storedContent.buffer.length,
				fileExtension: storedContent.fileExtension,
			};

			const storedBinaryData = await this.binaryDataService.store(
				FileLocation.ofCustom({
					sourceType: 'agent_file',
					sourceId: fileId,
					pathSegments: ['agents', agentId, 'files', fileId],
				}),
				storedContent.buffer,
				binaryData,
			);

			if (!storedBinaryData.id) {
				throw new UnexpectedError('Agent file upload requires persisted binary data');
			}
			storedBinaryDataId = storedBinaryData.id;

			const agentFile = this.agentFileRepository.create({
				id: fileId,
				agentId,
				binaryDataId: storedBinaryDataId,
				fileName,
				mimeType: storedContent.mimeType,
				fileSizeBytes: buffer.length,
			});

			return await this.agentFileRepository.save(agentFile);
		} catch (error) {
			if (storedBinaryDataId) {
				await this.binaryDataService.deleteManyByBinaryDataId([storedBinaryDataId]);
			}
			throw error;
		} finally {
			if (file.path) {
				await unlink(file.path).catch(() => {});
			}
		}
	}

	private toDto(file: AgentFile): AgentFileDto {
		return {
			id: file.id,
			agentId: file.agentId,
			fileName: file.fileName,
			mimeType: file.mimeType,
			fileSizeBytes: file.fileSizeBytes,
			createdAt: file.createdAt.toISOString(),
		};
	}

	private toWorkspaceFile(file: AgentFile): KnowledgeWorkspaceFile {
		return {
			id: file.id,
			fileName: file.fileName,
			mimeType: file.mimeType,
			fileSizeBytes: file.fileSizeBytes,
			relativePath: this.getWorkspaceRelativePath(file),
		};
	}

	private assertWorkspaceWithinLimits(files: AgentFile[]) {
		if (files.length > MAX_WORKSPACE_FILES) {
			throw new BadRequestError(
				`Cannot materialize ${files.length} knowledge files at once (limit ${MAX_WORKSPACE_FILES}). Pass file references to narrow the operation.`,
			);
		}
		const totalBytes = files.reduce((total, file) => total + file.fileSizeBytes, 0);
		if (totalBytes > MAX_WORKSPACE_BYTES) {
			throw new BadRequestError(
				`Cannot materialize ${totalBytes} bytes of knowledge files at once (limit ${MAX_WORKSPACE_BYTES}). Pass file references to narrow the operation.`,
			);
		}
	}

	private filterFilesForWorkspace(files: AgentFile[], fileReferences: string[] | undefined) {
		if (!fileReferences) return files;

		const requested = new Set(fileReferences);
		return files.filter(
			(file) =>
				requested.has(file.id) ||
				requested.has(this.getWorkspaceRelativePath(file)) ||
				requested.has(file.fileName),
		);
	}

	private getWorkspaceRelativePath(file: AgentFile) {
		const extension = path.extname(file.fileName).toLowerCase();
		if (extension === '.pdf' && file.mimeType === 'text/plain') {
			return `${file.id}.pdf.txt`;
		}
		return `${file.id}${path.extname(file.fileName)}`;
	}

	private async prepareStoredContent(
		fileName: string,
		mimeType: string,
		buffer: Buffer,
	): Promise<StoredFileContent> {
		if (!this.isPdf(fileName, mimeType)) {
			return {
				buffer,
				mimeType: mimeType || 'application/octet-stream',
				fileName,
				fileExtension: fileName.split('.').pop(),
			};
		}

		const extractedText = await this.extractPdfText(fileName, buffer);
		const extractedBuffer = Buffer.from(extractedText, 'utf8');

		return {
			buffer: extractedBuffer,
			mimeType: 'text/plain',
			fileName: `${fileName}.txt`,
			fileExtension: 'txt',
		};
	}

	private isPdf(fileName: string, mimeType: string) {
		return path.extname(fileName).toLowerCase() === '.pdf' || mimeType === 'application/pdf';
	}

	private async extractPdfText(fileName: string, buffer: Buffer) {
		const { PDFParse } = await import('pdf-parse');
		const parser = new PDFParse({ data: buffer });
		try {
			const result = await parser.getText();
			const text = result.text.trim();
			if (!text) {
				throw new BadRequestError(
					`PDF "${fileName}" contains no extractable text and cannot be added to knowledge`,
				);
			}
			return text;
		} catch (error) {
			if (error instanceof BadRequestError) throw error;
			const message = error instanceof Error ? error.message : 'unknown error';
			throw new BadRequestError(`Failed to extract text from PDF "${fileName}": ${message}`);
		} finally {
			await parser.destroy();
		}
	}

	private validateMetadataLength(label: string, value: string) {
		if (value.length <= MAX_AGENT_FILE_METADATA_LENGTH) return;

		throw new BadRequestError(
			`${label} must be ${MAX_AGENT_FILE_METADATA_LENGTH} characters or less`,
		);
	}

	private async cleanupStoredFiles(files: StoredAgentFile[]) {
		if (files.length === 0) return;

		await this.agentFileRepository.delete(files.map((file) => file.id));
		await this.binaryDataService.deleteManyByBinaryDataId(files.map((file) => file.binaryDataId));
	}

	private async cleanupUploadTempFiles(files: Express.Multer.File[]) {
		await Promise.all(files.map(async (file) => await this.cleanupUploadTempFile(file)));
	}

	private async cleanupUploadTempFile(file: Express.Multer.File) {
		if (!file.path) return;

		await unlink(file.path).catch(() => {});
	}
}
