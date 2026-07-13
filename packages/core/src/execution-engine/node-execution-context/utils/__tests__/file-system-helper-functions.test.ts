import { SecurityConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { INode, ResolvedFilePath } from 'n8n-workflow';
import { constants } from 'node:fs';
import {
	access as fsAccess,
	realpath as fsRealpath,
	stat as fsStat,
	open as fsOpen,
	mkdir as fsMkdir,
	lstat as fsLstat,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Mock } from 'vitest';

import {
	BINARY_DATA_STORAGE_PATH,
	BLOCK_FILE_ACCESS_TO_N8N_FILES,
	CONFIG_FILES,
	CUSTOM_EXTENSION_ENV,
	UM_EMAIL_TEMPLATES_INVITE,
	UM_EMAIL_TEMPLATES_PWRESET,
} from '@/constants';
import { InstanceSettings } from '@/instance-settings';

import { getFileSystemHelperFunctions } from '../file-system-helper-functions';

vi.mock('node:fs');
vi.mock('node:fs/promises');

const originalProcessEnv = { ...process.env };

let instanceSettings: InstanceSettings;
let securityConfig: SecurityConfig;
let originalBlockedFilePatterns: string;

beforeEach(() => {
	process.env = { ...originalProcessEnv };

	const error = new Error('ENOENT');
	// @ts-expect-error undefined property
	error.code = 'ENOENT';
	(fsAccess as Mock).mockRejectedValue(error);
	(fsRealpath as Mock).mockImplementation((path: string) => path);

	instanceSettings = Container.get(InstanceSettings);
	securityConfig = Container.get(SecurityConfig);
	securityConfig.restrictFileAccessTo = '';
	originalBlockedFilePatterns = securityConfig.blockFilePatterns;
});

afterEach(() => {
	securityConfig.blockFilePatterns = originalBlockedFilePatterns;
});

describe('isFilePathBlocked', () => {
	const node = { type: 'TestNode' } as INode;
	const { isFilePathBlocked, resolvePath } = getFileSystemHelperFunctions(node);
	beforeEach(() => {
		process.env[BLOCK_FILE_ACCESS_TO_N8N_FILES] = 'true';
	});

	it('should return true for static cache dir', async () => {
		const filePath = instanceSettings.staticCacheDir;
		expect(isFilePathBlocked(await resolvePath(filePath))).toBe(true);
	});

	it('should return true for restricted paths', async () => {
		const restrictedPath = instanceSettings.n8nFolder;
		expect(isFilePathBlocked(await resolvePath(restrictedPath))).toBe(true);
	});

	it('should handle empty allowed paths', async () => {
		securityConfig.restrictFileAccessTo = '';
		const result = isFilePathBlocked(await resolvePath('/some/random/path'));
		expect(result).toBe(false);
	});

	it('should handle multiple allowed paths', async () => {
		securityConfig.restrictFileAccessTo = '/path1;/path2;/path3';
		const allowedPath = '/path2/somefile';
		expect(isFilePathBlocked(await resolvePath(allowedPath))).toBe(false);
	});

	it('should handle empty strings in allowed paths', async () => {
		securityConfig.restrictFileAccessTo = '/path1;;/path2';
		const allowedPath = '/path2/somefile';
		expect(isFilePathBlocked(await resolvePath(allowedPath))).toBe(false);
	});

	it('should trim whitespace in allowed paths', async () => {
		securityConfig.restrictFileAccessTo = ' /path1 ; /path2 ; /path3 ';
		const allowedPath = '/path2/somefile';
		expect(isFilePathBlocked(await resolvePath(allowedPath))).toBe(false);
	});

	it('should return false when BLOCK_FILE_ACCESS_TO_N8N_FILES is false', async () => {
		process.env[BLOCK_FILE_ACCESS_TO_N8N_FILES] = 'false';
		const restrictedPath = instanceSettings.n8nFolder;
		expect(isFilePathBlocked(await resolvePath(restrictedPath))).toBe(false);
	});

	it('should return true when path is in allowed paths but still restricted', async () => {
		securityConfig.restrictFileAccessTo = '/some/allowed/path';
		const restrictedPath = instanceSettings.n8nFolder;
		expect(isFilePathBlocked(await resolvePath(restrictedPath))).toBe(true);
	});

	it('should return false when path is in allowed paths', async () => {
		const allowedPath = '/some/allowed/path';
		securityConfig.restrictFileAccessTo = allowedPath;
		expect(isFilePathBlocked(await resolvePath(allowedPath))).toBe(false);
	});

	it('should return true when file paths in CONFIG_FILES', async () => {
		process.env[CONFIG_FILES] = '/path/to/config1,/path/to/config2';
		const configPath = '/path/to/config1/somefile';
		expect(isFilePathBlocked(await resolvePath(configPath))).toBe(true);
	});

	it('should return true when file paths in CUSTOM_EXTENSION_ENV', async () => {
		process.env[CUSTOM_EXTENSION_ENV] = '/path/to/extensions1;/path/to/extensions2';
		const extensionPath = '/path/to/extensions1/somefile';
		expect(isFilePathBlocked(await resolvePath(extensionPath))).toBe(true);
	});

	it('should return true when file paths in BINARY_DATA_STORAGE_PATH', async () => {
		process.env[BINARY_DATA_STORAGE_PATH] = '/path/to/binary/storage';
		const binaryPath = '/path/to/binary/storage/somefile';
		expect(isFilePathBlocked(await resolvePath(binaryPath))).toBe(true);
	});

	it('should block file paths in email template paths', async () => {
		process.env[UM_EMAIL_TEMPLATES_INVITE] = '/path/to/invite/templates';
		process.env[UM_EMAIL_TEMPLATES_PWRESET] = '/path/to/pwreset/templates';

		const invitePath = '/path/to/invite/templates/invite.html';
		const pwResetPath = '/path/to/pwreset/templates/reset.html';

		expect(isFilePathBlocked(await resolvePath(invitePath))).toBe(true);
		expect(isFilePathBlocked(await resolvePath(pwResetPath))).toBe(true);
	});

	it('should block access to n8n files if restrict and block are set', async () => {
		const homeVarName = process.platform === 'win32' ? 'USERPROFILE' : 'HOME';
		const userHome = process.env.N8N_USER_FOLDER ?? process.env[homeVarName] ?? process.cwd();

		securityConfig.restrictFileAccessTo = userHome;
		process.env[BLOCK_FILE_ACCESS_TO_N8N_FILES] = 'true';
		const restrictedPath = instanceSettings.n8nFolder;
		expect(isFilePathBlocked(await resolvePath(restrictedPath))).toBe(true);
	});

	it('should allow access to parent folder if restrict and block are set', async () => {
		const homeVarName = process.platform === 'win32' ? 'USERPROFILE' : 'HOME';
		const userHome = process.env.N8N_USER_FOLDER ?? process.env[homeVarName] ?? process.cwd();

		securityConfig.restrictFileAccessTo = userHome;
		process.env[BLOCK_FILE_ACCESS_TO_N8N_FILES] = 'true';
		const restrictedPath = await resolvePath(join(userHome, 'somefile.txt'));
		expect(isFilePathBlocked(restrictedPath)).toBe(false);
	});

	it('should not block similar paths', async () => {
		const homeVarName = process.platform === 'win32' ? 'USERPROFILE' : 'HOME';
		const userHome = process.env.N8N_USER_FOLDER ?? process.env[homeVarName] ?? process.cwd();

		securityConfig.restrictFileAccessTo = userHome;
		process.env[BLOCK_FILE_ACCESS_TO_N8N_FILES] = 'true';
		const restrictedPath = await resolvePath(join(userHome, '.n8n_x'));
		expect(isFilePathBlocked(restrictedPath)).toBe(false);
	});

	it('should return true for a symlink in a allowed path to a restricted path', async () => {
		securityConfig.restrictFileAccessTo = '/path1';
		const allowedPath = '/path1/symlink';
		const actualPath = '/path2/realfile';
		(fsRealpath as Mock).mockImplementation((path: string) =>
			path === allowedPath ? actualPath : path,
		);
		expect(isFilePathBlocked(await resolvePath(allowedPath))).toBe(true);
	});

	it('should handle non-existent file when it is allowed', async () => {
		const filePath = '/non/existent/file';
		const error = new Error('ENOENT');
		// @ts-expect-error undefined property
		error.code = 'ENOENT';
		(fsRealpath as Mock).mockRejectedValueOnce(error);
		expect(isFilePathBlocked(await resolvePath(filePath))).toBe(false);
	});

	it('should handle non-existent file when it is not allowed', async () => {
		const filePath = '/non/existent/file';
		const allowedPath = '/some/allowed/path';
		securityConfig.restrictFileAccessTo = allowedPath;
		const error = new Error('ENOENT');
		// @ts-expect-error undefined property
		error.code = 'ENOENT';
		(fsRealpath as Mock).mockRejectedValueOnce(error);
		expect(isFilePathBlocked(await resolvePath(filePath))).toBe(true);
	});

	it.each(['.git', '/.git', '/tmp/.git', '/tmp/.git/config'])(
		'should per default block access to %s',
		async (path) => {
			expect(isFilePathBlocked(await resolvePath(path))).toBe(true);
		},
	);

	it('should allow access when pattern matching is disabled', async () => {
		securityConfig.blockFilePatterns = '';
		expect(isFilePathBlocked(await resolvePath('/tmp/.git'))).toBe(false);
	});

	it('should block all access when using invalid pattern', async () => {
		securityConfig.blockFilePatterns = '(';
		expect(isFilePathBlocked(await resolvePath('/tmp/xo'))).toBe(true);
	});

	describe('cross-platform path handling', () => {
		beforeEach(() => {
			// Use default .git blocking pattern
			securityConfig.blockFilePatterns = '^(.*\\/)*\\.git(\\/.*)*$';
		});

		it('should handle Windows-style paths for .git directory', async () => {
			const windowsGitPath = 'C:\\repo\\.git\\config';
			expect(isFilePathBlocked(await resolvePath(windowsGitPath))).toBe(true);
		});

		it('should handle nested Windows paths for .git subdirectories', async () => {
			const windowsGitPath = 'C:\\Users\\user\\project\\.git\\hooks\\pre-commit';
			expect(isFilePathBlocked(await resolvePath(windowsGitPath))).toBe(true);
		});

		it('should handle mixed path separators', async () => {
			const mixedPath = 'C:\\repo/.git\\objects\\abc123';
			expect(isFilePathBlocked(await resolvePath(mixedPath))).toBe(true);
		});

		it('should allow legitimate files with git-related extensions', async () => {
			const legitimatePath = 'C:\\repo\\somefile.txt';
			expect(isFilePathBlocked(await resolvePath(legitimatePath))).toBe(false);
		});

		it('should handle Windows absolute paths to .git', async () => {
			const windowsRootGit = 'C:\\.git';
			expect(isFilePathBlocked(await resolvePath(windowsRootGit))).toBe(true);
		});
	});

	describe('when multiple file patterns are configured', () => {
		beforeEach(() => {
			securityConfig.blockFilePatterns = 'hello; \\/there$; ^where';
		});

		it.each([
			'hello',
			'xhellox',
			'subpath/hello/',
			'/there',
			'/subpath/there',
			'where',
			'where-is/it',
		])('should block access to %s', async (path) => {
			expect(isFilePathBlocked(await resolvePath(path))).toBe(true);
		});

		it.each(['/there/is', '/where'])('should not block access to %s', async (path) => {
			expect(isFilePathBlocked(await resolvePath(path))).toBe(false);
		});
	});
});

describe('getFileSystemHelperFunctions', () => {
	const node = { type: 'TestNode' } as INode;
	const helperFunctions = getFileSystemHelperFunctions(node);

	it('should create helper functions with correct context', () => {
		const expectedMethods = ['createReadStream', 'getStoragePath', 'writeContentToFile'] as const;

		expectedMethods.forEach((method) => {
			expect(helperFunctions).toHaveProperty(method);
			expect(typeof helperFunctions[method]).toBe('function');
		});
	});

	describe('getStoragePath', () => {
		it('returns correct path', () => {
			const expectedPath = join(instanceSettings.n8nFolder, `storage/${node.type}`);
			expect(helperFunctions.getStoragePath()).toBe(expectedPath);
		});
	});

	describe('createReadStream', () => {
		const mockFileStats = { dev: 123, ino: 456 };

		it('should throw error for non-existent file', async () => {
			const filePath = '/non/existent/file';
			const error = new Error('ENOENT');
			// @ts-expect-error undefined property
			error.code = 'ENOENT';
			(fsStat as Mock).mockResolvedValueOnce(mockFileStats);
			(fsAccess as Mock).mockRejectedValueOnce(error);

			await expect(
				helperFunctions.createReadStream(await helperFunctions.resolvePath(filePath)),
			).rejects.toThrow(`The file "${filePath}" could not be accessed.`);
		});

		it('should throw when file access is blocked', async () => {
			securityConfig.restrictFileAccessTo = '/allowed/path';
			(fsStat as Mock).mockResolvedValueOnce(mockFileStats);
			await expect(
				helperFunctions.createReadStream(await helperFunctions.resolvePath('/blocked/path')),
			).rejects.toThrow('Access to the file is not allowed');
		});

		it('should not reveal if file exists if it is within restricted path', async () => {
			securityConfig.restrictFileAccessTo = '/allowed/path';
			(fsStat as Mock).mockResolvedValueOnce(mockFileStats);

			await expect(
				helperFunctions.createReadStream(await helperFunctions.resolvePath('/blocked/path')),
			).rejects.toThrow('Access to the file is not allowed');
		});

		it('should create a read stream if file access is permitted', async () => {
			const filePath = '/allowed/path';
			const mockStream = { pipe: vi.fn() };
			const mockFileHandle = {
				stat: vi.fn().mockResolvedValue(mockFileStats),
				createReadStream: vi.fn().mockReturnValue(mockStream),
			};

			(fsStat as Mock).mockResolvedValueOnce(mockFileStats);
			(fsAccess as Mock).mockResolvedValueOnce(undefined);
			(fsOpen as Mock).mockResolvedValueOnce(mockFileHandle);

			const result = await helperFunctions.createReadStream(
				await helperFunctions.resolvePath(filePath),
			);

			expect(result).toBe(mockStream);
			expect(fsOpen).toHaveBeenCalledWith(filePath, constants.O_RDONLY | constants.O_NOFOLLOW);
		});

		it('should reject symlinks with ELOOP error', async () => {
			const filePath = '/allowed/path/file';
			const eloopError = new Error('ELOOP: too many symbolic links encountered');
			// @ts-expect-error undefined property
			eloopError.code = 'ELOOP';

			(fsStat as Mock).mockResolvedValueOnce(mockFileStats);
			(fsAccess as Mock).mockResolvedValueOnce(undefined);
			(fsOpen as Mock).mockRejectedValueOnce(eloopError);

			await expect(
				helperFunctions.createReadStream(await helperFunctions.resolvePath(filePath)),
			).rejects.toThrow('Symlinks are not allowed.');
		});

		it('should reject when file identity changes', async () => {
			const filePath = '/allowed/path/file';
			const differentStats = { dev: 999, ino: 888 };
			const mockFileHandle = {
				stat: vi.fn().mockResolvedValue(differentStats),
				createReadStream: vi.fn(),
				close: vi.fn(),
			};

			(fsStat as Mock).mockResolvedValueOnce(mockFileStats);
			(fsAccess as Mock).mockResolvedValueOnce(undefined);
			(fsOpen as Mock).mockResolvedValueOnce(mockFileHandle);

			await expect(
				helperFunctions.createReadStream(await helperFunctions.resolvePath(filePath)),
			).rejects.toThrow('The file has changed and cannot be accessed.');
			expect(mockFileHandle.close).toHaveBeenCalled();
		});
	});

	describe('writeContentToFile', () => {
		const mockFileStats = { dev: 123, ino: 456, isFile: () => true };

		it('should throw error for blocked file path', async () => {
			process.env[BLOCK_FILE_ACCESS_TO_N8N_FILES] = 'true';

			await expect(
				helperFunctions.writeContentToFile(
					await helperFunctions.resolvePath(instanceSettings.n8nFolder + '/test.txt'),
					'content',
					constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC,
				),
			).rejects.toThrow('not writable');
		});

		it('should reject symlinks with ELOOP error', async () => {
			const filePath = '/allowed/path/file';
			const eloopError = new Error('ELOOP: too many symbolic links encountered');
			// @ts-expect-error undefined property
			eloopError.code = 'ELOOP';

			(fsStat as Mock).mockResolvedValueOnce(mockFileStats);
			(fsOpen as Mock).mockRejectedValueOnce(eloopError);

			await expect(
				helperFunctions.writeContentToFile(
					await helperFunctions.resolvePath(filePath),
					'test content',
				),
			).rejects.toThrow('Symlinks are not allowed.');
		});

		it('should reject when file identity changes', async () => {
			const filePath = '/allowed/path/file';
			const differentStats = { dev: 999, ino: 888, isFile: () => true };
			const mockFileHandle = {
				stat: vi.fn().mockResolvedValue(differentStats),
				truncate: vi.fn(),
				write: vi.fn(),
				close: vi.fn(),
			};

			(fsStat as Mock).mockResolvedValueOnce(mockFileStats);
			(fsOpen as Mock).mockResolvedValueOnce(mockFileHandle);

			await expect(
				helperFunctions.writeContentToFile(
					await helperFunctions.resolvePath(filePath),
					'test content',
				),
			).rejects.toThrow('The file has changed and cannot be written.');

			expect(mockFileHandle.close).toHaveBeenCalled();
		});

		it('should successfully write to file when identity matches', async () => {
			const filePath = '/allowed/path/file';
			const mockFileHandle = {
				stat: vi.fn().mockResolvedValue(mockFileStats),
				truncate: vi.fn().mockResolvedValue(undefined),
				writeFile: vi.fn().mockResolvedValue(undefined),
				close: vi.fn().mockResolvedValue(undefined),
			};

			(fsStat as Mock).mockResolvedValueOnce(mockFileStats);
			(fsOpen as Mock).mockResolvedValueOnce(mockFileHandle);

			await helperFunctions.writeContentToFile(
				await helperFunctions.resolvePath(filePath),
				'test content',
			);

			expect(fsOpen).toHaveBeenCalledWith(
				filePath,
				constants.O_WRONLY | constants.O_CREAT | constants.O_NOFOLLOW,
			);
			expect(mockFileHandle.truncate).toHaveBeenCalledWith(0);
			expect(mockFileHandle.writeFile).toHaveBeenCalledWith('test content', { encoding: 'binary' });
			expect(mockFileHandle.close).toHaveBeenCalled();
		});

		it('should successfully create and write to new file', async () => {
			const filePath = '/allowed/path/newfile';
			const enoentError = new Error('ENOENT');
			// @ts-expect-error undefined property
			enoentError.code = 'ENOENT';

			const newFileStats = { dev: 123, ino: 789, isFile: () => true };
			const mockFileHandle = {
				stat: vi.fn().mockResolvedValue(newFileStats),
				truncate: vi.fn().mockResolvedValue(undefined),
				writeFile: vi.fn().mockResolvedValue(undefined),
				close: vi.fn().mockResolvedValue(undefined),
			};

			(fsStat as Mock).mockRejectedValueOnce(enoentError);
			(fsStat as Mock).mockResolvedValueOnce(newFileStats);
			(fsOpen as Mock).mockResolvedValueOnce(mockFileHandle);

			await helperFunctions.writeContentToFile(
				await helperFunctions.resolvePath(filePath),
				'new content',
			);

			expect(mockFileHandle.truncate).toHaveBeenCalledWith(0);
			expect(mockFileHandle.writeFile).toHaveBeenCalledWith('new content', { encoding: 'binary' });
			expect(mockFileHandle.close).toHaveBeenCalled();
		});

		it('should strip O_TRUNC flag from user flags', async () => {
			const filePath = '/allowed/path/file';
			const mockFileHandle = {
				stat: vi.fn().mockResolvedValue(mockFileStats),
				truncate: vi.fn().mockResolvedValue(undefined),
				writeFile: vi.fn().mockResolvedValue(undefined),
				close: vi.fn().mockResolvedValue(undefined),
			};

			(fsStat as Mock).mockResolvedValueOnce(mockFileStats);
			(fsOpen as Mock).mockResolvedValueOnce(mockFileHandle);

			await helperFunctions.writeContentToFile(
				await helperFunctions.resolvePath(filePath),
				'test content',
				constants.O_TRUNC, // This should be stripped
			);

			// Verify O_TRUNC was not passed to fsOpen
			expect(fsOpen).toHaveBeenCalledWith(
				filePath,
				constants.O_WRONLY | constants.O_CREAT | constants.O_NOFOLLOW,
			);
		});

		it('should reject non-regular files (directories)', async () => {
			const filePath = '/allowed/path/directory';
			const dirStats = { dev: 123, ino: 456, isFile: () => false };
			const mockFileHandle = {
				stat: vi.fn().mockResolvedValue(dirStats),
				close: vi.fn().mockResolvedValue(undefined),
			};

			(fsStat as Mock).mockResolvedValueOnce(dirStats);
			(fsOpen as Mock).mockResolvedValueOnce(mockFileHandle);

			await expect(
				helperFunctions.writeContentToFile(
					await helperFunctions.resolvePath(filePath),
					'test content',
				),
			).rejects.toThrow('The path is not a regular file.');

			expect(mockFileHandle.close).toHaveBeenCalled();
		});
	});

	describe('symlinked ancestor directory', () => {
		// Build a REAL symlinked dir via importActual (this file mocks node:fs/promises, but the
		// symlink check in @n8n/backend-common runs against the real filesystem).
		let realFs: {
			realpath(path: string): Promise<string>;
			mkdtemp(prefix: string): Promise<string>;
			mkdir(path: string, options?: { recursive?: boolean }): Promise<string | undefined>;
			symlink(target: string, path: string): Promise<void>;
			rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>;
		};
		let base: string;
		let pathWithSymlinkedAncestor: string;

		beforeAll(async () => {
			realFs = await vi.importActual('node:fs/promises');
		});

		beforeEach(async () => {
			base = await realFs.realpath(await realFs.mkdtemp(join(tmpdir(), 'fsh-toctou-')));
			await realFs.mkdir(join(base, 'real'), { recursive: true });
			await realFs.symlink(join(base, 'real'), join(base, 'link'));
			// `link` is a symlinked ancestor of the target file.
			pathWithSymlinkedAncestor = join(base, 'link', 'file.txt');
		});

		afterEach(async () => {
			await realFs.rm(base, { recursive: true, force: true });
		});

		it('createReadStream rejects when an ancestor path component is a symlink', async () => {
			(fsStat as Mock).mockResolvedValueOnce({ dev: 1, ino: 2 });
			(fsAccess as Mock).mockResolvedValueOnce(undefined);

			await expect(
				helperFunctions.createReadStream(
					await helperFunctions.resolvePath(pathWithSymlinkedAncestor),
				),
			).rejects.toThrow('Access to the file is not allowed');
		});

		it('writeContentToFile rejects when an ancestor path component is a symlink', async () => {
			(fsStat as Mock).mockResolvedValueOnce({ dev: 1, ino: 2, isFile: () => true });

			await expect(
				helperFunctions.writeContentToFile(
					await helperFunctions.resolvePath(pathWithSymlinkedAncestor),
					'content',
				),
			).rejects.toThrow('Access to the file is not allowed');
		});
	});

	describe('ensureParentDirectoryWithoutFollowingSymlinks', () => {
		it('creates each parent component when none is a symlink', async () => {
			(fsMkdir as Mock).mockResolvedValue(undefined);
			(fsLstat as Mock).mockResolvedValue({ isSymbolicLink: () => false, isDirectory: () => true });

			await expect(
				helperFunctions.ensureParentDirectoryWithoutFollowingSymlinks(
					await helperFunctions.resolvePath('/allowed/dir/file'),
				),
			).resolves.toBeUndefined();

			expect(fsMkdir).toHaveBeenCalledWith('/allowed');
			expect(fsMkdir).toHaveBeenCalledWith('/allowed/dir');
		});

		it('rejects when a parent component is a symlink', async () => {
			(fsMkdir as Mock).mockResolvedValue(undefined);
			(fsLstat as Mock).mockResolvedValue({ isSymbolicLink: () => true, isDirectory: () => false });

			await expect(
				helperFunctions.ensureParentDirectoryWithoutFollowingSymlinks(
					await helperFunctions.resolvePath('/allowed/dir/file'),
				),
			).rejects.toThrow('Access to the file is not allowed');
		});
	});

	describe('resolveStagingBaseForTarget', () => {
		it('returns the realpath of the allowed base that contains the target', async () => {
			securityConfig.restrictFileAccessTo = '/allowed/base';

			const base = await helperFunctions.resolveStagingBaseForTarget(
				await helperFunctions.resolvePath('/allowed/base/sub/repo'),
			);

			expect(base).toBe('/allowed/base');
		});

		it('returns the containing base when several are allowed', async () => {
			securityConfig.restrictFileAccessTo = '/first/base;/second/base';

			const base = await helperFunctions.resolveStagingBaseForTarget(
				await helperFunctions.resolvePath('/second/base/repo'),
			);

			expect(base).toBe('/second/base');
		});

		it('resolves the allowed base through symlinks', async () => {
			securityConfig.restrictFileAccessTo = '/allowed/link';
			(fsRealpath as Mock).mockImplementation((path: string) =>
				path === '/allowed/link' ? '/allowed/real' : path,
			);

			const base = await helperFunctions.resolveStagingBaseForTarget(
				'/allowed/link/repo' as ResolvedFilePath,
			);

			expect(base).toBe('/allowed/real');
		});

		it('falls back to the n8n folder when no path restriction is configured', async () => {
			securityConfig.restrictFileAccessTo = '';

			const base = await helperFunctions.resolveStagingBaseForTarget(
				'/anywhere/repo' as ResolvedFilePath,
			);

			expect(base).toBe(instanceSettings.n8nFolder);
		});
	});

	describe('pinDirectory', () => {
		const originalPlatform = process.platform;
		const setPlatform = (platform: string) =>
			Object.defineProperty(process, 'platform', { value: platform, configurable: true });

		afterEach(() => {
			Object.defineProperty(process, 'platform', {
				value: originalPlatform,
				configurable: true,
			});
		});

		it('returns null on non-Linux platforms', async () => {
			setPlatform('darwin');
			securityConfig.restrictFileAccessTo = '/allowed/base';

			await expect(
				helperFunctions.pinDirectory('/allowed/base/sub', { create: false }),
			).resolves.toBeNull();
		});

		it('returns null when the directory is not within a trusted base', async () => {
			setPlatform('linux');
			securityConfig.restrictFileAccessTo = '/allowed/base';

			await expect(
				helperFunctions.pinDirectory('/elsewhere/sub', { create: false }),
			).resolves.toBeNull();
		});

		it('returns null when the resolved anchor no longer contains the path', async () => {
			setPlatform('linux');
			securityConfig.restrictFileAccessTo = '/allowed/link';
			(fsRealpath as Mock).mockImplementation((path: string) =>
				path === '/allowed/link' ? '/real/base' : path,
			);

			await expect(
				helperFunctions.pinDirectory('/allowed/link/sub', { create: false }),
			).resolves.toBeNull();
		});

		it('descends from the trusted base relative to the held descriptors', async () => {
			setPlatform('linux');
			securityConfig.restrictFileAccessTo = '/allowed/base';

			const handles: Array<{ fd: number; close: Mock }> = [];
			let nextFd = 10;
			(fsOpen as Mock).mockImplementation(async () => {
				const handle = { fd: nextFd++, close: vi.fn().mockResolvedValue(undefined) };
				handles.push(handle);
				return handle;
			});
			(fsMkdir as Mock).mockResolvedValue(undefined);
			(fsOpen as Mock).mockClear();
			(fsMkdir as Mock).mockClear();

			const pinned = await helperFunctions.pinDirectory('/allowed/base/sub/dir', {
				create: true,
			});

			expect(fsOpen).toHaveBeenNthCalledWith(1, '/allowed/base', expect.any(Number));
			expect(fsMkdir).toHaveBeenCalledWith('/proc/self/fd/10/sub');
			expect(fsOpen).toHaveBeenNthCalledWith(2, '/proc/self/fd/10/sub', expect.any(Number));
			expect(fsMkdir).toHaveBeenCalledWith('/proc/self/fd/11/dir');
			expect(fsOpen).toHaveBeenNthCalledWith(3, '/proc/self/fd/11/dir', expect.any(Number));

			expect(pinned).not.toBeNull();
			expect(pinned?.resolvePath('repo')).toBe('/proc/self/fd/12/repo');

			// Intermediate descriptors are closed during the descent; the final one is held.
			expect(handles[0].close).toHaveBeenCalled();
			expect(handles[1].close).toHaveBeenCalled();
			expect(handles[2].close).not.toHaveBeenCalled();

			await pinned?.close();
			expect(handles[2].close).toHaveBeenCalled();
		});

		it('rejects when a descended component is not a real directory', async () => {
			setPlatform('linux');
			securityConfig.restrictFileAccessTo = '/allowed/base';

			const notDirectory = Object.assign(new Error('ENOTDIR'), { code: 'ENOTDIR' });
			const closeAnchor = vi.fn().mockResolvedValue(undefined);
			let call = 0;
			(fsOpen as Mock).mockImplementation(async () => {
				call += 1;
				if (call === 1) return { fd: 20, close: closeAnchor };
				throw notDirectory;
			});

			await expect(
				helperFunctions.pinDirectory('/allowed/base/link', { create: false }),
			).rejects.toThrow('Access to the file is not allowed');
			expect(closeAnchor).toHaveBeenCalled();
		});
	});

	describe('pinned file access on Linux', () => {
		const originalPlatform = process.platform;

		beforeEach(() => {
			Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
			securityConfig.restrictFileAccessTo = '/allowed';
		});

		afterEach(() => {
			Object.defineProperty(process, 'platform', {
				value: originalPlatform,
				configurable: true,
			});
		});

		// '/allowed/sub/file' pins via two directory opens (anchor + 'sub'); the third open
		// is the leaf, addressed relative to the pinned parent descriptor.
		const onLeafOpen = (leaf: () => Promise<unknown>) => {
			let call = 0;
			let fd = 30;
			(fsOpen as Mock).mockImplementation(async () => {
				call += 1;
				if (call <= 2) {
					return { fd: fd++, close: vi.fn().mockResolvedValue(undefined) };
				}
				return await leaf();
			});
		};

		it('rejects a symlinked leaf opened relative to the pinned parent', async () => {
			const eloop = Object.assign(new Error('ELOOP'), { code: 'ELOOP' });
			(fsStat as Mock).mockResolvedValueOnce({ dev: 1, ino: 2 });
			(fsAccess as Mock).mockResolvedValueOnce(undefined);
			onLeafOpen(async () => {
				throw eloop;
			});

			await expect(
				helperFunctions.createReadStream(await helperFunctions.resolvePath('/allowed/sub/file')),
			).rejects.toThrow('Symlinks are not allowed.');
		});

		it('opens the leaf relative to the pinned parent and verifies its identity', async () => {
			const stats = { dev: 7, ino: 8 };
			const stream = { pipe: vi.fn() };
			const fileHandle = {
				stat: vi.fn().mockResolvedValue(stats),
				createReadStream: vi.fn().mockReturnValue(stream),
				close: vi.fn(),
			};
			(fsStat as Mock).mockResolvedValueOnce(stats);
			(fsAccess as Mock).mockResolvedValueOnce(undefined);
			onLeafOpen(async () => fileHandle);

			const result = await helperFunctions.createReadStream(
				await helperFunctions.resolvePath('/allowed/sub/file'),
			);

			expect(result).toBe(stream);
			const leafCall = (fsOpen as Mock).mock.calls.at(-1);
			expect(leafCall?.[0]).toMatch(/^\/proc\/self\/fd\/\d+\/file$/);
		});

		it('rejects when the pinned leaf identity does not match', async () => {
			const fileHandle = {
				stat: vi.fn().mockResolvedValue({ dev: 999, ino: 888 }),
				createReadStream: vi.fn(),
				close: vi.fn(),
			};
			(fsStat as Mock).mockResolvedValueOnce({ dev: 7, ino: 8 });
			(fsAccess as Mock).mockResolvedValueOnce(undefined);
			onLeafOpen(async () => fileHandle);

			await expect(
				helperFunctions.createReadStream(await helperFunctions.resolvePath('/allowed/sub/file')),
			).rejects.toThrow('The file has changed and cannot be accessed.');
			expect(fileHandle.close).toHaveBeenCalled();
		});
	});
});
