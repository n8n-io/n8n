import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { access, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';

import { MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { BinaryDataConfig, BinaryDataService } from 'n8n-core';

import { AgentKnowledgeService } from '../agent-knowledge.service';
import type { AgentKnowledgeSandboxService } from '../agent-knowledge-sandbox.service';
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
 * Real `BinaryDataService` managers fully consume the stream before
 * resolving/rejecting; mock implementations must too, or an unconsumed
 * `createReadStream` lazily opens after the test's temp-file cleanup runs
 * and throws an unhandled ENOENT.
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
		binaryDataId: 'filesystem-v2:agents/agent-1/knowledge-files/file-1/binary_data/uuid',
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
	let agentRepository: Mocked<AgentRepository>;
	let agentFileRepository: InMemoryAgentFileRepository;
	let agentKnowledgeSandboxService: Mocked<AgentKnowledgeSandboxService>;
	let binaryDataService: Mocked<BinaryDataService>;
	let binaryDataConfig: BinaryDataConfig;
	let logger: Mocked<Logger>;
	let service: AgentKnowledgeService;
	let storeSequence: number;

	beforeEach(() => {
		vi.clearAllMocks();
		storeSequence = 0;
		agentRepository = mock<AgentRepository>();
		agentFileRepository = new InMemoryAgentFileRepository();
		agentKnowledgeSandboxService = mock<AgentKnowledgeSandboxService>();
		binaryDataService = mock<BinaryDataService>();
		binaryDataService.store.mockImplementation(async (_location, content, binaryData) => {
			storeSequence += 1;
			await drainIfStream(content);
			return { ...binaryData, id: `filesystem-v2:mock-${storeSequence}` };
		});
		binaryDataService.deleteManyByBinaryDataId.mockResolvedValue(undefined);
		binaryDataConfig = { mode: 'filesystem' } as BinaryDataConfig;
		logger = mock<Logger>();
		service = new AgentKnowledgeService(
			agentRepository,
			agentFileRepository as unknown as AgentFileRepository,
			agentKnowledgeSandboxService,
			binaryDataService,
			binaryDataConfig,
			logger,
		);
		loadMock.mockResolvedValue([{ pageContent: 'extracted pdf text' }]);
	});

	it('stores text and PDF files via BinaryDataService, creates DB rows, and cleans temp files', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
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

		expect(binaryDataService.store).toHaveBeenCalledTimes(2);
		const [textCall, pdfCall] = binaryDataService.store.mock.calls;
		expect(textCall[0]).toEqual(
			expect.objectContaining({
				type: 'custom',
				pathSegments: ['agents', agentId, 'knowledge-files', expect.any(String)],
				sourceType: 'agent_file',
				sourceId: expect.any(String),
			}),
		);
		expect(textCall[1]).toBeInstanceOf(Readable);
		expect(textCall[2]).toEqual(
			expect.objectContaining({ mimeType: 'text/plain', fileName: 'notes.txt' }),
		);
		expect(pdfCall[1]).toEqual(Buffer.from('extracted pdf text', 'utf-8'));
		expect(pdfCall[2]).toEqual(
			expect.objectContaining({ mimeType: 'application/pdf', fileName: 'report.txt' }),
		);

		const [storedTextFile, storedPdfFile] = agentFileRepository.all();
		expect(storedTextFile.binaryDataId).toBe('filesystem-v2:mock-1');
		expect(storedPdfFile.binaryDataId).toBe('filesystem-v2:mock-2');

		await expect(access(textFilePath)).rejects.toThrow();
		await expect(access(pdfFilePath)).rejects.toThrow();
	});

	it('rejects uploads whose file name would escape the knowledge files directory', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);

		await expect(
			service.uploadFiles(agentId, projectId, [makeMulterFile({ originalname: '..' })]),
		).rejects.toThrow('Invalid knowledge file name');

		expect(agentFileRepository.all()).toEqual([]);
		expect(binaryDataService.store).not.toHaveBeenCalled();
	});

	it('cleans up already-stored files when a later upload in the batch fails', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		const tempDirectory = await mkdtemp(path.join(tmpdir(), 'agent-knowledge-upload-'));
		const firstPath = path.join(tempDirectory, 'first.txt');
		const secondPath = path.join(tempDirectory, 'second.txt');
		await writeFile(firstPath, 'hello');
		await writeFile(secondPath, 'world');
		binaryDataService.store
			.mockReset()
			.mockImplementationOnce(async (_location, content, binaryData) => {
				await drainIfStream(content);
				return { ...binaryData, id: 'filesystem-v2:mock-1' };
			})
			.mockImplementationOnce(async (_location, content) => {
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
		expect(binaryDataService.deleteManyByBinaryDataId).toHaveBeenCalledWith([
			'filesystem-v2:mock-1',
		]);
	});

	it('rejects uploads when the binary data service has no persisted storage mode', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		const tempDirectory = await mkdtemp(path.join(tmpdir(), 'agent-knowledge-upload-'));
		const filePath = path.join(tempDirectory, 'notes.txt');
		await writeFile(filePath, 'hello');
		binaryDataService.store.mockImplementationOnce(async (_location, content, binaryData) => {
			await drainIfStream(content);
			return { ...binaryData, id: undefined };
		});

		await expect(
			service.uploadFiles(agentId, projectId, [
				makeMulterFile({ originalname: 'notes.txt', path: filePath, size: 5, buffer: undefined }),
			]),
		).rejects.toThrow('Agent knowledge base requires a persisted binary data storage mode');
		expect(agentFileRepository.all()).toEqual([]);
	});

	it('rejects uploads up front when binary data mode is in-memory', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		binaryDataConfig = { mode: 'default' } as BinaryDataConfig;
		service = new AgentKnowledgeService(
			agentRepository,
			agentFileRepository as unknown as AgentFileRepository,
			agentKnowledgeSandboxService,
			binaryDataService,
			binaryDataConfig,
			logger,
		);

		await expect(
			service.uploadFiles(agentId, projectId, [makeMulterFile({ originalname: 'notes.txt' })]),
		).rejects.toThrow('Agent knowledge base requires a persisted binary data storage mode');
		expect(binaryDataService.store).not.toHaveBeenCalled();
		expect(agentFileRepository.all()).toEqual([]);
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
		expect(binaryDataService.store).toHaveBeenCalledTimes(1);
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
		expect(binaryDataService.store).not.toHaveBeenCalled();
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
		expect(binaryDataService.store).not.toHaveBeenCalled();
	});

	it('deletes the DB row and its binary data', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		await agentFileRepository.save(
			makeAgentFile({ id: 'file-1', binaryDataId: 'filesystem-v2:file-1.txt' }),
		);

		await expect(service.deleteFile(agentId, projectId, 'file-1')).resolves.toBeUndefined();

		expect(agentFileRepository.all()).toEqual([]);
		expect(binaryDataService.deleteManyByBinaryDataId).toHaveBeenCalledWith([
			'filesystem-v2:file-1.txt',
		]);
	});

	it('logs binary data deletion failures without restoring the DB row', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		await agentFileRepository.save(
			makeAgentFile({ id: 'file-1', binaryDataId: 'filesystem-v2:file-1.txt' }),
		);
		binaryDataService.deleteManyByBinaryDataId.mockRejectedValueOnce(new Error('delete failed'));

		await expect(service.deleteFile(agentId, projectId, 'file-1')).resolves.toBeUndefined();

		expect(agentFileRepository.all()).toEqual([]);
		expect(logger.warn).toHaveBeenCalledWith('Failed to delete knowledge file binary data', {
			agentId,
			fileId: 'file-1',
			error: 'delete failed',
		});
	});

	it('deletes all agent files and their binary data', async () => {
		await agentFileRepository.save(
			makeAgentFile({ id: 'file-1', binaryDataId: 'filesystem-v2:file-1.txt' }),
		);
		await agentFileRepository.save(
			makeAgentFile({
				id: 'file-2',
				binaryDataId: 'filesystem-v2:file-2.md',
				fileName: 'guide.md',
				mimeType: 'text/markdown',
			}),
		);

		await expect(service.deleteAllFilesForAgent(projectId, agentId)).resolves.toBeUndefined();

		expect(agentFileRepository.all()).toEqual([]);
		expect(binaryDataService.deleteManyByBinaryDataId).toHaveBeenCalledWith([
			'filesystem-v2:file-1.txt',
			'filesystem-v2:file-2.md',
		]);
		expect(binaryDataService.deleteMany).not.toHaveBeenCalled();
	});

	describe('published-only gating', () => {
		it('rejects uploads for an unpublished agent', async () => {
			agentRepository.findByIdAndProjectId.mockResolvedValue({
				id: agentId,
				projectId,
				activeVersionId: null,
			} as never);

			await expect(service.uploadFiles(agentId, projectId, [makeMulterFile()])).rejects.toThrow(
				'Knowledge base is only available for published agents. Publish the agent first.',
			);
			expect(agentFileRepository.all()).toEqual([]);
			expect(binaryDataService.store).not.toHaveBeenCalled();
		});

		it('rejects warmup for an unpublished agent', async () => {
			agentRepository.findByIdAndProjectId.mockResolvedValue({
				id: agentId,
				projectId,
				activeVersionId: null,
			} as never);

			await expect(service.warmSandbox(agentId, projectId)).rejects.toThrow(
				'Knowledge base is only available for published agents. Publish the agent first.',
			);
			expect(agentKnowledgeSandboxService.warmSandbox).not.toHaveBeenCalled();
		});

		it('allows warmup for a published agent', async () => {
			agentRepository.findByIdAndProjectId.mockResolvedValue({
				id: agentId,
				projectId,
				activeVersionId: 'version-1',
			} as never);

			await expect(service.warmSandbox(agentId, projectId)).resolves.toBeUndefined();
			expect(agentKnowledgeSandboxService.warmSandbox).toHaveBeenCalledWith(projectId, agentId);
		});

		it('still lists and deletes files for an unpublished agent', async () => {
			agentRepository.findByIdAndProjectId.mockResolvedValue({
				id: agentId,
				projectId,
				activeVersionId: null,
			} as never);
			await agentFileRepository.save(makeAgentFile({ id: 'file-1' }));

			await expect(service.listFiles(agentId, projectId)).resolves.toHaveLength(1);
			await expect(service.deleteFile(agentId, projectId, 'file-1')).resolves.toBeUndefined();
			expect(agentFileRepository.all()).toEqual([]);
		});
	});

	it('invalidates and pre-warms the mirror after a successful upload', async () => {
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

		expect(agentKnowledgeSandboxService.invalidateMirror).toHaveBeenCalledWith(projectId, agentId);
		expect(agentKnowledgeSandboxService.prewarmMirrorInBackground).toHaveBeenCalledWith(
			projectId,
			agentId,
		);
	});

	it('invalidates and pre-warms the mirror after a file deletion', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({
			id: agentId,
			projectId,
			activeVersionId: 'version-1',
		} as never);
		await agentFileRepository.save(makeAgentFile({ id: 'file-1' }));

		await service.deleteFile(agentId, projectId, 'file-1');

		expect(agentKnowledgeSandboxService.invalidateMirror).toHaveBeenCalledWith(projectId, agentId);
		expect(agentKnowledgeSandboxService.prewarmMirrorInBackground).toHaveBeenCalledWith(
			projectId,
			agentId,
		);
	});
});
