import type { GlobalConfig } from '@n8n/config';
import { promises as fs } from 'fs';
import path from 'path';
import type { Mock } from 'vitest';

import { DataTableFileCleanupService } from '../data-table-file-cleanup.service';

vi.mock('fs', async () => ({
	promises: {
		unlink: vi.fn(),
		readdir: vi.fn(),
		stat: vi.fn(),
	},
}));

describe('DataTableFileCleanupService', () => {
	const uploadDir = '/mock/n8n/dataTableUploads';

	const globalConfig = {
		dataTable: {
			cleanupIntervalMs: 60 * 1000,
			fileMaxAgeMs: 2 * 60 * 1000,
			uploadDir,
		},
	} as GlobalConfig;

	const service = new DataTableFileCleanupService(globalConfig);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('deleteFile', () => {
		it('should delete a file successfully', async () => {
			const fileId = 'test-file-123';
			const expectedPath = path.join(uploadDir, fileId);

			(fs.unlink as Mock).mockResolvedValue(undefined);

			await service.deleteFile(fileId);

			expect(fs.unlink).toHaveBeenCalledWith(expectedPath);
			expect(fs.unlink).toHaveBeenCalledTimes(1);
		});

		it('should ignore ENOENT error when file does not exist', async () => {
			const fileId = 'non-existent-file';
			const error = new Error('ENOENT: no such file or directory') as NodeJS.ErrnoException;
			error.code = 'ENOENT';

			(fs.unlink as Mock).mockRejectedValue(error);

			await expect(service.deleteFile(fileId)).resolves.toBeUndefined();
		});

		it('should throw error for non-ENOENT errors', async () => {
			const fileId = 'test-file';
			const error = new Error('Permission denied') as NodeJS.ErrnoException;
			error.code = 'EPERM';

			(fs.unlink as Mock).mockRejectedValue(error);

			await expect(service.deleteFile(fileId)).rejects.toThrow('Permission denied');
		});

		it('should not allow path traversal when deleting file', async () => {
			const maliciousFileId = '../some/other/directory/malicious-file.csv';

			await expect(service.deleteFile(maliciousFileId)).rejects.toThrowError(
				'Path traversal detected',
			);
		});
	});

	describe('cleanupOrphanedFiles', () => {
		const OLD_FILE = 'old-file.csv';
		const NEW_FILE = 'new-file.csv';
		let oldMtimeMs: number;
		let newMtimeMs: number;

		beforeEach(() => {
			const now = Date.now();
			oldMtimeMs = now - 3 * 60 * 1000;
			newMtimeMs = now - 1 * 60 * 1000;
		});

		const errnoError = (code: string): NodeJS.ErrnoException =>
			Object.assign(new Error(code), { code });

		const cleanup = async (signal = new AbortController().signal): Promise<void> =>
			await service.cleanupOrphanedFiles(signal);

		it('should delete only the files older than the maximum age', async () => {
			(fs.readdir as Mock).mockResolvedValue([OLD_FILE, NEW_FILE]);
			(fs.stat as Mock).mockImplementation(async (filePath: string) => ({
				mtimeMs: filePath.endsWith(OLD_FILE) ? oldMtimeMs : newMtimeMs,
			}));

			await cleanup();

			expect((fs.unlink as Mock).mock.calls).toEqual([[path.join(uploadDir, OLD_FILE)]]);
		});

		it('should do nothing when the upload directory is empty', async () => {
			(fs.readdir as Mock).mockResolvedValue([]);

			await cleanup();

			expect(fs.stat).not.toHaveBeenCalled();
			expect(fs.unlink).not.toHaveBeenCalled();
		});

		it('should resolve when the upload directory does not exist', async () => {
			(fs.readdir as Mock).mockRejectedValue(errnoError('ENOENT'));

			await expect(cleanup()).resolves.toBeUndefined();
		});

		it.each(['stat', 'unlink'] as const)(
			'should skip a file that is already gone on %s',
			async (operation) => {
				(fs.readdir as Mock).mockResolvedValue(['gone.csv', OLD_FILE]);
				(fs.stat as Mock).mockResolvedValue({ mtimeMs: oldMtimeMs });
				(fs[operation] as Mock).mockRejectedValueOnce(errnoError('ENOENT'));

				await expect(cleanup()).resolves.toBeUndefined();
				expect(fs.unlink).toHaveBeenLastCalledWith(path.join(uploadDir, OLD_FILE));
			},
		);

		it('should reject when the upload directory cannot be read', async () => {
			const error = errnoError('EACCES');
			(fs.readdir as Mock).mockRejectedValue(error);

			await expect(cleanup()).rejects.toBe(error);
		});

		it.each(['stat', 'unlink'] as const)(
			'should delete the other files and then reject with the first %s error',
			async (operation) => {
				const error = errnoError('EACCES');
				(fs.readdir as Mock).mockResolvedValue(['a', 'b', 'c']);
				(fs.stat as Mock).mockResolvedValue({ mtimeMs: oldMtimeMs });
				(fs[operation] as Mock).mockRejectedValueOnce(error);

				await expect(cleanup()).rejects.toBe(error);
				expect((fs.unlink as Mock).mock.calls.slice(-2)).toEqual([
					[path.join(uploadDir, 'b')],
					[path.join(uploadDir, 'c')],
				]);
			},
		);

		it('should stop before the next file when the signal is aborted', async () => {
			const controller = new AbortController();
			(fs.readdir as Mock).mockResolvedValue(['a', 'b']);
			(fs.stat as Mock).mockResolvedValue({ mtimeMs: oldMtimeMs });
			(fs.unlink as Mock).mockImplementation(async () => controller.abort());

			await cleanup(controller.signal);

			expect((fs.unlink as Mock).mock.calls).toEqual([[path.join(uploadDir, 'a')]]);
		});
	});
});
