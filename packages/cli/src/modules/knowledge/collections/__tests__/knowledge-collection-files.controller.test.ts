import type { KnowledgeCollectionFileDto } from '@n8n/api-types';
import { BadRequestError } from '@n8n/errors';
import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import multer from 'multer';
import { mock } from 'vitest-mock-extended';

import { KnowledgeUploadError } from '../../files/knowledge-upload.error';
import type { KnowledgeCollectionFileService } from '../knowledge-collection-file.service';
import { KnowledgeCollectionFilesController } from '../knowledge-collection-files.controller';

vi.unmock('node:fs');
vi.unmock('node:fs/promises');

type UploadRequest = Parameters<KnowledgeCollectionFilesController['uploadFiles']>[0];

const user = { id: 'user-1' };
const projectId = 'project-1';
const collectionId = 'collection-1';

// A mock() request answers every unset property, so `fileUploadError` would always be set.
function fakeUploadRequest(overrides: Partial<UploadRequest> = {}): UploadRequest {
	return {
		user,
		files: [{ path: '/tmp/uploaded-file' }],
		...overrides,
	} as unknown as UploadRequest;
}

function makeController() {
	const fileService = mock<KnowledgeCollectionFileService>();
	return { controller: new KnowledgeCollectionFilesController(fileService), fileService };
}

describe('KnowledgeCollectionFilesController', () => {
	it('lists the files of a collection', async () => {
		const { controller, fileService } = makeController();
		const list = { count: 0, totalSizeBytes: 0, data: [] };
		fileService.listFiles.mockResolvedValue(list);

		await expect(
			controller.listFiles({ user } as never, undefined as never, projectId, collectionId),
		).resolves.toBe(list);
		expect(fileService.listFiles).toHaveBeenCalledWith(user, { projectId, collectionId });
	});

	describe('uploadFiles', () => {
		it('uploads the files and returns the new files', async () => {
			const { controller, fileService } = makeController();
			const uploaded = [mock<KnowledgeCollectionFileDto>({ id: 'file-1' })];
			fileService.uploadFiles.mockResolvedValue(uploaded);
			const request = fakeUploadRequest();

			await expect(
				controller.uploadFiles(request, undefined as never, projectId, collectionId),
			).resolves.toBe(uploaded);
			expect(fileService.uploadFiles).toHaveBeenCalledWith({
				user,
				projectId,
				collectionId,
				files: request.files,
			});
		});

		it('rejects an upload without files', async () => {
			const { controller, fileService } = makeController();

			await expect(
				controller.uploadFiles(
					fakeUploadRequest({ files: [] }),
					undefined as never,
					projectId,
					collectionId,
				),
			).rejects.toThrow('No files uploaded');
			expect(fileService.uploadFiles).not.toHaveBeenCalled();
		});

		it.each([
			[new multer.MulterError('LIMIT_FILE_SIZE'), 'file_size'],
			[new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'files'), 'too_many_files'],
		])('maps the multer error $code to its upload reason', async (fileUploadError, reason) => {
			const { controller, fileService } = makeController();

			const upload = controller.uploadFiles(
				fakeUploadRequest({ fileUploadError }),
				undefined as never,
				projectId,
				collectionId,
			);

			await expect(upload).rejects.toThrow(KnowledgeUploadError);
			await expect(upload).rejects.toMatchObject({ reason });
			expect(fileService.uploadFiles).not.toHaveBeenCalled();
		});

		it('maps a multer error without a reason to a bad request', async () => {
			const { controller } = makeController();

			const upload = controller.uploadFiles(
				fakeUploadRequest({ fileUploadError: new multer.MulterError('LIMIT_FILE_COUNT') }),
				undefined as never,
				projectId,
				collectionId,
			);

			await expect(upload).rejects.toThrow(BadRequestError);
			await expect(upload).rejects.not.toThrow(KnowledgeUploadError);
		});

		it('rethrows an upload error that multer did not raise', async () => {
			const { controller } = makeController();
			const error = new KnowledgeUploadError('Unsupported file type', 'file_type');

			await expect(
				controller.uploadFiles(
					fakeUploadRequest({ fileUploadError: error }),
					undefined as never,
					projectId,
					collectionId,
				),
			).rejects.toBe(error);
		});

		it('removes the temp files when it rejects the upload before the service runs', async () => {
			const { controller, fileService } = makeController();
			const tempDir = await mkdtemp(path.join(tmpdir(), 'n8n-collection-controller-'));
			const tempPath = path.join(tempDir, 'upload');
			await writeFile(tempPath, 'hello');

			try {
				await expect(
					controller.uploadFiles(
						fakeUploadRequest({
							files: [{ path: tempPath }] as Express.Multer.File[],
							fileUploadError: new multer.MulterError('LIMIT_FILE_COUNT'),
						}),
						undefined as never,
						projectId,
						collectionId,
					),
				).rejects.toThrow(BadRequestError);

				expect(fileService.uploadFiles).not.toHaveBeenCalled();
				await expect(access(tempPath)).rejects.toThrow();
			} finally {
				await rm(tempDir, { recursive: true, force: true });
			}
		});
	});

	describe('deleteFile', () => {
		it('deletes the file and answers success', async () => {
			const { controller, fileService } = makeController();
			fileService.deleteFile.mockResolvedValue();

			await expect(
				controller.deleteFile(
					{ user } as never,
					undefined as never,
					projectId,
					collectionId,
					'file-1',
				),
			).resolves.toEqual({ success: true });
			expect(fileService.deleteFile).toHaveBeenCalledWith({
				user,
				projectId,
				collectionId,
				fileId: 'file-1',
			});
		});
	});
});
