import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';

import { MAX_AGENT_FILE_SIZE_BYTES, MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { OperationContext, Transaction } from '@n8n/db';
import type { InstanceSettings } from 'n8n-core';

import type { KnowledgeFile } from '../../entities/knowledge-file.entity';
import type { KnowledgeConsumerScope } from '../../knowledge-consumer-scope';
import type { KnowledgeSandboxProviderRegistry } from '../../knowledge-sandbox-provider-registry';
import { createKnowledgeTelemetryHmac } from '../../telemetry/helpers';
import type { KnowledgeFileRepository } from '../../repositories/knowledge-file.repository';
import type { KnowledgeMirrorService } from '../../retrieval/mirror.service';
import type { KnowledgeFileStore } from '../knowledge-file-store';
import { KnowledgeFileService, type KnowledgeWriteRunner } from '../knowledge-file.service';
import { KnowledgeUploadError } from '../knowledge-upload.error';

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
const scope: KnowledgeConsumerScope = { kind: 'agent', projectId, agentId };

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

function makeAgentFile(overrides: Partial<KnowledgeFile> = {}): KnowledgeFile {
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
	} as unknown as KnowledgeFile;
}

class InMemoryAgentFileRepository {
	private readonly files = new Map<string, KnowledgeFile>();

	private create(input: Partial<KnowledgeFile>): KnowledgeFile {
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
		} as unknown as KnowledgeFile;
	}

	async save(file: KnowledgeFile): Promise<KnowledgeFile> {
		this.files.set(file.id, { ...file });
		return file;
	}

	async saveUploadedFile(
		input: Parameters<KnowledgeFileRepository['saveUploadedFile']>[0],
	): Promise<KnowledgeFile> {
		return await this.save(this.create(input));
	}

	async findByAgentId(agentIdToFind: string): Promise<KnowledgeFile[]> {
		return [...this.files.values()]
			.filter((file) => file.agentId === agentIdToFind)
			.sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
	}

	async hasFilesForAgent(agentIdToFind: string): Promise<boolean> {
		return [...this.files.values()].some((file) => file.agentId === agentIdToFind);
	}

	async findByIdAndAgentId(fileId: string, agentIdToFind: string): Promise<KnowledgeFile | null> {
		const file = this.files.get(fileId);
		if (!file || file.agentId !== agentIdToFind) {
			return null;
		}
		return file;
	}

	async deleteByIdAndAgentId(fileId: string, agentIdToFind: string): Promise<void> {
		await this.delete({ id: fileId, agentId: agentIdToFind });
	}

	async deleteByAgentId(agentIdToFind: string): Promise<void> {
		await this.delete({ agentId: agentIdToFind });
	}

	private async delete(criteria: { id?: string; agentId?: string }): Promise<void> {
		for (const [id, file] of this.files.entries()) {
			if (criteria.id && file.id !== criteria.id) continue;
			if (criteria.agentId && file.agentId !== criteria.agentId) continue;
			this.files.delete(id);
		}
	}

	all(): KnowledgeFile[] {
		return [...this.files.values()];
	}
}

/** The consumer's fence is the facade's job; here the row write runs as it is. */
const writeFence: KnowledgeWriteRunner = async (write) => await write({});

