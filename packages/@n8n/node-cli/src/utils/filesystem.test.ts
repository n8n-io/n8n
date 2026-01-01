import type { Dirent, Stats } from 'node:fs';
import fs from 'node:fs/promises';
import { mock } from 'vitest-mock-extended';

import {
	folderExists,
	copyFolder,
	delayAtLeast,
	writeFileSafe,
	ensureFolder,
	renameFilesInDirectory,
	renameDirectory,
	createSymlink,
} from './filesystem';

vi.mock('node:fs/promises');

const mockFs = vi.mocked(fs);

describe('file system utils', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('folderExists', () => {
		it('should return true for directory', async () => {
			mockFs.stat.mockResolvedValue(mock<Stats>({ isDirectory: () => true }));

			const result = await folderExists('/test/dir');

			expect(result).toBe(true);
			expect(mockFs.stat).toHaveBeenCalledWith('/test/dir');
		});

		it('should return false for file', async () => {
			mockFs.stat.mockResolvedValue(mock<Stats>({ isDirectory: () => false }));

			const result = await folderExists('/test/file.txt');

			expect(result).toBe(false);
		});

		it('should return false when path does not exist', async () => {
			mockFs.stat.mockRejectedValue(new Error('ENOENT'));

			const result = await folderExists('/nonexistent');

			expect(result).toBe(false);
		});
	});

	describe('copyFolder', () => {
		it('should copy folder recursively', async () => {
			const rootDirContent = [
				mock<Dirent>({ name: 'root.txt', isDirectory: () => false }),
				mock<Dirent>({ name: 'subdir', isDirectory: () => true }),
			];

			const subDirContent = [mock<Dirent>({ name: 'nested.txt', isDirectory: () => false })];
			// @ts-expect-error ts does not select correct readdir overload
			mockFs.readdir.mockResolvedValueOnce(rootDirContent).mockResolvedValueOnce(subDirContent);
			mockFs.mkdir.mockResolvedValue(undefined);
			mockFs.copyFile.mockResolvedValue();

			await copyFolder({ source: '/src', destination: '/dest' });

			expect(mockFs.mkdir).toHaveBeenCalledWith('/dest', { recursive: true });
			expect(mockFs.copyFile).toHaveBeenCalledWith('/src/root.txt', '/dest/root.txt');
			expect(mockFs.copyFile).toHaveBeenCalledWith(
				'/src/subdir/nested.txt',
				'/dest/subdir/nested.txt',
			);
			expect(mockFs.mkdir).toHaveBeenCalledWith('/dest/subdir', { recursive: true });
		});

		it('should ignore specified files', async () => {
			const dirs = [
				mock<Dirent>({ name: 'keep.txt', isDirectory: () => false }),
				mock<Dirent>({ name: 'ignore.txt', isDirectory: () => false }),
			];
			// @ts-expect-error ts does not select correct readdir overload
			mockFs.readdir.mockResolvedValueOnce(dirs);
			mockFs.mkdir.mockResolvedValue(undefined);
			mockFs.copyFile.mockResolvedValue();

			await copyFolder({
				source: '/src',
				destination: '/dest',
				ignore: ['ignore.txt'],
			});

			expect(mockFs.copyFile).toHaveBeenCalledWith('/src/keep.txt', '/dest/keep.txt');
			expect(mockFs.copyFile).not.toHaveBeenCalledWith('/src/ignore.txt', '/dest/ignore.txt');
		});
	});

	describe('delayAtLeast', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should resolve after minimum delay', async () => {
			const promise = Promise.resolve('result');
			const resultPromise = delayAtLeast(promise, 100);

			vi.advanceTimersByTime(90);
			vi.runAllTicks();

			let resolved = false;
			void resultPromise.then(() => {
				resolved = true;
			});
			vi.runAllTicks();

			expect(resolved).toBe(false);

			vi.advanceTimersByTime(10);
			vi.runAllTicks();

			const result = await resultPromise;
			expect(result).toBe('result');
		});

		it('should not add delay if promise takes longer', async () => {
			const promise = new Promise((resolve) => {
				setTimeout(() => resolve('slow'), 200);
			});

			const resultPromise = delayAtLeast(promise, 100);

			vi.advanceTimersByTime(100);
			vi.runAllTicks();

			let resolved = false;
			void resultPromise.then(() => {
				resolved = true;
			});
			vi.runAllTicks();

			expect(resolved).toBe(false);

			vi.advanceTimersByTime(100);
			vi.runAllTicks();

			const result = await resultPromise;
			expect(result).toBe('slow');
		});
	});

	describe('writeFileSafe', () => {
		it('should create directory and write file', async () => {
			mockFs.mkdir.mockResolvedValue(undefined);
			mockFs.writeFile.mockResolvedValue();

			await writeFileSafe('/path/to/file.txt', 'content');

			expect(mockFs.mkdir).toHaveBeenCalledWith('/path/to', { recursive: true });
			expect(mockFs.writeFile).toHaveBeenCalledWith('/path/to/file.txt', 'content');
		});

		it('should handle Uint8Array content', async () => {
			mockFs.mkdir.mockResolvedValue(undefined);
			mockFs.writeFile.mockResolvedValue();
			const buffer = new Uint8Array([1, 2, 3]);

			await writeFileSafe('/file.bin', buffer);

			expect(mockFs.writeFile).toHaveBeenCalledWith('/file.bin', buffer);
		});
	});

	describe('ensureFolder', () => {
		it('should create directory recursively', async () => {
			mockFs.mkdir.mockResolvedValue(undefined);

			await ensureFolder('/deep/nested/dir');

			expect(mockFs.mkdir).toHaveBeenCalledWith('/deep/nested/dir', { recursive: true });
		});
	});

	describe('renameFilesInDirectory', () => {
		it('should rename files with old name', async () => {
			// @ts-expect-error ts does not select correct readdir overload
			mockFs.readdir.mockResolvedValue(['oldName.svg', 'keep.txt', 'oldNameFile.js']);
			mockFs.rename.mockResolvedValue();

			await renameFilesInDirectory('/dir', 'oldName', 'newName');

			expect(mockFs.rename).toHaveBeenCalledWith('/dir/oldName.svg', '/dir/newName.svg');
			expect(mockFs.rename).toHaveBeenCalledWith('/dir/oldNameFile.js', '/dir/newNameFile.js');
			expect(mockFs.rename).not.toHaveBeenCalledWith('/dir/keep.txt', expect.any(String));
		});

		it('should rename files with camelCase variants', async () => {
			// @ts-expect-error ts does not select correct readdir overload
			mockFs.readdir.mockResolvedValue(['myOldName.svg', 'MyOldName.node.js']);
			mockFs.rename.mockResolvedValue();

			await renameFilesInDirectory('/dir', 'MyOldName', 'MyNewName');

			expect(mockFs.rename).toHaveBeenCalledTimes(2);
			expect(mockFs.rename).toHaveBeenCalledWith('/dir/myOldName.svg', '/dir/myNewName.svg');
			expect(mockFs.rename).toHaveBeenCalledWith(
				'/dir/MyOldName.node.js',
				'/dir/MyNewName.node.js',
			);
		});
	});

	describe('renameDirectory', () => {
		it('should rename directory and return new path', async () => {
			mockFs.rename.mockResolvedValue();

			const result = await renameDirectory('/parent/oldDir', 'newDir');

			expect(mockFs.rename).toHaveBeenCalledWith('/parent/oldDir', '/parent/newDir');
			expect(result).toBe('/parent/newDir');
		});

		it('should handle root directory', async () => {
			mockFs.rename.mockResolvedValue();

			const result = await renameDirectory('/oldDir', 'newDir');

			expect(result).toBe('/newDir');
		});
	});

	describe('createSymlink', () => {
		it('should create parent directory and symlink', async () => {
			mockFs.mkdir.mockResolvedValue(undefined);
			const enoentError = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
			mockFs.lstat.mockRejectedValue(enoentError);
			mockFs.stat.mockResolvedValue(mock<Stats>({ isDirectory: () => true }));
			mockFs.symlink.mockResolvedValue();

			await createSymlink('/source/path', '/link/path');

			expect(mockFs.mkdir).toHaveBeenCalledWith('/link', { recursive: true });
			expect(mockFs.symlink).toHaveBeenCalledWith('/source/path', '/link/path', 'dir');
		});

		it('should remove existing symlink before creating new one', async () => {
			mockFs.mkdir.mockResolvedValue(undefined);
			mockFs.lstat.mockResolvedValue(mock<Stats>({ isSymbolicLink: () => true }));
			mockFs.unlink.mockResolvedValue();
			mockFs.stat.mockResolvedValue(mock<Stats>({ isDirectory: () => false }));
			mockFs.symlink.mockResolvedValue();

			await createSymlink('/source/file', '/link/file');

			expect(mockFs.unlink).toHaveBeenCalledWith('/link/file');
			expect(mockFs.symlink).toHaveBeenCalledWith('/source/file', '/link/file', 'file');
		});

		it('should remove existing directory before creating symlink', async () => {
			mockFs.mkdir.mockResolvedValue(undefined);
			mockFs.lstat.mockResolvedValue(
				mock<Stats>({ isSymbolicLink: () => false, isDirectory: () => true }),
			);
			mockFs.rm.mockResolvedValue();
			mockFs.stat.mockResolvedValue(mock<Stats>({ isDirectory: () => true }));
			mockFs.symlink.mockResolvedValue();

			await createSymlink('/source', '/link');

			expect(mockFs.rm).toHaveBeenCalledWith('/link', { recursive: true, force: true });
			expect(mockFs.symlink).toHaveBeenCalledWith('/source', '/link', 'dir');
		});

		it('should fallback to junction on Windows when type detection fails', async () => {
			mockFs.mkdir.mockResolvedValue(undefined);
			const enoentError = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
			mockFs.lstat.mockRejectedValue(enoentError);
			mockFs.stat.mockRejectedValue(new Error('Access denied'));
			mockFs.symlink.mockResolvedValue();

			await createSymlink('/source', '/link');

			expect(mockFs.symlink).toHaveBeenCalledWith('/source', '/link', 'junction');
		});

		it('should throw error if lstat fails with non-ENOENT error', async () => {
			mockFs.mkdir.mockResolvedValue(undefined);
			const error = new Error('Permission denied');
			mockFs.lstat.mockRejectedValue(error);

			await expect(createSymlink('/source', '/link')).rejects.toThrow('Permission denied');
		});
	});
});
