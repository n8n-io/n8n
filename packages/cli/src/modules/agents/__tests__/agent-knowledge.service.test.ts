import { mock } from 'jest-mock-extended';
import { access, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

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
	private readonly files = new Map<string, Buffer>();
	readonly deleteCalls: Array<{ filePath: string; recursive?: boolean }> = [];
	readonly uploadFileCalls: AgentKnowledgeFileUpload[] = [];

	/** Test-only fixture seeding; not part of AgentKnowledgeFilesystem. */
	seed(filePath: string, content: Buffer | string): void {
		const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
		this.files.set(filePath, buffer);
	}

	async uploadFiles(files: AgentKnowledgeFileUpload[]): Promise<void> {
		this.uploadFileCalls.push(...files);
		for (const file of files) {
			if (typeof file.source === 'string') {
				const content = await readFile(file.source);
				this.files.set(file.destination, content);
				continue;
			}
			this.files.set(file.destination, file.source);
		}
	}

	async deleteFile(filePath: string, recursive?: boolean): Promise<void> {
		this.deleteCalls.push({ filePath, recursive });
		if (recursive) {
			for (const key of [...this.files.keys()]) {
				if (key === filePath || key.startsWith(`${filePath}/`)) {
					this.files.delete(key);
				}
			}
			return;
		}
		this.files.delete(filePath);
	}

	async ensureDir(_dirPath: string): Promise<void> {}

	get(pathKey: string): Buffer | undefined {
		return this.files.get(pathKey);
	}
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
	let service: AgentKnowledgeService;

	beforeEach(() => {
		jest.clearAllMocks();
		filesystem = new InMemoryKnowledgeFilesystem();
		agentRepository = mock<AgentRepository>();
		agentFileRepository = new InMemoryAgentFileRepository();
		agentKnowledgeSandboxService = mock<AgentKnowledgeSandboxService>();
		agentKnowledgeSandboxService.withKnowledgeFilesystem.mockImplementation(
			async (_projectId, _agentId, _userId, operation) => await operation(filesystem),
		);
		service = new AgentKnowledgeService(
			agentRepository,
			agentFileRepository as unknown as AgentFileRepository,
			agentKnowledgeSandboxService,
		);
		loadMock.mockResolvedValue([{ pageContent: 'extracted pdf text' }]);
	});

	it('rejects uploads for agents outside the project', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(null);
		const tempDirectory = await mkdtemp(path.join(tmpdir(), 'agent-knowledge-upload-'));
		const tempFilePath = path.join(tempDirectory, 'upload.txt');
		await writeFile(tempFilePath, 'hello');

		await expect(
			service.uploadFiles(
				agentId,
				projectId,
				[makeMulterFile({ path: tempFilePath, buffer: undefined })],
				userId,
			),
		).rejects.toThrow(NotFoundError);
		await expect(access(tempFilePath)).rejects.toThrow();
		expect(agentKnowledgeSandboxService.withKnowledgeFilesystem).not.toHaveBeenCalled();
	});

	it('uploads text files to the volume, creates DB rows, and cleans temp files', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		const tempDirectory = await mkdtemp(path.join(tmpdir(), 'agent-knowledge-upload-'));
		const tempFilePath = path.join(tempDirectory, 'notes.txt');
		await writeFile(tempFilePath, 'hello world');

		const result = await service.uploadFiles(
			agentId,
			projectId,
			[
				makeMulterFile({
					originalname: 'notes.txt',
					mimetype: 'text/plain',
					path: tempFilePath,
					size: 11,
					buffer: undefined,
				}),
			],
			userId,
		);

		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			agentId,
			fileName: 'notes.txt',
			mimeType: 'text/plain',
			fileSizeBytes: 11,
		});

		const storedFile = agentFileRepository.all()[0];
		const storageFileName = fromVolumeStorageReference(storedFile.binaryDataId);
		expect(storageFileName).toBe('notes.txt');
		expect(filesystem.uploadFileCalls).toEqual([
			{
				source: tempFilePath,
				destination: `${KNOWLEDGE_FILES_DIR}/notes.txt`,
			},
		]);
		expect(filesystem.get(`${KNOWLEDGE_FILES_DIR}/notes.txt`)?.toString('utf-8')).toBe(
			'hello world',
		);
		await expect(access(tempFilePath)).rejects.toThrow();
	});

	it('converts pdf uploads to text while preserving the original display metadata', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		const tempDirectory = await mkdtemp(path.join(tmpdir(), 'agent-knowledge-upload-'));
		const tempFilePath = path.join(tempDirectory, 'report.pdf');
		await writeFile(tempFilePath, '%PDF-1.4');

		const result = await service.uploadFiles(
			agentId,
			projectId,
			[
				makeMulterFile({
					originalname: 'report.pdf',
					mimetype: 'application/pdf',
					path: tempFilePath,
					size: 8,
					buffer: undefined,
				}),
			],
			userId,
		);

		expect(result[0]).toMatchObject({
			fileName: 'report.pdf',
			mimeType: 'application/pdf',
			fileSizeBytes: 8,
		});

		const storedFile = agentFileRepository.all()[0];
		expect(fromVolumeStorageReference(storedFile.binaryDataId)).toBe('report.txt');
		expect(filesystem.uploadFileCalls).toEqual([
			{
				source: Buffer.from('extracted pdf text', 'utf-8'),
				destination: `${KNOWLEDGE_FILES_DIR}/report.txt`,
			},
		]);
		expect(filesystem.get(`${KNOWLEDGE_FILES_DIR}/report.txt`)?.toString('utf-8')).toBe(
			'extracted pdf text',
		);
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

	it('lists DB-backed files without touching the sandbox service', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		await agentFileRepository.save(
			makeAgentFile({
				id: 'file-1',
				fileName: 'first.txt',
				mimeType: 'text/plain',
				fileSizeBytes: 4,
				binaryDataId: toVolumeStorageReference('file-1.txt'),
				createdAt: new Date('2026-06-01T10:00:00.000Z'),
			}),
		);
		await agentFileRepository.save(
			makeAgentFile({
				id: 'file-2',
				fileName: 'second.pdf',
				mimeType: 'application/pdf',
				fileSizeBytes: 8,
				binaryDataId: toVolumeStorageReference('file-2.txt'),
				createdAt: new Date('2026-06-02T10:00:00.000Z'),
			}),
		);

		await expect(service.listFiles(agentId, projectId)).resolves.toEqual([
			{
				id: 'file-1',
				agentId,
				fileName: 'first.txt',
				mimeType: 'text/plain',
				fileSizeBytes: 4,
				createdAt: '2026-06-01T10:00:00.000Z',
			},
			{
				id: 'file-2',
				agentId,
				fileName: 'second.pdf',
				mimeType: 'application/pdf',
				fileSizeBytes: 8,
				createdAt: '2026-06-02T10:00:00.000Z',
			},
		]);
		expect(agentKnowledgeSandboxService.withKnowledgeFilesystem).not.toHaveBeenCalled();
	});

	it('deletes stored volume files and DB rows', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		const storedFile = await agentFileRepository.save(
			makeAgentFile({
				id: 'file-1',
				binaryDataId: toVolumeStorageReference('file-1.txt'),
			}),
		);
		filesystem.seed(`${KNOWLEDGE_FILES_DIR}/file-1.txt`, 'hello');

		await expect(service.deleteFile(agentId, projectId, 'file-1', userId)).resolves.toBeUndefined();
		expect(filesystem.get(`${KNOWLEDGE_FILES_DIR}/file-1.txt`)).toBeUndefined();
		expect(agentFileRepository.all()).toEqual([]);
		expect(storedFile.id).toBe('file-1');
	});

	it('treats unknown delete ids as idempotent', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);

		await expect(
			service.deleteFile(agentId, projectId, 'missing-id', userId),
		).resolves.toBeUndefined();
		expect(agentKnowledgeSandboxService.withKnowledgeFilesystem).not.toHaveBeenCalled();
	});

	it('deletes the scoped knowledge files directory and rows for an agent', async () => {
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
		filesystem.seed(`${KNOWLEDGE_FILES_DIR}/file-1.txt`, 'hello');
		filesystem.seed(`${KNOWLEDGE_FILES_DIR}/file-2.md`, '# Title');

		await expect(
			service.deleteAllFilesForAgent(projectId, agentId, userId),
		).resolves.toBeUndefined();
		expect(filesystem.get(`${KNOWLEDGE_FILES_DIR}/file-1.txt`)).toBeUndefined();
		expect(filesystem.get(`${KNOWLEDGE_FILES_DIR}/file-2.md`)).toBeUndefined();
		expect(agentFileRepository.all()).toEqual([]);
		expect(filesystem.deleteCalls).toEqual([{ filePath: KNOWLEDGE_FILES_DIR, recursive: true }]);
		expect(agentKnowledgeSandboxService.withKnowledgeFilesystem).toHaveBeenCalledWith(
			projectId,
			agentId,
			userId,
			expect.any(Function),
		);
	});
});