describe('KnowledgeFileService', () => {
	let agentFileRepository: InMemoryAgentFileRepository;
	let agentKnowledgeFileStore: Mocked<KnowledgeFileStore>;
	let mirrorService: Mocked<KnowledgeMirrorService>;
	let sandboxProvider: Mocked<KnowledgeSandboxProviderRegistry>;
	let logger: Mocked<Logger>;
	let service: KnowledgeFileService;

	function makeService(diagnosticsEnabled = true) {
		return new KnowledgeFileService(
			agentFileRepository as unknown as KnowledgeFileRepository,
			agentKnowledgeFileStore,
			mirrorService,
			sandboxProvider,
			mock<InstanceSettings>({ hmacSignatureSecret: instanceSecret }),
			mock<GlobalConfig>({ diagnostics: { enabled: diagnosticsEnabled } }),
			logger,
		);
	}

	beforeEach(() => {
		vi.clearAllMocks();
		agentFileRepository = new InMemoryAgentFileRepository();
		agentKnowledgeFileStore = mock<KnowledgeFileStore>();
		agentKnowledgeFileStore.write.mockImplementation(async (ref, content) => {
			await drainIfStream(content);
			return {
				storedAt: 'fs',
				storageKey: `agents/${ref.agentId}/knowledge-files/${ref.fileId}/content`,
			};
		});
		agentKnowledgeFileStore.delete.mockResolvedValue(undefined);
		mirrorService = mock<KnowledgeMirrorService>();
		sandboxProvider = mock<KnowledgeSandboxProviderRegistry>();
		logger = mock<Logger>();
		logger.scoped.mockReturnValue(logger);
		service = makeService();
		loadMock.mockResolvedValue([{ pageContent: 'extracted pdf text' }]);
	});

	it('stores text and PDF files via the knowledge file store, creates DB rows, and cleans temp files', async () => {
		const tempDirectory = await mkdtemp(path.join(tmpdir(), 'agent-knowledge-upload-'));
		try {
			const textFilePath = path.join(tempDirectory, 'notes.txt');
			const pdfFilePath = path.join(tempDirectory, 'report.pdf');
			await writeFile(textFilePath, 'hello world');
			await writeFile(pdfFilePath, '%PDF-1.4');

			const result = await service.uploadFiles(
				scope,
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
				writeFence,
			);

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

	it('reserves each row through the consumer write runner and passes its context to the repository', async () => {
		const saveUploadedFile = vi.spyOn(agentFileRepository, 'saveUploadedFile');
		const ctx: OperationContext = { trx: mock<Transaction>() };
		const reservations = vi.fn();
		const writeFenceWithContext: KnowledgeWriteRunner = async (write) => {
			reservations();
			return await write(ctx);
		};
		const tempDirectory = await mkdtemp(path.join(tmpdir(), 'agent-knowledge-upload-'));
		try {
			const files = ['first.txt', 'second.txt'].map((fileName) => ({
				fileName,
				filePath: path.join(tempDirectory, fileName),
			}));
			for (const { filePath } of files) await writeFile(filePath, 'hello');

			await service.uploadFiles(
				scope,
				files.map(({ fileName, filePath }) =>
					makeMulterFile({ originalname: fileName, path: filePath, size: 5, buffer: undefined }),
				),
				writeFenceWithContext,
			);

			expect(reservations).toHaveBeenCalledTimes(2);
			expect(saveUploadedFile).toHaveBeenCalledTimes(2);
			expect(saveUploadedFile).toHaveBeenCalledWith(expect.objectContaining({ agentId }), ctx);
		} finally {
			await rm(tempDirectory, { recursive: true, force: true });
		}
	});

	it('matches original bytes across names and agents and distinguishes different content', async () => {
		const directory = await mkdtemp(path.join(tmpdir(), 'knowledge-hash-'));
		try {
			const hashes: Array<string | undefined> = [];
			for (const [index, content] of ['hello', 'hello', 'different'].entries()) {
				const filePath = path.join(directory, `file-${index}.txt`);
				await writeFile(filePath, content);
				const [result] = await service.uploadFiles(
					{ ...scope, agentId: `agent-${index}` },
					[
						makeMulterFile({
							path: filePath,
							originalname: `renamed-${index}.txt`,
							size: content.length,
						}),
					],
					writeFence,
				);
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
		service = makeService(false);
		const directory = await mkdtemp(path.join(tmpdir(), 'knowledge-hash-disabled-'));
		try {
			const filePath = path.join(directory, 'notes.txt');
			await writeFile(filePath, 'hello');

			const [result] = await service.uploadFiles(
				scope,
				[makeMulterFile({ path: filePath, originalname: 'notes.txt', size: 5 })],
				writeFence,
			);

			expect(result.contentHash).toBeUndefined();
			expect(agentFileRepository.all()).toHaveLength(1);
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	});

	it('continues storage when the telemetry read fails', async () => {
		const directory = await mkdtemp(path.join(tmpdir(), 'knowledge-hash-failure-'));
		try {
			// The PDF loader is mocked, so storage can succeed after a failed telemetry read.
			const [result] = await service.uploadFiles(
				scope,
				[makeMulterFile({ path: path.join(directory, 'missing.pdf'), originalname: 'report.pdf' })],
				writeFence,
			);
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
		await expect(
			service.uploadFiles(scope, [makeMulterFile({ originalname: '..' })], writeFence),
		).rejects.toThrow('Invalid knowledge file name');

		expect(agentFileRepository.all()).toEqual([]);
		expect(agentKnowledgeFileStore.write).not.toHaveBeenCalled();
	});

	it('cleans up already-stored files when a later upload in the batch fails', async () => {
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
			service.uploadFiles(
				scope,
				[
					makeMulterFile({
						originalname: 'first.txt',
						path: firstPath,
						size: 5,
						buffer: undefined,
					}),
					makeMulterFile({
						originalname: 'second.txt',
						path: secondPath,
						size: 5,
						buffer: undefined,
					}),
				],
				writeFence,
			),
		).rejects.toThrow('store failed');

		expect(agentFileRepository.all()).toEqual([]);
		expect(agentKnowledgeFileStore.delete).toHaveBeenCalledWith([
			expect.objectContaining({ storedAt: 'fs', storageKey: expect.any(String) }),
		]);
	});

	it('allows uploads that bring the knowledge base exactly to the size limit', async () => {
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
			service.uploadFiles(
				scope,
				[
					makeMulterFile({
						originalname: 'notes.txt',
						path: tempFilePath,
						size: 1,
						buffer: undefined,
					}),
				],
				writeFence,
			),
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
		await agentFileRepository.save(
			makeAgentFile({
				id: 'existing-file',
				fileName: 'existing.txt',
				fileSizeBytes: MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES,
			}),
		);

		await expect(
			service.uploadFiles(
				scope,
				[
					makeMulterFile({
						originalname: 'notes.txt',
						size: 1,
					}),
				],
				writeFence,
			),
		).rejects.toThrow('Knowledge base limit reached');
		expect(agentFileRepository.all()).toHaveLength(1);
		expect(agentKnowledgeFileStore.write).not.toHaveBeenCalled();
	});

	it('rejects uploads when existing knowledge files already exceed the size limit', async () => {
		await agentFileRepository.save(
			makeAgentFile({
				id: 'existing-file',
				fileName: 'existing.txt',
				fileSizeBytes: MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES + 1,
			}),
		);

		await expect(
			service.uploadFiles(
				scope,
				[
					makeMulterFile({
						originalname: 'notes.txt',
						size: 1,
					}),
				],
				writeFence,
			),
		).rejects.toThrow('Knowledge base limit reached');
		expect(agentFileRepository.all()).toHaveLength(1);
		expect(agentKnowledgeFileStore.write).not.toHaveBeenCalled();
	});

	describe('rejection reasons', () => {
		beforeEach(() => {});

		it('gives an unsafe file name the invalid_file_name reason', async () => {
			await expect(
				service.uploadFiles(scope, [makeMulterFile({ originalname: '..' })], writeFence),
			).rejects.toMatchObject({ reason: 'invalid_file_name' });
		});

		it('gives a too long file name the invalid_file_name reason', async () => {
			await expect(
				service.uploadFiles(scope, [makeMulterFile({ originalname: 'a'.repeat(256) })], writeFence),
			).rejects.toMatchObject({ reason: 'invalid_file_name' });
		});

		it('gives a too long MIME type no reason, so it is reported as unknown', async () => {
			const upload = service.uploadFiles(
				scope,
				[makeMulterFile({ mimetype: 'a'.repeat(256) })],
				writeFence,
			);

			await expect(upload).rejects.toThrow('MIME type must be');
			await expect(upload).rejects.not.toBeInstanceOf(KnowledgeUploadError);
		});

		it('gives a full knowledge base the total_limit reason', async () => {
			await agentFileRepository.save(
				makeAgentFile({ fileSizeBytes: MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES }),
			);

			await expect(
				service.uploadFiles(scope, [makeMulterFile({ size: 1 })], writeFence),
			).rejects.toMatchObject({ reason: 'total_limit' });
		});

		it('gives an existing file name the duplicate_name reason', async () => {
			await agentFileRepository.save(makeAgentFile({ fileName: 'notes.txt' }));

			await expect(
				service.uploadFiles(scope, [makeMulterFile({ originalname: 'notes.txt' })], writeFence),
			).rejects.toMatchObject({ reason: 'duplicate_name' });
		});

		it('gives a PDF without text the pdf_no_text reason', async () => {
			loadMock.mockResolvedValue([{ pageContent: '   ' }]);
			const tempDirectory = await mkdtemp(path.join(tmpdir(), 'agent-knowledge-upload-'));
			try {
				const pdfFilePath = path.join(tempDirectory, 'scan.pdf');
				await writeFile(pdfFilePath, '%PDF-1.4');

				await expect(
					service.uploadFiles(
						scope,
						[
							makeMulterFile({
								originalname: 'scan.pdf',
								mimetype: 'application/pdf',
								path: pdfFilePath,
							}),
						],
						writeFence,
					),
				).rejects.toMatchObject({ reason: 'pdf_no_text' });
			} finally {
				await rm(tempDirectory, { recursive: true, force: true });
			}
		});

		it('gives a PDF whose text is above the file size limit the file_size reason', async () => {
			loadMock.mockResolvedValue([{ pageContent: 'a'.repeat(MAX_AGENT_FILE_SIZE_BYTES + 1) }]);
			const tempDirectory = await mkdtemp(path.join(tmpdir(), 'agent-knowledge-upload-'));
			try {
				const pdfFilePath = path.join(tempDirectory, 'large.pdf');
				await writeFile(pdfFilePath, '%PDF-1.4');

				await expect(
					service.uploadFiles(
						scope,
						[
							makeMulterFile({
								originalname: 'large.pdf',
								mimetype: 'application/pdf',
								path: pdfFilePath,
							}),
						],
						writeFence,
					),
				).rejects.toMatchObject({ reason: 'file_size' });
			} finally {
				await rm(tempDirectory, { recursive: true, force: true });
			}
		});
	});

	it('returns false and deletes nothing when the agent has no such file', async () => {
		await expect(service.deleteFile(scope, 'missing-file', writeFence)).resolves.toBe(false);

		expect(agentKnowledgeFileStore.delete).not.toHaveBeenCalled();
		expect(mirrorService.prewarmMirrorInBackground).not.toHaveBeenCalled();
		expect(sandboxProvider.destroy).not.toHaveBeenCalled();
	});

	it('pre-warms the mirror after an upload, behind the write fence of the consumer', async () => {
		let fenceCalls = 0;
		let fenceError: Error | undefined;
		const fence: KnowledgeWriteRunner = async (write) => {
			fenceCalls++;
			if (fenceError) {
				throw fenceError;
			}
			return await write({});
		};
		const tempDirectory = await mkdtemp(path.join(tmpdir(), 'knowledge-prewarm-'));
		try {
			const tempFilePath = path.join(tempDirectory, 'notes.txt');
			await writeFile(tempFilePath, 'hello');

			await service.uploadFiles(scope, [makeMulterFile({ path: tempFilePath })], fence);
		} finally {
			await rm(tempDirectory, { recursive: true, force: true });
		}

		expect(mirrorService.prewarmMirrorInBackground).toHaveBeenCalledExactlyOnceWith(
			scope,
			expect.any(Function),
		);
		const assertWritable = mirrorService.prewarmMirrorInBackground.mock.calls[0][1];
		fenceCalls = 0;
		await assertWritable();
		expect(fenceCalls).toBe(1);
		fenceError = new Error('project is being deleted');
		await expect(assertWritable()).rejects.toThrow('project is being deleted');
	});

	it('does not pre-warm the mirror when the upload is rejected', async () => {
		await expect(
			service.uploadFiles(scope, [makeMulterFile({ originalname: '..' })], writeFence),
		).rejects.toThrow();

		expect(mirrorService.prewarmMirrorInBackground).not.toHaveBeenCalled();
	});

	it('pre-warms the mirror when files remain after a deletion', async () => {
		await agentFileRepository.save(makeAgentFile({ id: 'file-1' }));
		await agentFileRepository.save(makeAgentFile({ id: 'file-2', fileName: 'second.txt' }));

		await expect(service.deleteFile(scope, 'file-1', writeFence)).resolves.toBe(true);

		expect(mirrorService.prewarmMirrorInBackground).toHaveBeenCalledExactlyOnceWith(
			scope,
			expect.any(Function),
		);
		expect(sandboxProvider.destroy).not.toHaveBeenCalled();
	});

	it('destroys the sandbox after the final file is deleted', async () => {
		await agentFileRepository.save(makeAgentFile({ id: 'file-1' }));

		await expect(service.deleteFile(scope, 'file-1', writeFence)).resolves.toBe(true);

		expect(sandboxProvider.destroy).toHaveBeenCalledExactlyOnceWith(scope);
		expect(mirrorService.prewarmMirrorInBackground).not.toHaveBeenCalled();
	});

	it('deletes the file and its blob', async () => {
		await agentFileRepository.save(makeAgentFile({ id: 'file-1', storedAt: 'fs' }));
		await agentFileRepository.save(makeAgentFile({ id: 'file-2', fileName: 'second.txt' }));

		await expect(service.deleteFile(scope, 'file-1', writeFence)).resolves.toBe(true);

		expect(agentFileRepository.all().map((file) => file.id)).toEqual(['file-2']);
		expect(agentKnowledgeFileStore.delete).toHaveBeenCalledWith([
			{ storedAt: 'fs', storageKey: `agents/${agentId}/knowledge-files/file-1/content` },
		]);
	});

	it('logs blob deletion failures without restoring the DB row', async () => {
		await agentFileRepository.save(makeAgentFile({ id: 'file-1', storedAt: 'fs' }));
		agentKnowledgeFileStore.delete.mockRejectedValueOnce(new Error('delete failed'));

		await expect(service.deleteFile(scope, 'file-1', writeFence)).resolves.toBe(true);

		expect(agentFileRepository.all()).toEqual([]);
		expect(logger.warn).toHaveBeenCalledWith('Failed to delete knowledge file blob', {
			agentId,
			fileId: 'file-1',
			error: 'delete failed',
		});
	});

	it('deletes all files of the scope and their blobs', async () => {
		await agentFileRepository.save(makeAgentFile({ id: 'file-1', storedAt: 'fs' }));
		await agentFileRepository.save(
			makeAgentFile({
				id: 'file-2',
				storedAt: 's3',
				fileName: 'guide.md',
				mimeType: 'text/markdown',
			}),
		);
		await agentFileRepository.save(
			makeAgentFile({ id: 'other-agent-file', agentId: 'agent-2', fileName: 'other.txt' }),
		);

		await expect(service.deleteAll(scope)).resolves.toBeUndefined();

		expect(agentFileRepository.all().map((file) => file.id)).toEqual(['other-agent-file']);
		expect(agentKnowledgeFileStore.delete).toHaveBeenCalledWith([
			{ storedAt: 'fs', storageKey: `agents/${agentId}/knowledge-files/file-1/content` },
			{ storedAt: 's3', storageKey: `agents/${agentId}/knowledge-files/file-2/content` },
		]);
	});

	it('logs blob deletion failures when deleting all files', async () => {
		await agentFileRepository.save(makeAgentFile({ id: 'file-1', storedAt: 'fs' }));
		agentKnowledgeFileStore.delete.mockRejectedValueOnce(new Error('delete failed'));

		await expect(service.deleteAll(scope)).resolves.toBeUndefined();

		expect(agentFileRepository.all()).toEqual([]);
		expect(logger.warn).toHaveBeenCalledWith('Failed to delete knowledge file blobs', {
			agentId,
			error: 'delete failed',
		});
	});

	it('warms the sandbox when the scope has files', async () => {
		await agentFileRepository.save(makeAgentFile());

		await service.warmSandbox(scope);

		expect(sandboxProvider.warm).toHaveBeenCalledExactlyOnceWith(scope);
	});

	it('does not warm the sandbox of a scope without files', async () => {
		await service.warmSandbox(scope);

		expect(sandboxProvider.warm).not.toHaveBeenCalled();
	});

	it('destroys the sandbox on request without reading the file rows', async () => {
		const hasFilesForAgent = vi.spyOn(agentFileRepository, 'hasFilesForAgent');

		await service.destroySandbox(scope);

		expect(sandboxProvider.destroy).toHaveBeenCalledExactlyOnceWith(scope);
		expect(hasFilesForAgent).not.toHaveBeenCalled();
	});

	it('lists the files of the scope as DTOs', async () => {
		const createdAt = new Date('2026-06-01T10:00:00.000Z');
		await agentFileRepository.save(makeAgentFile({ id: 'file-1', createdAt }));
		await agentFileRepository.save(makeAgentFile({ id: 'other', agentId: 'agent-2' }));

		await expect(service.listFiles(scope)).resolves.toEqual([
			{
				id: 'file-1',
				agentId,
				fileName: 'first.txt',
				mimeType: 'text/plain',
				fileSizeBytes: 4,
				createdAt: createdAt.toISOString(),
			},
		]);
	});
});
