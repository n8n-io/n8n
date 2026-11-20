import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { NotFoundError } from '@n8n/errors';
import { QueryFailedError } from '@n8n/typeorm';
import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { mock } from 'vitest-mock-extended';

import type { KnowledgeFile } from '../../entities';
import type { KnowledgeFileStore } from '../../files/knowledge-file-store';
import type { KnowledgeFileService } from '../../files/knowledge-file.service';
import { KnowledgeUploadError } from '../../files/knowledge-upload.error';
import type { KnowledgeCollectionFileRepository } from '../../repositories/knowledge-collection-file.repository';
import { KnowledgeCollectionFileService } from '../knowledge-collection-file.service';
import type { KnowledgeCollectionService } from '../knowledge-collection.service';

vi.unmock('node:fs');
vi.unmock('node:fs/promises');

const user = mock<User>({ id: 'user-1' });
const collectionId = 'collection-1';

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

function makeFile(overrides: Partial<KnowledgeFile> = {}): KnowledgeFile {
	const createdAt = new Date('2026-06-01T10:00:00.000Z');
	return {
		id: 'file-1',
		knowledgeCollectionId: collectionId,
		name: 'first.txt',
		description: null,
		storedAt: 'fs',
		storageKey: `knowledge-collections/${collectionId}/files/${overrides.id ?? 'file-1'}/content`,
		mimeType: 'text/plain',
		fileSizeBytes: 4,
		createdById: 'user-1',
		createdAt,
		updatedAt: createdAt,
		...overrides,
	} as KnowledgeFile;
}

function makeUniqueViolation() {
	return new QueryFailedError('INSERT', [], {
		code: 'SQLITE_CONSTRAINT_UNIQUE',
	} as unknown as Error);
}

function makeService() {
	const collectionService = mock<KnowledgeCollectionService>();
	const fileRepository = mock<KnowledgeCollectionFileRepository>();
	const fileStore = mock<KnowledgeFileStore>();
	const knowledgeFileService = mock<KnowledgeFileService>();
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	fileRepository.findByCollectionId.mockResolvedValue([]);
	fileRepository.saveUploadedFile.mockImplementation(async (file) => makeFile(file));
	fileRepository.deleteByIdAndCollectionId.mockResolvedValue();
	fileStore.write.mockImplementation(async (ref) => ({
		storedAt: 'fs',
		storageKey: `key-of-${ref.fileId}`,
	}));
	fileStore.delete.mockResolvedValue();
	knowledgeFileService.prepareUploadContent.mockResolvedValue(Buffer.from('content'));

	return {
		service: new KnowledgeCollectionFileService(
			collectionService,
			fileRepository,
			fileStore,
			knowledgeFileService,
			logger,
		),
		collectionService,
		fileRepository,
		fileStore,
		knowledgeFileService,
		logger,
	};
}

