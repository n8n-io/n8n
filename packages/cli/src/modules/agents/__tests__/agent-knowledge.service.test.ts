import { mock } from 'jest-mock-extended';
import { access, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';

import {
	fromVolumeStorageReference,
	KNOWLEDGE_FILES_DIR,
	toVolumeStorageReference,
	type AgentKnowledgeFileUpload,
	type AgentKnowledgeFilesystem,
} from '../agent-knowledge-storage';
import { AgentKnowledgeService } from '../agent-knowledge.service';
import type { AgentKnowledgeSandboxService } from '../agent-knowledge-sandbox.service';
import type { AgentFile } from '../entities/agent-file.entity';
import type { AgentFileRepository } from '../repositories/agent-file.repository';
import type { AgentRepository } from '../repositories/agent.repository';

jest.unmock('node:fs');
jest.unmock('node:fs/promises');

const loadMock = jest.fn();
jest.mock('@n8n/ai-utilities', () => ({
	N8nPdfLoader: jest.fn().mockImplementation(() => ({
		load: loadMock,
	})),
}));

const agentId = 'agent-1';
const projectId = 'project-1';
const userId = 'user-1';

function makeMulterFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
	return {
		fieldname: 'files',
		originalname: 'document.txt',
		encoding: '7bit',
		mimetype: 'text/plain',
		buffer: Buffer.from('hello'),
		size: 5,
		stream: null as never,
		destination: '',
		filename: '',
		path: '',
		...overrides,
	};
}

function makeAgentFile(overrides: Partial<AgentFile> = {}): AgentFile {
	const createdAt = overrides.createdAt ?? new Date('2026-06-01T10:00:00.000Z');
	return {
		id: 'file-1',
		agentId,
		binaryDataId: toVolumeStorageReference('file-1.txt'),
		fileName: 'first.txt',
		mimeType: 'text/plain',
		fileSizeBytes: 4,
		createdAt,
		updatedAt: createdAt,
		agent: undefined as never,
		...overrides,
	} as unknown as AgentFile;
}

class InMemoryKnowledgeFilesystem implements AgentKnowledgeFilesystem {
	readonly deleteCalls: Array<{ filePath: string; recursive?: boolean }> = [];
	readonly uploadFileCalls: AgentKnowledgeFileUpload[] = [];

	async uploadFiles(files: AgentKnowledgeFileUpload[]): Promise<void> {
		this.uploadFileCalls.push(...files);
	}

	async deleteFile(filePath: string, recursive?: boolean): Promise<void> {
		this.deleteCalls.push({ filePath, recursive });
	}

	async ensureDir(_dirPath: string): Promise<void> {}
}

class InMemoryAgentFileRepository {
	private readonly files = new Map<string, AgentFile>();

	create(input: Partial<AgentFile>): AgentFile {
		const createdAt = new Date();
		return {
			id: input.id ?? 'generated-id',
			agentId: input.agentId ?? agentId,
			binaryDataId: input.binaryDataId ?? '',
			fileName: input.fileName ?? '',
			mimeType: input.mimeType ?? '',
			fileSizeBytes: input.fileSizeBytes ?? 0,
			createdAt,
			updatedAt: createdAt,
			agent: undefined as never,
		} as unknown as AgentFile;
	}

	async save(file: AgentFile): Promise<AgentFile> {
		this.files.set(file.id, { ...file });
		return file;
	}

	async findByAgentId(agentIdToFind: string): Promise<AgentFile[]> {
		return [...this.files.values()]
			.filter((file) => file.agentId === agentIdToFind)
			.sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
	}

	async hasFilesForAgent(agentIdToFind: string): Promise<boolean> {
		return [...this.files.values()].some((file) => file.agentId === agentIdToFind);
	}

	async findByIdAndAgentId(fileId: string, agentIdToFind: string): Promise<AgentFile | null> {
		const file = this.files.get(fileId);
		if (!file || file.agentId !== agentIdToFind) {
			return null;
		}
		return file;
	}

	async delete(criteria: { id?: string; agentId?: string }): Promise<void> {
		for (const [id, file] of this.files.entries()) {
			if (criteria.id && file.id !== criteria.id) continue;
			if (criteria.agentId && file.agentId !== criteria.agentId) continue;
			this.files.delete(id);
		}
	}

	all(): AgentFile[] {
		return [...this.files.values()];
	}
}

