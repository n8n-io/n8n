import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';

import { MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import { NotFoundError } from '@n8n/errors';
import type { InstanceSettings } from 'n8n-core';

import type { KnowledgeAvailabilityService } from '@/modules/knowledge/knowledge-availability.service';
import { makeKnowledgeAvailabilityService } from '@/modules/knowledge/__tests__/test-utils/knowledge-availability.service';

import type { AgentKnowledgeFileStore } from '../agent-knowledge-file-store';
import type { AgentKnowledgeMirrorService } from '../agent-knowledge-mirror.service';
import { createKnowledgeTelemetryHmac } from '../agent-knowledge-telemetry';
import { AgentKnowledgeUploadError } from '../agent-knowledge-upload.error';
import { AgentKnowledgeService } from '../agent-knowledge.service';
import type { AgentSandboxRuntimeService } from '../agent-sandbox-runtime.service';
import type { AgentFile } from '../entities/agent-file.entity';
import type { AgentFileRepository } from '../repositories/agent-file.repository';
import type { AgentRepository } from '../repositories/agent.repository';

const instanceSecret = 'instance-secret';

function knowledgeHash(content: string, secret = instanceSecret) {
	return createKnowledgeTelemetryHmac(secret).update(content).digest('hex');
}

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

	function makeService(
		knowledgeAvailabilityService: KnowledgeAvailabilityService = makeKnowledgeAvailabilityService(),
		diagnosticsEnabled = true,
	) {
		return new AgentKnowledgeService(
			agentRepository,
			agentFileRepository as unknown as AgentFileRepository,
			agentSandboxRuntimeService,
			agentKnowledgeMirrorService,
			agentKnowledgeFileStore,
			mock<InstanceSettings>({ hmacSignatureSecret: instanceSecret }),
			logger,
			knowledgeAvailabilityService,
			mock<GlobalConfig>({ diagnostics: { enabled: diagnosticsEnabled } }),
		);
	}

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
		service = makeService();
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
		try {
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

			expect(result.map(({ file }) => file)).toEqual([
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

			expect(result.map(({ contentHash }) => contentHash)).toEqual([
				knowledgeHash('hello world'),
				knowledgeHash('%PDF-1.4'),
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
		} finally {
			await rm(tempDirectory, { recursive: true, force: true });
		}
	});

	it('matches original bytes across names and agents and distinguishes different content', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		const directory = await mkdtemp(path.join(tmpdir(), 'knowledge-hash-'));
		try {
			const hashes: Array<string | undefined> = [];
			for (const [index, content] of ['hello', 'hello', 'different'].entries()) {
				const filePath = path.join(directory, `file-${index}.txt`);
				await writeFile(filePath, content);
				const [result] = await service.uploadFiles(`agent-${index}`, projectId, [
					makeMulterFile({
						path: filePath,
						originalname: `renamed-${index}.txt`,
						size: content.length,
					}),
				]);
				hashes.push(result.contentHash);
				await expect(access(filePath)).rejects.toThrow();
			}
			expect(hashes[0]).toBe(knowledgeHash('hello'));
			expect(hashes[0]).not.toBe(knowledgeHash('hello', 'other-instance-secret'));
			expect(hashes[1]).toBe(hashes[0]);
			expect(hashes[2]).not.toBe(hashes[0]);
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	});

	it('does not hash uploads when telemetry is off', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		service = makeService(makeKnowledgeAvailabilityService(), false);
		const directory = await mkdtemp(path.join(tmpdir(), 'knowledge-hash-disabled-'));
		try {
			const filePath = path.join(directory, 'notes.txt');
			await writeFile(filePath, 'hello');

			const [result] = await service.uploadFiles(agentId, projectId, [
				makeMulterFile({ path: filePath, originalname: 'notes.txt', size: 5 }),
			]);

			expect(result.contentHash).toBeUndefined();
			expect(agentFileRepository.all()).toHaveLength(1);
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	});

	it('continues storage when the telemetry read fails', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		const directory = await mkdtemp(path.join(tmpdir(), 'knowledge-hash-failure-'));
		try {
			// The PDF loader is mocked, so storage can succeed after a failed telemetry read.
			const [result] = await service.uploadFiles(agentId, projectId, [
				makeMulterFile({ path: path.join(directory, 'missing.pdf'), originalname: 'report.pdf' }),
			]);
			expect(result.contentHash).toBeUndefined();
			expect(agentFileRepository.all()).toHaveLength(1);
			expect(logger.warn).toHaveBeenCalledWith(
				'Could not hash an agent knowledge upload for telemetry',
			);
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
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
			{
				file: expect.objectContaining({
					agentId,
					fileName: 'notes.txt',
					fileSizeBytes: 1,
				}),
				contentHash: knowledgeHash('x'),
			},
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

	describe('rejection reasons', () => {
		beforeEach(() => {
			agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		});

		it('gives an unsafe file name the invalid_file_name reason', async () => {
			await expect(
				service.uploadFiles(agentId, projectId, [makeMulterFile({ originalname: '..' })]),
			).rejects.toMatchObject({ reason: 'invalid_file_name' });
		});

		it('gives a too long file name the invalid_file_name reason', async () => {
			await expect(
				service.uploadFiles(agentId, projectId, [
					makeMulterFile({ originalname: 'a'.repeat(256) }),
				]),
			).rejects.toMatchObject({ reason: 'invalid_file_name' });
		});

		it('gives a too long MIME type no reason, so it is reported as unknown', async () => {
			const upload = service.uploadFiles(agentId, projectId, [
				makeMulterFile({ mimetype: 'a'.repeat(256) }),
			]);

			await expect(upload).rejects.toThrow('MIME type must be');
			await expect(upload).rejects.not.toBeInstanceOf(AgentKnowledgeUploadError);
		});

		it('gives a full knowledge base the total_limit reason', async () => {
			await agentFileRepository.save(
				makeAgentFile({ fileSizeBytes: MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES }),
			);

			await expect(
				service.uploadFiles(agentId, projectId, [makeMulterFile({ size: 1 })]),
			).rejects.toMatchObject({ reason: 'total_limit' });
		});

		it('gives an existing file name the duplicate_name reason', async () => {
			await agentFileRepository.save(makeAgentFile({ fileName: 'notes.txt' }));

			await expect(
				service.uploadFiles(agentId, projectId, [makeMulterFile({ originalname: 'notes.txt' })]),
			).rejects.toMatchObject({ reason: 'duplicate_name' });
		});

		it('gives a PDF without text the pdf_no_text reason', async () => {
			loadMock.mockResolvedValue([{ pageContent: '   ' }]);
			const tempDirectory = await mkdtemp(path.join(tmpdir(), 'agent-knowledge-upload-'));
			try {
				const pdfFilePath = path.join(tempDirectory, 'scan.pdf');
				await writeFile(pdfFilePath, '%PDF-1.4');

				await expect(
					service.uploadFiles(agentId, projectId, [
						makeMulterFile({
							originalname: 'scan.pdf',
							mimetype: 'application/pdf',
							path: pdfFilePath,
						}),
					]),
				).rejects.toMatchObject({ reason: 'pdf_no_text' });
			} finally {
				await rm(tempDirectory, { recursive: true, force: true });
			}
		});
	});

	it('returns false and deletes nothing when the agent has no such file', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);

		await expect(service.deleteFile(agentId, projectId, 'missing-file')).resolves.toBe(false);

		expect(agentKnowledgeFileStore.delete).not.toHaveBeenCalled();
	});

	it('deletes the final file, its blob, and the knowledge sandbox', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		await agentFileRepository.save(makeAgentFile({ id: 'file-1', storedAt: 'fs' }));

		await expect(service.deleteFile(agentId, projectId, 'file-1')).resolves.toBe(true);

		expect(agentFileRepository.all()).toEqual([]);
		expect(agentKnowledgeFileStore.delete).toHaveBeenCalledWith([
			{ storedAt: 'fs', storageKey: `agents/${agentId}/knowledge-files/file-1/content` },
		]);
		expect(agentSandboxRuntimeService.destroyKnowledgeSandbox).toHaveBeenCalledWith(
			projectId,
			agentId,
		);
		expect(agentKnowledgeMirrorService.prewarmMirrorInBackground).not.toHaveBeenCalled();
	});

	it('logs blob deletion failures without restoring the DB row', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);
		await agentFileRepository.save(makeAgentFile({ id: 'file-1', storedAt: 'fs' }));
		agentKnowledgeFileStore.delete.mockRejectedValueOnce(new Error('delete failed'));

		await expect(service.deleteFile(agentId, projectId, 'file-1')).resolves.toBe(true);

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

	it('warms the knowledge sandbox for an unpublished agent', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({
			id: agentId,
			projectId,
			activeVersionId: null,
		} as never);
		await agentFileRepository.save(makeAgentFile());

		await expect(service.warmKnowledgeSandbox(agentId, projectId)).resolves.toBeUndefined();
		expect(agentSandboxRuntimeService.warmKnowledgeSandbox).toHaveBeenCalledWith(
			projectId,
			agentId,
		);
	});

	it('does not warm the knowledge sandbox without files', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({ id: agentId, projectId } as never);

		await expect(service.warmKnowledgeSandbox(agentId, projectId)).resolves.toBeUndefined();

		expect(agentSandboxRuntimeService.warmKnowledgeSandbox).not.toHaveBeenCalled();
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

	it('pre-warms the mirror when files remain after a deletion', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({
			id: agentId,
			projectId,
			activeVersionId: 'version-1',
		} as never);
		await agentFileRepository.save(makeAgentFile({ id: 'file-1' }));
		await agentFileRepository.save(makeAgentFile({ id: 'file-2', fileName: 'second.txt' }));

		await service.deleteFile(agentId, projectId, 'file-1');

		expect(agentKnowledgeMirrorService.prewarmMirrorInBackground).toHaveBeenCalledWith(
			projectId,
			agentId,
		);
		expect(agentSandboxRuntimeService.destroyKnowledgeSandbox).not.toHaveBeenCalled();
	});

	describe('with the knowledge module inactive', () => {
		beforeEach(() => {
			service = makeService(makeKnowledgeAvailabilityService({ isKnowledgeActive: false }));
			agentRepository.findByIdAndProjectId.mockResolvedValue({
				id: agentId,
				projectId,
				activeVersionId: null,
			} as never);
		});

		it.each([
			[
				'uploadFiles',
				async () => await service.uploadFiles(agentId, projectId, [makeMulterFile()]),
			],
			['listFiles', async () => await service.listFiles(agentId, projectId)],
			['warmKnowledgeSandbox', async () => await service.warmKnowledgeSandbox(agentId, projectId)],
			['deleteFile', async () => await service.deleteFile(agentId, projectId, 'file-1')],
		])('rejects %s before touching the repository', async (_name, call) => {
			await agentFileRepository.save(makeAgentFile({ id: 'file-1' }));

			await expect(call()).rejects.toThrow(NotFoundError);

			expect(await agentFileRepository.findByAgentId(agentId)).toHaveLength(1);
			expect(agentKnowledgeFileStore.write).not.toHaveBeenCalled();
			expect(agentKnowledgeFileStore.delete).not.toHaveBeenCalled();
			expect(agentSandboxRuntimeService.warmKnowledgeSandbox).not.toHaveBeenCalled();
		});

		it('still deletes all files and their blobs on agent deletion', async () => {
			const file = makeAgentFile({ id: 'file-1' });
			await agentFileRepository.save(file);

			await service.deleteAllFilesForAgent(projectId, agentId);

			expect(await agentFileRepository.findByAgentId(agentId)).toHaveLength(0);
			expect(agentKnowledgeFileStore.delete).toHaveBeenCalledWith([
				{ storedAt: file.storedAt, storageKey: file.storageKey },
			]);
		});

		it('still destroys the sandbox, which needs no module entity', async () => {
			await service.destroyKnowledgeSandbox(projectId, agentId);

			expect(agentSandboxRuntimeService.destroyKnowledgeSandbox).toHaveBeenCalledWith(
				projectId,
				agentId,
			);
		});
	});
});
