import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { access, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';

import { MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';

import type { AgentKnowledgeFileStore } from '../agent-knowledge-file-store';
import type { AgentKnowledgeMirrorService } from '../agent-knowledge-mirror.service';
import { AgentKnowledgeService } from '../agent-knowledge.service';
import type { AgentSandboxRuntimeService } from '../agent-sandbox-runtime.service';
import type { AgentFile } from '../entities/agent-file.entity';
import type { AgentFileRepository } from '../repositories/agent-file.repository';
import type { AgentRepository } from '../repositories/agent.repository';

vi.unmock('node:fs');
vi.unmock('node:fs/promises');

const loadMock = vi.fn();
vi.mock('@n8n/ai-utilities', () => ({
	N8nPdfLoader: vi.fn().mockImplementation(function () {
		return {
			load: loadMock,
		};
	}),
}));

/**
 * The knowledge file store writes streams by consuming them; mock
 * implementations must too, or an unconsumed `createReadStream` lazily opens
 * after the test's temp-file cleanup runs and throws an unhandled ENOENT.
 */
async function drainIfStream(content: unknown): Promise<void> {
	if (content instanceof Readable) {
		for await (const _chunk of content) {
			// no-op
		}
	}
}

const agentId = 'agent-1';
const projectId = 'project-1';

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
		storedAt: 'fs',
		storageKey: `agents/${agentId}/knowledge-files/${overrides.id ?? 'file-1'}/content`,
		fileName: 'first.txt',
		mimeType: 'text/plain',
		fileSizeBytes: 4,
		createdAt,
		updatedAt: createdAt,
		agent: undefined as never,
		...overrides,
	} as unknown as AgentFile;
}

class InMemoryAgentFileRepository {
	private readonly files = new Map<string, AgentFile>();

	create(input: Partial<AgentFile>): AgentFile {
		const createdAt = new Date();
		return {
			id: input.id ?? 'generated-id',
			agentId: input.agentId ?? agentId,
			storedAt: input.storedAt ?? 'fs',
			storageKey: input.storageKey ?? '',
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
	let agentRepository: Mocked<AgentRepository>;
	let agentFileRepository: InMemoryAgentFileRepository;
	let agentSandboxRuntimeService: Mocked<AgentSandboxRuntimeService>;
	let agentKnowledgeMirrorService: Mocked<AgentKnowledgeMirrorService>;
	let agentKnowledgeFileStore: Mocked<AgentKnowledgeFileStore>;
	let logger: Mocked<Logger>;
	let service: AgentKnowledgeService;

	beforeEach(() => {
		vi.clearAllMocks();
		agentRepository = mock<AgentRepository>();
		agentFileRepository = new InMemoryAgentFileRepository();
		agentSandboxRuntimeService = mock<AgentSandboxRuntimeService>();
		agentKnowledgeMirrorService = mock<AgentKnowledgeMirrorService>();
		agentKnowledgeFileStore = mock<AgentKnowledgeFileStore>();
		agentKnowledgeFileStore.write.mockImplementation(async (ref, content) => {
			await drainIfStream(content);
			return {
				storedAt: 'fs',
				storageKey: `agents/${ref.agentId}/knowledge-files/${ref.fileId}/content`,
			};
		});
		agentKnowledgeFileStore.delete.mockResolvedValue(undefined);
		logger = mock<Logger>();
		service = new AgentKnowledgeService(
			agentRepository,
			agentFileRepository as unknown as AgentFileRepository,
			agentSandboxRuntimeService,
			agentKnowledgeMirrorService,
			agentKnowledgeFileStore,
			logger,
		);
		loadMock.mockResolvedValue([{ pageContent: 'extracted pdf text' }]);
	});

	it('stores text and PDF files via the knowledge file store, creates DB rows, and cleans temp files', async () => {
		// activeVersionId: null — unpublished agents may upload knowledge files
		agentRepository.findByIdAndProjectId.mockResolvedValue({
			id: agentId,
			projectId,
			activeVersionId: null,
		} as never);
		const tempDirectory = await mkdtemp(path.join(tmpdir(), 'agent-knowledge-upload-'));
		const textFilePath = path.join(tempDirectory, 'notes.txt');
		const pdfFilePath = path.join(tempDirectory, 'report.pdf');
		await writeFile(textFilePath, 'hello world');
		await writeFile(pdfFilePath, '%PDF-1.4');

		const result = await service.uploadFiles(agentId, projectId, [
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
		]);

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

		expect(agentKnowledgeFileStore.write).toHaveBeenCalledTimes(2);
		const [textCall, pdfCall] = agentKnowledgeFileStore.write.mock.calls;
		expect(textCall[0]).toEqual({ agentId, fileId: expect.any(String) });
		expect(textCall[1]).toBeInstanceOf(Readable);
		expect(textCall[2]).toEqual(
			expect.objectContaining({ mimeType: 'text/plain', fileName: 'notes.txt' }),
		);
		expect(pdfCall[1]).toEqual(Buffer.from('extracted pdf text', 'utf-8'));
		expect(pdfCall[2]).toEqual(
			expect.objectContaining({ mimeType: 'application/pdf', fileName: 'report.txt' }),
		);

		const [storedTextFile, storedPdfFile] = agentFileRepository.all();
		expect(storedTextFile.storedAt).toBe('fs');
		expect(storedPdfFile.storedAt).toBe('fs');

		await expect(access(textFilePath)).rejects.toThrow();
		await expect(access(pdfFilePath)).rejects.toThrow();
	});

	it('rejects uploads whose file name would escape the knowledge files directory', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);

		await expect(
			service.uploadFiles(agentId, projectId, [makeMulterFile({ originalname: '..' })]),
		).rejects.toThrow('Invalid knowledge file name');

		expect(agentFileRepository.all()).toEqual([]);
		expect(agentKnowledgeFileStore.write).not.toHaveBeenCalled();
	});