describe('KnowledgeCollectionFileService', () => {
	describe('listFiles', () => {
		it('returns the files of the collection with their count and total size', async () => {
			const { service, collectionService, fileRepository } = makeService();
			fileRepository.findByCollectionId.mockResolvedValue([
				makeFile({ id: 'file-1', name: 'first.txt', fileSizeBytes: 4 }),
				makeFile({ id: 'file-2', name: 'second.pdf', fileSizeBytes: 6 }),
			]);

			await expect(service.listFiles(user, collectionId)).resolves.toEqual({
				count: 2,
				totalSizeBytes: 10,
				data: [
					{
						id: 'file-1',
						collectionId,
						fileName: 'first.txt',
						mimeType: 'text/plain',
						fileSizeBytes: 4,
						createdAt: '2026-06-01T10:00:00.000Z',
					},
					expect.objectContaining({ id: 'file-2', fileName: 'second.pdf' }),
				],
			});
			expect(collectionService.getForUser).toHaveBeenCalledWith(user, collectionId, 'agent:read');
		});

		it('reads no files of a collection the user cannot see', async () => {
			const { service, collectionService, fileRepository } = makeService();
			collectionService.getForUser.mockRejectedValue(new NotFoundError('not found'));

			await expect(service.listFiles(user, collectionId)).rejects.toThrow(NotFoundError);
			expect(fileRepository.findByCollectionId).not.toHaveBeenCalled();
		});
	});

	describe('uploadFiles', () => {
		it('stores the bytes, then the row, and returns the new files', async () => {
			const { service, collectionService, fileRepository, fileStore, knowledgeFileService } =
				makeService();
			const file = makeMulterFile({ originalname: 'report.pdf', mimetype: 'application/pdf' });

			const uploaded = await service.uploadFiles(user, collectionId, [file]);

			expect(collectionService.getForUser).toHaveBeenCalledWith(user, collectionId, 'agent:update');
			expect(knowledgeFileService.validateUploadMetadata).toHaveBeenCalledWith([file]);
			const [ref, content, metadata] = fileStore.write.mock.calls[0];
			expect(ref).toEqual({ collectionId, fileId: expect.any(String) });
			expect(content).toEqual(Buffer.from('content'));
			// A PDF is stored as its extracted text.
			expect(metadata).toEqual({ fileName: 'report.txt', mimeType: 'application/pdf' });
			expect(fileRepository.saveUploadedFile).toHaveBeenCalledWith(
				{
					id: ref.fileId,
					knowledgeCollectionId: collectionId,
					name: 'report.pdf',
					storedAt: 'fs',
					storageKey: `key-of-${ref.fileId}`,
					mimeType: 'application/pdf',
					fileSizeBytes: 5,
					createdById: 'user-1',
				},
				{},
			);
			expect(uploaded).toEqual([
				expect.objectContaining({ id: ref.fileId, collectionId, fileName: 'report.pdf' }),
			]);
		});

		it('stores nothing in a collection the user cannot change', async () => {
			const { service, collectionService, fileStore } = makeService();
			collectionService.getForUser.mockRejectedValue(new NotFoundError('not found'));

			await expect(service.uploadFiles(user, collectionId, [makeMulterFile()])).rejects.toThrow(
				NotFoundError,
			);
			expect(fileStore.write).not.toHaveBeenCalled();
		});

		it.each([
			['the same name as a file of the collection', ['first.txt'], 'first.txt'],
			// A PDF is stored as text, so `first.pdf` and `first.txt` have the same stored name.
			['the same stored name as a file of the collection', ['first.pdf'], 'first.pdf'],
			['the same name as another file of the upload', ['new.txt', 'new.txt'], 'new.txt'],
			['the same stored name as another file of the upload', ['new.txt', 'new.pdf'], 'new.pdf'],
		])('refuses a file with %s', async (_case, uploadNames, refusedName) => {
			const { service, fileRepository, fileStore } = makeService();
			fileRepository.findByCollectionId.mockResolvedValue([makeFile({ name: 'first.txt' })]);

			const upload = service.uploadFiles(
				user,
				collectionId,
				uploadNames.map((originalname) => makeMulterFile({ originalname })),
			);

			await expect(upload).rejects.toThrow(KnowledgeUploadError);
			await expect(upload).rejects.toMatchObject({
				reason: 'duplicate_name',
				message: expect.stringContaining(`"${refusedName}"`),
			});
			expect(fileStore.write).not.toHaveBeenCalled();
		});

		it('deletes the bytes and refuses the upload when the database rejects the name', async () => {
			const { service, fileRepository, fileStore } = makeService();
			fileRepository.saveUploadedFile.mockRejectedValue(makeUniqueViolation());

			const upload = service.uploadFiles(user, collectionId, [makeMulterFile()]);

			await expect(upload).rejects.toMatchObject({ reason: 'duplicate_name' });
			const { fileId } = fileStore.write.mock.calls[0][0];
			expect(fileStore.delete).toHaveBeenCalledWith([
				{ storedAt: 'fs', storageKey: `key-of-${fileId}` },
			]);
		});

		it('removes the files it stored when a later file of the upload fails', async () => {
			const { service, fileRepository, fileStore } = makeService();
			const failure = new Error('write failed');
			fileStore.write
				.mockResolvedValueOnce({ storedAt: 'fs', storageKey: 'key-of-first' })
				.mockRejectedValueOnce(failure);

			await expect(
				service.uploadFiles(user, collectionId, [
					makeMulterFile({ originalname: 'first.txt' }),
					makeMulterFile({ originalname: 'second.txt' }),
				]),
			).rejects.toThrow(failure);

			const firstFileId = fileStore.write.mock.calls[0][0].fileId;
			expect(fileStore.delete).toHaveBeenCalledWith([
				{ storedAt: 'fs', storageKey: 'key-of-first' },
			]);
			expect(fileRepository.deleteByIdAndCollectionId).toHaveBeenCalledWith(
				firstFileId,
				collectionId,
				{},
			);
		});

		describe('temp files', () => {
			let tempDir: string;

			beforeEach(async () => {
				tempDir = await mkdtemp(path.join(tmpdir(), 'n8n-collection-upload-'));
			});

			afterEach(async () => {
				await rm(tempDir, { recursive: true, force: true });
			});

			async function makeTempUpload() {
				const tempPath = path.join(tempDir, 'upload');
				await writeFile(tempPath, 'hello');
				return makeMulterFile({ path: tempPath });
			}

			it('removes the temp files after an upload', async () => {
				const { service } = makeService();
				const file = await makeTempUpload();

				await service.uploadFiles(user, collectionId, [file]);

				await expect(access(file.path)).rejects.toThrow();
			});

			it('removes the temp files when the upload is refused', async () => {
				const { service, collectionService } = makeService();
				collectionService.getForUser.mockRejectedValue(new NotFoundError('not found'));
				const file = await makeTempUpload();

				await expect(service.uploadFiles(user, collectionId, [file])).rejects.toThrow(
					NotFoundError,
				);

				await expect(access(file.path)).rejects.toThrow();
			});
		});
	});

	describe('deleteFile', () => {
		it('deletes the row and the bytes of the file', async () => {
			const { service, collectionService, fileRepository, fileStore } = makeService();
			const file = makeFile({ id: 'file-1' });
			fileRepository.findByIdAndCollectionId.mockResolvedValue(file);

			await expect(service.deleteFile(user, collectionId, 'file-1')).resolves.toBeUndefined();

			expect(collectionService.getForUser).toHaveBeenCalledWith(user, collectionId, 'agent:update');
			expect(fileRepository.deleteByIdAndCollectionId).toHaveBeenCalledWith(
				'file-1',
				collectionId,
				{},
			);
			expect(fileStore.delete).toHaveBeenCalledWith([
				{ storedAt: 'fs', storageKey: file.storageKey },
			]);
		});

		it('deletes nothing when the collection has no such file', async () => {
			const { service, fileRepository, fileStore } = makeService();
			fileRepository.findByIdAndCollectionId.mockResolvedValue(null);

			await expect(service.deleteFile(user, collectionId, 'missing')).resolves.toBeUndefined();

			expect(fileRepository.deleteByIdAndCollectionId).not.toHaveBeenCalled();
			expect(fileStore.delete).not.toHaveBeenCalled();
		});

		it('deletes the row and logs a warning when the bytes cannot be deleted', async () => {
			const { service, fileRepository, fileStore, logger } = makeService();
			fileRepository.findByIdAndCollectionId.mockResolvedValue(makeFile());
			fileStore.delete.mockRejectedValue(new Error('storage is down'));

			await expect(service.deleteFile(user, collectionId, 'file-1')).resolves.toBeUndefined();

			expect(fileRepository.deleteByIdAndCollectionId).toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalled();
		});

		it('deletes nothing in a collection the user cannot change', async () => {
			const { service, collectionService, fileRepository } = makeService();
			collectionService.getForUser.mockRejectedValue(new NotFoundError('not found'));

			await expect(service.deleteFile(user, collectionId, 'file-1')).rejects.toThrow(NotFoundError);
			expect(fileRepository.findByIdAndCollectionId).not.toHaveBeenCalled();
		});
	});
});