describe('AgentKnowledgeService', () => {
	let agentRepository: jest.Mocked<AgentRepository>;
	let agentFileRepository: InMemoryAgentFileRepository;
	let agentKnowledgeSandboxService: jest.Mocked<AgentKnowledgeSandboxService>;
	let filesystem: InMemoryKnowledgeFilesystem;
	let logger: jest.Mocked<Logger>;
	let service: AgentKnowledgeService;

	beforeEach(() => {
		jest.clearAllMocks();
		filesystem = new InMemoryKnowledgeFilesystem();
		agentRepository = mock<AgentRepository>();
		agentFileRepository = new InMemoryAgentFileRepository();
		agentKnowledgeSandboxService = mock<AgentKnowledgeSandboxService>();
		logger = mock<Logger>();
		agentKnowledgeSandboxService.withKnowledgeFilesystem.mockImplementation(
			async (_projectId, _agentId, _userId, operation) => await operation(filesystem),
		);
		service = new AgentKnowledgeService(
			agentRepository,
			agentFileRepository as unknown as AgentFileRepository,
			agentKnowledgeSandboxService,
			logger,
		);
		loadMock.mockResolvedValue([{ pageContent: 'extracted pdf text' }]);
	});

	it('uploads text and PDF files to the volume, creates DB rows, and cleans temp files', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		const tempDirectory = await mkdtemp(path.join(tmpdir(), 'agent-knowledge-upload-'));
		const textFilePath = path.join(tempDirectory, 'notes.txt');
		const pdfFilePath = path.join(tempDirectory, 'report.pdf');
		await writeFile(textFilePath, 'hello world');
		await writeFile(pdfFilePath, '%PDF-1.4');

		const result = await service.uploadFiles(
			agentId,
			projectId,
			[
				makeMulterFile({
					originalname: 'notes.txt',
					mimetype: 'text/plain',
					path: textFilePath,
					size: 11,
					buffer: undefined,
				}),
				makeMulterFile({
					originalname: 'report.pdf',
					mimetype: 'application/pdf',
					path: pdfFilePath,
					size: 8,
					buffer: undefined,
				}),
			],
			userId,
		);

		expect(result).toEqual([
			expect.objectContaining({
				agentId,
				fileName: 'notes.txt',
				mimeType: 'text/plain',
				fileSizeBytes: 11,
			}),
			expect.objectContaining({
				agentId,
				fileName: 'report.pdf',
				mimeType: 'application/pdf',
				fileSizeBytes: 8,
			}),
		]);

		const [storedTextFile, storedPdfFile] = agentFileRepository.all();
		expect(fromVolumeStorageReference(storedTextFile.binaryDataId)).toBe('notes.txt');
		expect(fromVolumeStorageReference(storedPdfFile.binaryDataId)).toBe('report.txt');
		expect(filesystem.uploadFileCalls).toEqual([
			{
				source: textFilePath,
				destination: `${KNOWLEDGE_FILES_DIR}/notes.txt`,
			},
			{
				source: Buffer.from('extracted pdf text', 'utf-8'),
				destination: `${KNOWLEDGE_FILES_DIR}/report.txt`,
			},
		]);
		await expect(access(textFilePath)).rejects.toThrow();
		await expect(access(pdfFilePath)).rejects.toThrow();
	});

	it('rejects uploads whose file name would escape the knowledge files directory', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);

		await expect(
			service.uploadFiles(agentId, projectId, [makeMulterFile({ originalname: '..' })], userId),
		).rejects.toThrow('Invalid knowledge file name');

		expect(agentFileRepository.all()).toEqual([]);
		expect(filesystem.uploadFileCalls).toEqual([]);
	});

	it('removes the DB row when volume sync fails after create', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		const tempDirectory = await mkdtemp(path.join(tmpdir(), 'agent-knowledge-upload-'));
		const tempFilePath = path.join(tempDirectory, 'notes.txt');
		await writeFile(tempFilePath, 'hello world');
		filesystem.uploadFiles = jest.fn().mockRejectedValue(new Error('volume write failed'));

		await expect(
			service.uploadFiles(
				agentId,
				projectId,
				[
					makeMulterFile({
						originalname: 'notes.txt',
						path: tempFilePath,
						size: 11,
						buffer: undefined,
					}),
				],
				userId,
			),
		).rejects.toThrow('volume write failed');
		expect(agentFileRepository.all()).toEqual([]);
	});

	it('allows uploads that bring the knowledge base exactly to the size limit', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		await agentFileRepository.save(
			makeAgentFile({
				id: 'existing-file',
				fileName: 'existing.txt',
				binaryDataId: toVolumeStorageReference('existing.txt'),
				fileSizeBytes: MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES - 1,
			}),
		);
		const tempDirectory = await mkdtemp(path.join(tmpdir(), 'agent-knowledge-upload-'));
		const tempFilePath = path.join(tempDirectory, 'notes.txt');
		await writeFile(tempFilePath, 'x');

		await expect(
			service.uploadFiles(
				agentId,
				projectId,
				[
					makeMulterFile({
						originalname: 'notes.txt',
						path: tempFilePath,
						size: 1,
						buffer: undefined,
					}),
				],
				userId,
			),
		).resolves.toEqual([
			expect.objectContaining({
				agentId,
				fileName: 'notes.txt',
				fileSizeBytes: 1,
			}),
		]);
		expect(agentFileRepository.all()).toHaveLength(2);
		expect(filesystem.uploadFileCalls).toEqual([
			{
				source: tempFilePath,
				destination: `${KNOWLEDGE_FILES_DIR}/notes.txt`,
			},
		]);
	});

	it('rejects uploads that would exceed the knowledge base size limit', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		await agentFileRepository.save(
			makeAgentFile({
				id: 'existing-file',
				fileName: 'existing.txt',
				binaryDataId: toVolumeStorageReference('existing.txt'),
				fileSizeBytes: MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES,
			}),
		);

		await expect(
			service.uploadFiles(
				agentId,
				projectId,
				[
					makeMulterFile({
						originalname: 'notes.txt',
						size: 1,
					}),
				],
				userId,
			),
		).rejects.toThrow('Knowledge base limit reached');
		expect(agentFileRepository.all()).toHaveLength(1);
		expect(filesystem.uploadFileCalls).toEqual([]);
		expect(agentKnowledgeSandboxService.withKnowledgeFilesystem).not.toHaveBeenCalled();
	});

	it('rejects uploads when existing knowledge files already exceed the size limit', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		await agentFileRepository.save(
			makeAgentFile({
				id: 'existing-file',
				fileName: 'existing.txt',
				binaryDataId: toVolumeStorageReference('existing.txt'),
				fileSizeBytes: MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES + 1,
			}),
		);

		await expect(
			service.uploadFiles(
				agentId,
				projectId,
				[
					makeMulterFile({
						originalname: 'notes.txt',
						size: 1,
					}),
				],
				userId,
			),
		).rejects.toThrow('Knowledge base limit reached');
		expect(agentFileRepository.all()).toHaveLength(1);
		expect(filesystem.uploadFileCalls).toEqual([]);
		expect(agentKnowledgeSandboxService.withKnowledgeFilesystem).not.toHaveBeenCalled();
	});

	it('deletes the DB row and starts volume cleanup in the background', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		await agentFileRepository.save(
			makeAgentFile({
				id: 'file-1',
				binaryDataId: toVolumeStorageReference('file-1.txt'),
			}),
		);

		await expect(service.deleteFile(agentId, projectId, 'file-1', userId)).resolves.toBeUndefined();
		expect(agentFileRepository.all()).toEqual([]);
		expect(agentKnowledgeSandboxService.withKnowledgeFilesystem).toHaveBeenCalledWith(
			projectId,
			agentId,
			userId,
			expect.any(Function),
		);
		expect(filesystem.deleteCalls).toEqual([
			{ filePath: `${KNOWLEDGE_FILES_DIR}/file-1.txt`, recursive: undefined },
		]);
	});

	it('does not wait for volume file cleanup', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		await agentFileRepository.save(
			makeAgentFile({
				id: 'file-1',
				binaryDataId: toVolumeStorageReference('file-1.txt'),
			}),
		);
		agentKnowledgeSandboxService.withKnowledgeFilesystem.mockReturnValueOnce(
			new Promise(() => {}) as never,
		);

		await expect(service.deleteFile(agentId, projectId, 'file-1', userId)).resolves.toBeUndefined();
		expect(agentFileRepository.all()).toEqual([]);
		expect(agentKnowledgeSandboxService.withKnowledgeFilesystem).toHaveBeenCalledWith(
			projectId,
			agentId,
			userId,
			expect.any(Function),
		);
	});

	it('logs volume file cleanup failures without restoring the DB row', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		await agentFileRepository.save(
			makeAgentFile({
				id: 'file-1',
				binaryDataId: toVolumeStorageReference('file-1.txt'),
			}),
		);
		filesystem.deleteFile = jest.fn().mockRejectedValue(new Error('volume delete failed'));

		await expect(service.deleteFile(agentId, projectId, 'file-1', userId)).resolves.toBeUndefined();
		await Promise.resolve();
		await Promise.resolve();

		expect(agentFileRepository.all()).toEqual([]);
		expect(logger.warn).toHaveBeenCalledWith('Failed to delete knowledge file from volume', {
			agentId,
			fileId: 'file-1',
			error: 'volume delete failed',
		});
	});

	it('deletes scoped knowledge files in the background', async () => {
		await expect(
			service.deleteAllFilesForAgent(projectId, agentId, userId),
		).resolves.toBeUndefined();

		expect(filesystem.deleteCalls).toEqual([{ filePath: KNOWLEDGE_FILES_DIR, recursive: true }]);
	});

	it('deletes agent file DB rows without waiting for directory cleanup', async () => {
		await agentFileRepository.save(
			makeAgentFile({
				id: 'file-1',
				binaryDataId: toVolumeStorageReference('file-1.txt'),
			}),
		);
		await agentFileRepository.save(
			makeAgentFile({
				id: 'file-2',
				binaryDataId: toVolumeStorageReference('file-2.md'),
				fileName: 'guide.md',
				mimeType: 'text/markdown',
			}),
		);
		agentKnowledgeSandboxService.withKnowledgeFilesystem.mockReturnValueOnce(
			new Promise(() => {}) as never,
		);

		await expect(
			service.deleteAllFilesForAgent(projectId, agentId, userId),
		).resolves.toBeUndefined();
		expect(agentFileRepository.all()).toEqual([]);
		expect(agentKnowledgeSandboxService.withKnowledgeFilesystem).toHaveBeenCalledWith(
			projectId,
			agentId,
			userId,
			expect.any(Function),
		);
		expect(filesystem.deleteCalls).toEqual([]);
	});
});