	it('cleans up already-stored files when a later upload in the batch fails', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		const tempDirectory = await mkdtemp(path.join(tmpdir(), 'agent-knowledge-upload-'));
		const firstPath = path.join(tempDirectory, 'first.txt');
		const secondPath = path.join(tempDirectory, 'second.txt');
		await writeFile(firstPath, 'hello');
		await writeFile(secondPath, 'world');
		agentKnowledgeFileStore.write
			.mockReset()
			.mockImplementationOnce(async (ref, content) => {
				await drainIfStream(content);
				return {
					storedAt: 'fs',
					storageKey: `agents/${ref.agentId}/knowledge-files/${ref.fileId}/content`,
				};
			})
			.mockImplementationOnce(async (_ref, content) => {
				await drainIfStream(content);
				throw new Error('store failed');
			});

		await expect(
			service.uploadFiles(agentId, projectId, [
				makeMulterFile({ originalname: 'first.txt', path: firstPath, size: 5, buffer: undefined }),
				makeMulterFile({
					originalname: 'second.txt',
					path: secondPath,
					size: 5,
					buffer: undefined,
				}),
			]),
		).rejects.toThrow('store failed');

		expect(agentFileRepository.all()).toEqual([]);
		expect(agentKnowledgeFileStore.delete).toHaveBeenCalledWith([
			expect.objectContaining({ storedAt: 'fs', storageKey: expect.any(String) }),
		]);
	});

	it('allows uploads that bring the knowledge base exactly to the size limit', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		await agentFileRepository.save(
			makeAgentFile({
				id: 'existing-file',
				fileName: 'existing.txt',
				fileSizeBytes: MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES - 1,
			}),
		);
		const tempDirectory = await mkdtemp(path.join(tmpdir(), 'agent-knowledge-upload-'));
		const tempFilePath = path.join(tempDirectory, 'notes.txt');
		await writeFile(tempFilePath, 'x');

		await expect(
			service.uploadFiles(agentId, projectId, [
				makeMulterFile({
					originalname: 'notes.txt',
					path: tempFilePath,
					size: 1,
					buffer: undefined,
				}),
			]),
		).resolves.toEqual([
			expect.objectContaining({
				agentId,
				fileName: 'notes.txt',
				fileSizeBytes: 1,
			}),
		]);
		expect(agentFileRepository.all()).toHaveLength(2);
		expect(agentKnowledgeFileStore.write).toHaveBeenCalledTimes(1);
	});

	it('rejects uploads that would exceed the knowledge base size limit', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		await agentFileRepository.save(
			makeAgentFile({
				id: 'existing-file',
				fileName: 'existing.txt',
				fileSizeBytes: MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES,
			}),
		);

		await expect(
			service.uploadFiles(agentId, projectId, [
				makeMulterFile({
					originalname: 'notes.txt',
					size: 1,
				}),
			]),
		).rejects.toThrow('Knowledge base limit reached');
		expect(agentFileRepository.all()).toHaveLength(1);
		expect(agentKnowledgeFileStore.write).not.toHaveBeenCalled();
	});

	it('rejects uploads when existing knowledge files already exceed the size limit', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		await agentFileRepository.save(
			makeAgentFile({
				id: 'existing-file',
				fileName: 'existing.txt',
				fileSizeBytes: MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES + 1,
			}),
		);

		await expect(
			service.uploadFiles(agentId, projectId, [
				makeMulterFile({
					originalname: 'notes.txt',
					size: 1,
				}),
			]),
		).rejects.toThrow('Knowledge base limit reached');
		expect(agentFileRepository.all()).toHaveLength(1);
		expect(agentKnowledgeFileStore.write).not.toHaveBeenCalled();
	});

	it('deletes the DB row and its blob', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		await agentFileRepository.save(makeAgentFile({ id: 'file-1', storedAt: 'fs' }));

		await expect(service.deleteFile(agentId, projectId, 'file-1')).resolves.toBeUndefined();

		expect(agentFileRepository.all()).toEqual([]);
		expect(agentKnowledgeFileStore.delete).toHaveBeenCalledWith([
			{ storedAt: 'fs', storageKey: `agents/${agentId}/knowledge-files/file-1/content` },
		]);
	});

	it('logs blob deletion failures without restoring the DB row', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		await agentFileRepository.save(makeAgentFile({ id: 'file-1', storedAt: 'fs' }));
		agentKnowledgeFileStore.delete.mockRejectedValueOnce(new Error('delete failed'));

		await expect(service.deleteFile(agentId, projectId, 'file-1')).resolves.toBeUndefined();

		expect(agentFileRepository.all()).toEqual([]);
		expect(logger.warn).toHaveBeenCalledWith('Failed to delete knowledge file blob', {
			agentId,
			fileId: 'file-1',
			error: 'delete failed',
		});
	});

	it('deletes all agent files and their blobs', async () => {
		await agentFileRepository.save(makeAgentFile({ id: 'file-1', storedAt: 'fs' }));
		await agentFileRepository.save(
			makeAgentFile({
				id: 'file-2',
				storedAt: 's3',
				fileName: 'guide.md',
				mimeType: 'text/markdown',
			}),
		);

		await expect(service.deleteAllFilesForAgent(projectId, agentId)).resolves.toBeUndefined();

		expect(agentFileRepository.all()).toEqual([]);
		expect(agentKnowledgeFileStore.delete).toHaveBeenCalledWith([
			{ storedAt: 'fs', storageKey: `agents/${agentId}/knowledge-files/file-1/content` },
			{ storedAt: 's3', storageKey: `agents/${agentId}/knowledge-files/file-2/content` },
		]);
	});

	it('delegates warmup to the sandbox service for an unpublished agent', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({
			id: agentId,
			projectId,
			activeVersionId: null,
		} as never);

		await expect(service.warmSandbox(agentId, projectId)).resolves.toBeUndefined();
		expect(agentSandboxRuntimeService.warmSandbox).toHaveBeenCalledWith(projectId, agentId);
	});

	it('pre-warms the mirror after a successful upload', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({
			id: agentId,
			projectId,
			activeVersionId: 'version-1',
		} as never);
		const tempDirectory = await mkdtemp(path.join(tmpdir(), 'agent-knowledge-upload-'));
		const tempFilePath = path.join(tempDirectory, 'notes.txt');
		await writeFile(tempFilePath, 'hello world');

		await service.uploadFiles(agentId, projectId, [
			makeMulterFile({
				originalname: 'notes.txt',
				path: tempFilePath,
				size: 11,
				buffer: undefined,
			}),
		]);

		expect(agentKnowledgeMirrorService.prewarmMirrorInBackground).toHaveBeenCalledWith(
			projectId,
			agentId,
		);
	});

	it('pre-warms the mirror after a file deletion', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({
			id: agentId,
			projectId,
			activeVersionId: 'version-1',
		} as never);
		await agentFileRepository.save(makeAgentFile({ id: 'file-1' }));

		await service.deleteFile(agentId, projectId, 'file-1');

		expect(agentKnowledgeMirrorService.prewarmMirrorInBackground).toHaveBeenCalledWith(
			projectId,
			agentId,
		);
	});
});
