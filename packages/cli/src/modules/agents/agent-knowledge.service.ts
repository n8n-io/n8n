import {
	MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES,
	MAX_AGENT_KNOWLEDGE_BASE_SIZE_GB,
	type AgentFileDto,
} from '@n8n/api-types';
import {
	writeStreamToSandboxFile,
	type SandboxFilesystem,
	type SandboxInstance,
} from '@n8n/agents/sandbox';
import { Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { generateNanoId, sanitizeFilename } from '@n8n/utils';
import { BinaryDataService, FileLocation } from 'n8n-core';
import { UnexpectedError, type IBinaryData } from 'n8n-workflow';
import { createHash } from 'node:crypto';
import { readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import posixPath from 'node:path/posix';
import type { Readable } from 'node:stream';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AgentFile } from './entities/agent-file.entity';
import { Agent } from './entities/agent.entity';
import { AgentFileRepository } from './repositories/agent-file.repository';
import { AgentRepository } from './repositories/agent.repository';

/**
 * A knowledge file as seen by the agent runtime's `search_knowledge` tool.
 * Carries the stored metadata plus `relativePath`, the path the file is
 * written to inside the materialized sandbox workspace. This is distinct from
 * the API-facing `AgentFileDto`, which instead exposes `createdAt` for the UI.
 */
export interface KnowledgeWorkspaceFile {
	id: string;
	fileName: string;
	mimeType: string;
	fileSizeBytes: number;
	relativePath: string;
}

export interface KnowledgeWorkspaceResolution {
	files: KnowledgeWorkspaceFile[];
}

export interface KnowledgeSandboxWorkspaceResolution {
	files: KnowledgeWorkspaceFile[];
	storedFiles: StoredAgentFile[];
}

export interface KnowledgeWorkspaceFileContent {
	file: KnowledgeWorkspaceFile;
	contentStream: Readable;
}

export interface KnowledgeSandboxManifestFile {
	id: string;
	relativePath: string;
	fileSizeBytes: number;
	binaryDataIdSha1: string;
}

export type KnowledgeSandboxRequiredFile = Pick<
	KnowledgeSandboxManifestFile,
	'id' | 'relativePath' | 'fileSizeBytes'
>;

export interface KnowledgeSandboxManifest {
	version: number;
	agentId: string;
	projectId: string;
	corpusSignature: string;
	files: KnowledgeSandboxManifestFile[];
	materializedAt: string;
}

export interface KnowledgeSandboxExpectedManifest {
	version: number;
	agentId: string;
	projectId: string;
	corpusSignature: string;
	files: KnowledgeSandboxManifestFile[];
}

export interface KnowledgeSandboxMaterializationTarget {
	sandbox: SandboxInstance;
	filesystem: SandboxFilesystem;
	storageMode: 'sandbox-local' | 'daytona-volume';
	knowledgeRoot: string;
	internalRoot: string;
	manifestPath: string;
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
const KNOWLEDGE_SANDBOX_MANIFEST_VERSION = 1;
const KNOWLEDGE_BASE_SIZE_LIMIT_MESSAGE = `Agent knowledge base cannot exceed ${MAX_AGENT_KNOWLEDGE_BASE_SIZE_GB} GB. Delete existing files before uploading more.`;

@Service()
export class AgentKnowledgeService {
	private readonly uploadLocks = new Map<string, Promise<void>>();

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
		return await this.serializeUploadForAgent(agentId, async () => {
			const storedFiles: StoredAgentFile[] = [];

			try {
				await this.agentRepository.manager.transaction(async (trx) => {
					await this.ensureAgentBelongsToProject(agentId, projectId, trx);
					await this.assertAgentKnowledgeBaseSizeWithinLimit(agentId, files, trx);
					// Process sequentially to bound peak memory: each file is read into
					// a buffer and PDFs are parsed in-process, so storing the whole
					// batch in parallel could spike RSS for large uploads.
					for (const file of files) {
						storedFiles.push(await this.storeFile(agentId, file, trx));
					}
				});
			} catch (error) {
				await this.cleanupStoredFiles(storedFiles).catch(() => {});
				throw error;
			} finally {
				await this.cleanupUploadTempFiles(files);
			}

			return storedFiles.map((file) => this.toDto(file));
		});
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

	async openWorkspaceFileStream(
		agentId: string,
		projectId: string,
		fileReference: string,
	): Promise<KnowledgeWorkspaceFileContent> {
		await this.ensureAgentBelongsToProject(agentId, projectId);
		const file = this.resolveStoredWorkspaceFile(
			await this.agentFileRepository.findByAgentId(agentId),
			fileReference,
		);

		return {
			file: this.toWorkspaceFile(file),
			contentStream: await this.binaryDataService.getAsStream(file.binaryDataId),
		};
	}

	async resolveWorkspaceFilesForRuntime(
		agentId: string,
		projectId: string,
		fileReferences?: string[],
	): Promise<KnowledgeWorkspaceResolution> {
		const storedFiles = await this.loadScopedStoredFiles(agentId, projectId, fileReferences);
		return {
			files: storedFiles.map((file) => this.toWorkspaceFile(file)),
		};
	}

	async resolveWorkspaceForSandboxOperation(
		agentId: string,
		projectId: string,
		fileReferences?: string[],
	): Promise<KnowledgeSandboxWorkspaceResolution> {
		const storedFiles = await this.loadScopedStoredFiles(agentId, projectId, fileReferences);
		return {
			files: storedFiles.map((file) => this.toWorkspaceFile(file)),
			storedFiles,
		};
	}

	buildCorpusSignature(files: KnowledgeSandboxManifestFile[]): string {
		const payload = files
			.map(({ id, relativePath, fileSizeBytes, binaryDataIdSha1 }) => ({
				id,
				relativePath,
				fileSizeBytes,
				binaryDataIdSha1,
			}))
			.sort(
				(left, right) =>
					left.relativePath.localeCompare(right.relativePath) ||
					left.id.localeCompare(right.id) ||
					left.binaryDataIdSha1.localeCompare(right.binaryDataIdSha1) ||
					left.fileSizeBytes - right.fileSizeBytes,
			);

		return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
	}

	buildExpectedSandboxManifest(
		agentId: string,
		projectId: string,
		storedFiles: StoredAgentFile[],
	): KnowledgeSandboxExpectedManifest {
		const files = storedFiles.map((file) => this.toManifestFileEntry(file));

		return {
			version: KNOWLEDGE_SANDBOX_MANIFEST_VERSION,
			agentId,
			projectId,
			corpusSignature: this.buildCorpusSignature(files),
			files,
		};
	}

	parseSandboxManifest(raw: unknown): KnowledgeSandboxManifest | null {
		if (!raw || typeof raw !== 'object') return null;

		const manifest = raw as Partial<KnowledgeSandboxManifest>;
		if (manifest.version !== KNOWLEDGE_SANDBOX_MANIFEST_VERSION) return null;
		if (!this.isNonEmptyString(manifest.agentId)) return null;
		if (!this.isNonEmptyString(manifest.projectId)) return null;
		if (!this.isNonEmptyString(manifest.corpusSignature)) return null;
		if (!Array.isArray(manifest.files)) return null;
		if (!manifest.files.every((file) => this.isSandboxManifestFile(file))) return null;
		if (!this.isNonEmptyString(manifest.materializedAt)) return null;

		return {
			version: manifest.version,
			agentId: manifest.agentId,
			projectId: manifest.projectId,
			corpusSignature: manifest.corpusSignature,
			files: manifest.files,
			materializedAt: manifest.materializedAt,
		};
	}

	isSandboxManifestIdentityValid(
		actual: KnowledgeSandboxManifest,
		expected: KnowledgeSandboxExpectedManifest,
	): boolean {
		return (
			actual.version === expected.version &&
			actual.agentId === expected.agentId &&
			actual.projectId === expected.projectId &&
			actual.corpusSignature === expected.corpusSignature
		);
	}

	async findRequiredFilesNeedingMaterialization(
		target: KnowledgeSandboxMaterializationTarget,
		actualManifest: KnowledgeSandboxManifest | null,
		required: KnowledgeSandboxExpectedManifest,
	): Promise<KnowledgeSandboxRequiredFile[]> {
		const materializedById = new Map(
			(actualManifest?.files ?? []).map((file) => [file.id, file] as const),
		);
		const missing: KnowledgeSandboxRequiredFile[] = [];

		for (const requiredFile of required.files) {
			const materialized = materializedById.get(requiredFile.id);
			const targetPath = posixPath.join(target.knowledgeRoot, requiredFile.relativePath);
			const needsMaterialization =
				!materialized ||
				materialized.relativePath !== requiredFile.relativePath ||
				materialized.fileSizeBytes !== requiredFile.fileSizeBytes ||
				materialized.binaryDataIdSha1 !== requiredFile.binaryDataIdSha1 ||
				!(await target.filesystem.exists(targetPath));

			if (needsMaterialization) {
				missing.push({
					id: requiredFile.id,
					fileSizeBytes: requiredFile.fileSizeBytes,
					relativePath: requiredFile.relativePath,
				});
			}
		}

		return missing;
	}

	private isSandboxManifestFile(value: unknown): value is KnowledgeSandboxManifestFile {
		if (!value || typeof value !== 'object') return false;
		const file = value as Record<string, unknown>;
		return (
			typeof file.id === 'string' &&
			typeof file.relativePath === 'string' &&
			typeof file.fileSizeBytes === 'number' &&
			typeof file.binaryDataIdSha1 === 'string'
		);
	}

	private isNonEmptyString(value: unknown): value is string {
		return typeof value === 'string' && value.trim().length > 0;
	}

	async materializeWorkspaceFilesIntoSandbox(
		agentId: string,
		projectId: string,
		target: KnowledgeSandboxMaterializationTarget,
		expectedManifest: KnowledgeSandboxExpectedManifest,
		filesToMaterialize: StoredAgentFile[],
	): Promise<void> {
		await this.ensureAgentBelongsToProject(agentId, projectId);
		if (filesToMaterialize.length === 0) return;

		if (target.storageMode !== 'daytona-volume') {
			await target.filesystem.mkdir(target.knowledgeRoot, { recursive: true });
		}
		await target.filesystem.mkdir(target.internalRoot, { recursive: true });

		const existingManifest = await this.readSandboxManifest(target);
		const materializedEntries: KnowledgeSandboxManifestFile[] = [];

		for (const file of filesToMaterialize) {
			const relativePath = this.getWorkspaceRelativePath(file);
			const targetPath = posixPath.join(target.knowledgeRoot, relativePath);
			try {
				const contentStream = await this.binaryDataService.getAsStream(file.binaryDataId);
				await writeStreamToSandboxFile(
					target.filesystem,
					target.sandbox,
					targetPath,
					contentStream,
					{
						temporaryDirectory: posixPath.join(target.internalRoot, 'upload-parts'),
					},
				);
				materializedEntries.push(this.toManifestFileEntry(file));
			} catch (error) {
				await target.filesystem.deleteFile(targetPath, { force: true }).catch(() => {});
				throw error;
			}
		}

		const manifest = this.mergeSandboxManifest(
			expectedManifest,
			existingManifest,
			materializedEntries,
		);
		await target.filesystem.writeFile(target.manifestPath, JSON.stringify(manifest, null, 2), {
			recursive: true,
			overwrite: true,
		});
	}

	private async ensureAgentBelongsToProject(
		agentId: string,
		projectId: string,
		trx?: EntityManager,
	) {
		const agent = trx
			? await trx.findOne(Agent, {
					where: { id: agentId, projectId },
					...(this.shouldLockAgentForUpload(trx) ? { lock: { mode: 'pessimistic_write' } } : {}),
				})
			: await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}
	}

	private async storeFile(
		agentId: string,
		file: Express.Multer.File,
		trx?: EntityManager,
	): Promise<StoredAgentFile> {
		let storedBinaryDataId: string | undefined;
		try {
			const repository = trx?.getRepository(AgentFile) ?? this.agentFileRepository;
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

			const agentFile = repository.create({
				id: fileId,
				agentId,
				binaryDataId: storedBinaryDataId,
				fileName,
				mimeType: storedContent.mimeType,
				fileSizeBytes: buffer.length,
			});

			return await repository.save(agentFile);
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

	private async loadScopedStoredFiles(
		agentId: string,
		projectId: string,
		fileReferences?: string[],
	): Promise<StoredAgentFile[]> {
		await this.ensureAgentBelongsToProject(agentId, projectId);
		const files = this.filterFilesForWorkspace(
			await this.agentFileRepository.findByAgentId(agentId),
			fileReferences,
		);
		this.assertWorkspaceWithinLimits(files);
		return files.filter((file): file is StoredAgentFile => Boolean(file.binaryDataId));
	}

	private async readSandboxManifest(
		target: KnowledgeSandboxMaterializationTarget,
	): Promise<KnowledgeSandboxManifest | null> {
		try {
			const rawContent = await target.filesystem.readFile(target.manifestPath);
			const content =
				typeof rawContent === 'string'
					? rawContent
					: Buffer.isBuffer(rawContent)
						? rawContent.toString('utf8')
						: String(rawContent);
			return this.parseSandboxManifest(JSON.parse(content));
		} catch {
			return null;
		}
	}

	private mergeSandboxManifest(
		expectedManifest: KnowledgeSandboxExpectedManifest,
		existingManifest: KnowledgeSandboxManifest | null,
		materializedEntries: KnowledgeSandboxManifestFile[],
	): KnowledgeSandboxManifest {
		const mergedById = new Map(
			(existingManifest?.files ?? []).map((file) => [file.id, file] as const),
		);
		for (const entry of materializedEntries) {
			mergedById.set(entry.id, entry);
		}

		return {
			version: expectedManifest.version,
			agentId: expectedManifest.agentId,
			projectId: expectedManifest.projectId,
			corpusSignature: expectedManifest.corpusSignature,
			files: [...mergedById.values()].sort((left, right) =>
				left.relativePath.localeCompare(right.relativePath),
			),
			materializedAt: new Date().toISOString(),
		};
	}

	private toManifestFileEntry(file: StoredAgentFile): KnowledgeSandboxManifestFile {
		return {
			id: file.id,
			relativePath: this.getWorkspaceRelativePath(file),
			fileSizeBytes: file.fileSizeBytes,
			binaryDataIdSha1: createHash('sha1').update(file.binaryDataId).digest('hex'),
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

	private async assertAgentKnowledgeBaseSizeWithinLimit(
		agentId: string,
		incomingFiles: Express.Multer.File[],
		trx?: EntityManager,
	): Promise<void> {
		const existingFiles = trx
			? await trx.find(AgentFile, { where: { agentId } })
			: await this.agentFileRepository.findByAgentId(agentId);
		const existingBytes = existingFiles.reduce((total, file) => total + file.fileSizeBytes, 0);
		const incomingBytes = incomingFiles.reduce(
			(total, file) => total + this.getIncomingUploadSizeBytes(file),
			0,
		);
		if (existingBytes + incomingBytes > MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES) {
			throw new BadRequestError(KNOWLEDGE_BASE_SIZE_LIMIT_MESSAGE);
		}
	}

	private getIncomingUploadSizeBytes(file: Express.Multer.File): number {
		return file.buffer?.length ?? file.size;
	}

	private shouldLockAgentForUpload(trx: EntityManager): boolean {
		return trx.connection.options.type === 'postgres';
	}

	private async serializeUploadForAgent<T>(agentId: string, fn: () => Promise<T>): Promise<T> {
		const previous = this.uploadLocks.get(agentId) ?? Promise.resolve();
		const run = previous.then(fn, fn);
		const tail = run.then(
			() => undefined,
			() => undefined,
		);
		this.uploadLocks.set(agentId, tail);
		try {
			return await run;
		} finally {
			if (this.uploadLocks.get(agentId) === tail) this.uploadLocks.delete(agentId);
		}
	}

	private assertWorkspaceWithinLimits(files: AgentFile[]) {
		if (files.length > MAX_WORKSPACE_FILES) {
			throw new BadRequestError(
				`Cannot materialize ${files.length} knowledge files at once (limit ${MAX_WORKSPACE_FILES}). Pass file references to narrow the operation.`,
			);
		}
		const totalBytes = files.reduce((total, file) => total + file.fileSizeBytes, 0);
		if (totalBytes > MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES) {
			throw new BadRequestError(KNOWLEDGE_BASE_SIZE_LIMIT_MESSAGE);
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

	private resolveStoredWorkspaceFile(files: AgentFile[], fileReference: string): AgentFile {
		const matches = files.filter(
			(file) =>
				file.id === fileReference ||
				this.getWorkspaceRelativePath(file) === fileReference ||
				file.fileName === fileReference,
		);

		if (matches.length === 1) return matches[0];
		if (matches.length === 0) throw new Error(`File "${fileReference}" not found`);
		throw new Error(
			`File "${fileReference}" matches multiple uploaded files. Use the file id or relative path instead.`,
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
