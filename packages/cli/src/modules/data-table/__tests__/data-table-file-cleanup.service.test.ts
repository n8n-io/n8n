import type { GlobalConfig } from '@n8n/config';
import { promises as fs } from 'fs';
import path from 'path';

import { DataTableFileCleanupService } from '../data-table-file-cleanup.service';

jest.mock('fs', () => ({
	promises: {
		unlink: jest.fn(),
		readdir: jest.fn(),
		stat: jest.fn(),
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
		jest.clearAllMocks();
		jest.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('deleteFile', () => {
		it('should delete a file successfully', async () => {
			const fileId = 'test-file-123';
			const expectedPath = path.join(uploadDir, fileId);

			(fs.unlink as jest.Mock).mockResolvedValue(undefined);

			await service.deleteFile(fileId);

			expect(fs.unlink).toHaveBeenCalledWith(expectedPath);
			expect(fs.unlink).toHaveBeenCalledTimes(1);
		});

		it('should ignore ENOENT error when file does not exist', async () => {
			const fileId = 'non-existent-file';
			const error = new Error('ENOENT: no such file or directory') as NodeJS.ErrnoException;
			error.code = 'ENOENT';

			(fs.unlink as jest.Mock).mockRejectedValue(error);

			await expect(service.deleteFile(fileId)).resolves.toBeUndefined();
		});

		it('should throw error for non-ENOENT errors', async () => {
			const fileId = 'test-file';
			const error = new Error('Permission denied') as NodeJS.ErrnoException;
			error.code = 'EPERM';

			(fs.unlink as jest.Mock).mockRejectedValue(error);

			await expect(service.deleteFile(fileId)).rejects.toThrow('Permission denied');
		});

		it('should not allow path traversal when deleting file', async () => {
			const maliciousFileId = '../some/other/directory/malicious-file.csv';

			await expect(service.deleteFile(maliciousFileId)).rejects.toThrowError(
				'Path traversal detected',
			);
		});
	});

	describe('start and shutdown', () => {
		it('should start cleanup interval', async () => {
			jest.useFakeTimers();

			await service.start();

			expect(service['cleanupInterval']).toBeDefined();

			jest.useRealTimers();
		});

		it('should clear interval on shutdown', async () => {
			jest.useFakeTimers();

			await service.start();
			expect(service['cleanupInterval']).toBeDefined();

			await service.shutdown();

			expect(service['cleanupInterval']).toBeUndefined();

			jest.useRealTimers();
		});

		it('should not error on shutdown if interval was never started', async () => {
			await expect(service.shutdown()).resolves.toBeUndefined();
		});
	});

	describe('cleanupOrphanedFiles', () => {
		const flushPromises = async () => await new Promise(jest.requireActual('timers').setImmediate);

		beforeEach(() => {
			jest.useFakeTimers();
		});

		afterEach(() => {
			jest.useRealTimers();
		});

		it('should delete files older than 2 minutes', async () => {
			const now = Date.now();
			const oldFile1 = 'old-file-1.csv';
			const oldFile2 = 'old-file-2.csv';

			(fs.readdir as jest.Mock).mockResolvedValue([oldFile1, oldFile2]);
			(fs.stat as jest.Mock).mockResolvedValue({
				mtimeMs: now - 3 * 60 * 1000, // 3 minutes ago
			});
			(fs.unlink as jest.Mock).mockResolvedValue(undefined);

			await service.start();

			// Trigger cleanup and let promises resolve
			jest.advanceTimersByTime(60 * 1000);
			await flushPromises();

			expect(fs.readdir).toHaveBeenCalledWith(uploadDir);
			expect(fs.stat).toHaveBeenCalledTimes(2);
			expect(fs.unlink).toHaveBeenCalledWith(path.join(uploadDir, oldFile1));
			expect(fs.unlink).toHaveBeenCalledWith(path.join(uploadDir, oldFile2));
		});

		it('should not delete files newer than 2 minutes', async () => {
			const now = Date.now();
			const newFile = 'new-file.csv';

			(fs.readdir as jest.Mock).mockResolvedValue([newFile]);
			(fs.stat as jest.Mock).mockResolvedValue({
				mtimeMs: now - 1 * 60 * 1000, // 1 minute ago
			});

			await service.start();
			jest.advanceTimersByTime(60 * 1000); // Trigger cleanup
			await flushPromises();

			expect(fs.readdir).toHaveBeenCalled();
			expect(fs.stat).toHaveBeenCalled();
			expect(fs.unlink).not.toHaveBeenCalled();
		});

		it('should handle mixed old and new files', async () => {
			const now = Date.now();
			const oldFile = 'old-file.csv';
			const newFile = 'new-file.csv';

			(fs.readdir as jest.Mock).mockResolvedValue([oldFile, newFile]);
			(fs.stat as jest.Mock)
				.mockResolvedValueOnce({
					mtimeMs: now - 3 * 60 * 1000, // 3 minutes ago (old)
				})
				.mockResolvedValueOnce({
					mtimeMs: now - 1 * 60 * 1000, // 1 minute ago (new)
				});
			(fs.unlink as jest.Mock).mockResolvedValue(undefined);

			await service.start();
			jest.advanceTimersByTime(60 * 1000); // Trigger cleanup
			await flushPromises();

			expect(fs.unlink).toHaveBeenCalledTimes(1);
			expect(fs.unlink).toHaveBeenCalledWith(path.join(uploadDir, oldFile));
			expect(fs.unlink).not.toHaveBeenCalledWith(path.join(uploadDir, newFile));
		});

		it('should handle empty upload directory', async () => {
			(fs.readdir as jest.Mock).mockResolvedValue([]);

			await service.start();
			jest.advanceTimersByTime(60 * 1000); // Trigger cleanup
			await flushPromises();

			expect(fs.readdir).toHaveBeenCalled();
			expect(fs.stat).not.toHaveBeenCalled();
			expect(fs.unlink).not.toHaveBeenCalled();
		});

		it('should ignore ENOENT error if upload directory does not exist', async () => {
			const error = new Error('ENOENT: no such file or directory') as NodeJS.ErrnoException;
			error.code = 'ENOENT';
			(fs.readdir as jest.Mock).mockRejectedValue(error);

			await service.start();
			jest.advanceTimersByTime(60 * 1000); // Trigger cleanup
			await flushPromises();

			expect(fs.readdir).toHaveBeenCalled();
			expect(console.error).not.toHaveBeenCalled();
		});

		it('should log error for non-ENOENT readdir errors', async () => {
			const error = new Error('Permission denied');
			(fs.readdir as jest.Mock).mockRejectedValue(error);

			await service.start();
			jest.advanceTimersByTime(60 * 1000); // Trigger cleanup
			await flushPromises();

			expect(console.error).toHaveBeenCalledWith('Error cleaning up orphaned CSV files:', error);
		});

		it('should continue cleanup if individual file stat fails', async () => {
			const file1 = 'file1.csv';
			const file2 = 'file2.csv';

			(fs.readdir as jest.Mock).mockResolvedValue([file1, file2]);
			(fs.stat as jest.Mock)
				.mockRejectedValueOnce(new Error('Stat failed for file1'))
				.mockResolvedValueOnce({
					mtimeMs: Date.now() - 3 * 60 * 1000, // file2 is old
				});
			(fs.unlink as jest.Mock).mockResolvedValue(undefined);

			await service.start();
			jest.advanceTimersByTime(60 * 1000); // Trigger cleanup
			await flushPromises();

			// Should still delete file2 even though file1 failed
			expect(fs.unlink).toHaveBeenCalledWith(path.join(uploadDir, file2));
			expect(fs.unlink).toHaveBeenCalledTimes(1);
		});

		it('should continue cleanup if individual file unlink fails', async () => {
			const now = Date.now();
			const file1 = 'file1.csv';
			const file2 = 'file2.csv';

			(fs.readdir as jest.Mock).mockResolvedValue([file1, file2]);
			(fs.stat as jest.Mock).mockResolvedValue({
				mtimeMs: now - 3 * 60 * 1000, // Both files are old
			});
			(fs.unlink as jest.Mock)
				.mockRejectedValueOnce(new Error('Unlink failed for file1'))
				.mockResolvedValueOnce(undefined);

			await service.start();
			jest.advanceTimersByTime(60 * 1000); // Trigger cleanup
			await flushPromises();

			// Should attempt to delete both files
			expect(fs.unlink).toHaveBeenCalledWith(path.join(uploadDir, file1));
			expect(fs.unlink).toHaveBeenCalledWith(path.join(uploadDir, file2));
			expect(fs.unlink).toHaveBeenCalledTimes(2);
		});

		it('should run cleanup every 60 seconds', async () => {
			const now = Date.now();
			(fs.readdir as jest.Mock).mockResolvedValue(['old-file.csv']);
			(fs.stat as jest.Mock).mockResolvedValue({
				mtimeMs: now - 3 * 60 * 1000,
			});
			(fs.unlink as jest.Mock).mockResolvedValue(undefined);

			await service.start();

			// First cleanup
			jest.advanceTimersByTime(60 * 1000);
			await flushPromises();
			expect(fs.readdir).toHaveBeenCalledTimes(1);

			// Second cleanup
			jest.advanceTimersByTime(60 * 1000);
			await flushPromises();
			expect(fs.readdir).toHaveBeenCalledTimes(2);

			// Third cleanup
			jest.advanceTimersByTime(60 * 1000);
			await flushPromises();
			expect(fs.readdir).toHaveBeenCalledTimes(3);

			await service.shutdown();
		});
	});
});
