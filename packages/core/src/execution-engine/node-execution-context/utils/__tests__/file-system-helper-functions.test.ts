import { SecurityConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { constants, createReadStream } from 'node:fs';
import { access as fsAccess, realpath as fsRealpath } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

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

jest.mock('node:fs');
jest.mock('node:fs/promises');

const originalProcessEnv = { ...process.env };

let instanceSettings: InstanceSettings;
let securityConfig: SecurityConfig;
let originalBlockedFilePatterns: string;

beforeEach(() => {
	process.env = { ...originalProcessEnv };

	const error = new Error('ENOENT');
	// @ts-expect-error undefined property
	error.code = 'ENOENT';
	(fsAccess as jest.Mock).mockRejectedValue(error);
	(fsRealpath as jest.Mock).mockImplementation((path: string) => path);

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
		(fsRealpath as jest.Mock).mockImplementation((path: string) =>
			path === allowedPath ? actualPath : path,
		);
		expect(isFilePathBlocked(await resolvePath(allowedPath))).toBe(true);
	});

	it('should handle non-existent file when it is allowed', async () => {
		const filePath = '/non/existent/file';
		const error = new Error('ENOENT');
		// @ts-expect-error undefined property
		error.code = 'ENOENT';
		(fsRealpath as jest.Mock).mockRejectedValueOnce(error);
		expect(isFilePathBlocked(await resolvePath(filePath))).toBe(false);
	});

	it('should handle non-existent file when it is not allowed', async () => {
		const filePath = '/non/existent/file';
		const allowedPath = '/some/allowed/path';
		securityConfig.restrictFileAccessTo = allowedPath;
		const error = new Error('ENOENT');
		// @ts-expect-error undefined property
		error.code = 'ENOENT';
		(fsRealpath as jest.Mock).mockRejectedValueOnce(error);
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

describe('resolvePath - tilde expansion', () => {
	const node = { type: 'TestNode' } as INode;
	const { resolvePath } = getFileSystemHelperFunctions(node);

	beforeEach(() => {
		// Mock fsRealpath to return the path as-is for non-existent files
		(fsRealpath as jest.Mock).mockImplementation((path: string) => {
			// If path doesn't exist, throw ENOENT
			if (path.includes('non-existent')) {
				const error = new Error('ENOENT');
				// @ts-expect-error undefined property
				error.code = 'ENOENT';
				throw error;
			}
			return path;
		});
	});

	it('should expand ~ to ~/.n8n-files when no allowed paths are configured', async () => {
		securityConfig.restrictFileAccessTo = '';
		const expectedPath = resolve(homedir(), '.n8n-files');
		const resolved = await resolvePath('~');
		expect(resolved).toBe(expectedPath);
	});

	it('should expand ~/file.txt to ~/.n8n-files/file.txt when no allowed paths are configured', async () => {
		securityConfig.restrictFileAccessTo = '';
		const expectedPath = resolve(homedir(), '.n8n-files', 'file.txt');
		const resolved = await resolvePath('~/file.txt');
		expect(resolved).toBe(expectedPath);
	});

	it('should expand ~/subdir/file.txt to ~/.n8n-files/subdir/file.txt', async () => {
		securityConfig.restrictFileAccessTo = '';
		const expectedPath = resolve(homedir(), '.n8n-files', 'subdir', 'file.txt');
		const resolved = await resolvePath('~/subdir/file.txt');
		expect(resolved).toBe(expectedPath);
	});

	it('should expand ~ to first allowed path when N8N_RESTRICT_FILE_ACCESS_TO is configured', async () => {
		securityConfig.restrictFileAccessTo = '/custom/path1;/custom/path2';
		const resolved = await resolvePath('~');
		expect(resolved).toBe('/custom/path1');
	});

	it('should expand ~/file.txt to first allowed path when N8N_RESTRICT_FILE_ACCESS_TO is configured', async () => {
		securityConfig.restrictFileAccessTo = '/custom/path1;/custom/path2';
		const expectedPath = resolve('/custom/path1', 'file.txt');
		const resolved = await resolvePath('~/file.txt');
		expect(resolved).toBe(expectedPath);
	});

	it('should expand ~ with tilde in allowed path configuration', async () => {
		securityConfig.restrictFileAccessTo = '~/custom-files';
		const expectedPath = resolve(homedir(), 'custom-files');
		const resolved = await resolvePath('~');
		expect(resolved).toBe(expectedPath);
	});

	it('should expand ~/file.txt with tilde in allowed path configuration', async () => {
		securityConfig.restrictFileAccessTo = '~/custom-files';
		const expectedPath = resolve(homedir(), 'custom-files', 'file.txt');
		const resolved = await resolvePath('~/file.txt');
		expect(resolved).toBe(expectedPath);
	});

	it('should not expand paths that do not start with ~', async () => {
		securityConfig.restrictFileAccessTo = '';
		const testPath = '/absolute/path/file.txt';
		const resolved = await resolvePath(testPath);
		expect(resolved).toBe(testPath);
	});

	it('should handle ~ expansion for non-existent files', async () => {
		securityConfig.restrictFileAccessTo = '';
		const error = new Error('ENOENT');
		// @ts-expect-error undefined property
		error.code = 'ENOENT';
		(fsRealpath as jest.Mock).mockRejectedValueOnce(error);

		const expectedPath = resolve(homedir(), '.n8n-files', 'non-existent.txt');
		const resolved = await resolvePath('~/non-existent.txt');
		expect(resolved).toBe(expectedPath);
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
		it('should throw error for non-existent file', async () => {
			const filePath = '/non/existent/file';
			const error = new Error('ENOENT');
			// @ts-expect-error undefined property
			error.code = 'ENOENT';
			(fsAccess as jest.Mock).mockRejectedValueOnce(error);

			await expect(
				helperFunctions.createReadStream(await helperFunctions.resolvePath(filePath)),
			).rejects.toThrow(`The file "${filePath}" could not be accessed.`);
		});

		it('should throw when file access is blocked', async () => {
			securityConfig.restrictFileAccessTo = '/allowed/path';
			(fsAccess as jest.Mock).mockResolvedValueOnce({});
			await expect(
				helperFunctions.createReadStream(await helperFunctions.resolvePath('/blocked/path')),
			).rejects.toThrow('Access to the file is not allowed');
		});

		it('should not reveal if file exists if it is within restricted path', async () => {
			securityConfig.restrictFileAccessTo = '/allowed/path';

			const error = new Error('ENOENT');
			// @ts-expect-error undefined property
			error.code = 'ENOENT';
			(fsAccess as jest.Mock).mockRejectedValueOnce(error);

			await expect(
				helperFunctions.createReadStream(await helperFunctions.resolvePath('/blocked/path')),
			).rejects.toThrow('Access to the file is not allowed');
		});

		it('should create a read stream if file access is permitted', async () => {
			const filePath = '/allowed/path';
			(fsAccess as jest.Mock).mockResolvedValueOnce({});

			// Mock createReadStream to return a proper stream-like object
			const mockStream: { once: jest.Mock } = {
				once: jest.fn((event: string, callback: (error?: Error) => void): typeof mockStream => {
					if (event === 'open') {
						// Immediately call the open callback
						setImmediate(() => callback());
					}
					return mockStream;
				}),
			};
			(createReadStream as jest.Mock).mockReturnValueOnce(mockStream);

			await helperFunctions.createReadStream(await helperFunctions.resolvePath(filePath));
			expect(createReadStream).toHaveBeenCalledWith(
				filePath,
				expect.objectContaining({
					flags: expect.any(Number),
				}),
			);
		});

		it('should reject symlinks with O_NOFOLLOW to prevent TOCTOU attacks', async () => {
			const filePath = '/allowed/path/file';

			// Clear previous mocks and set up fresh mocks
			(fsAccess as jest.Mock).mockReset();
			(fsAccess as jest.Mock).mockResolvedValue(undefined);

			// Simulate the ELOOP error that occurs when O_NOFOLLOW encounters a symlink
			const eloopError = new Error('ELOOP: too many symbolic links encountered');
			// @ts-expect-error undefined property
			eloopError.code = 'ELOOP';

			// Mock createReadStream to return a stream that emits an error event
			const mockStream: { once: jest.Mock } = {
				once: jest.fn((event: string, callback: (error?: Error) => void): typeof mockStream => {
					if (event === 'error') {
						// Emit the error asynchronously
						setImmediate(() => callback(eloopError));
					}
					return mockStream;
				}),
			};
			(createReadStream as jest.Mock).mockReturnValueOnce(mockStream);

			await expect(
				helperFunctions.createReadStream(await helperFunctions.resolvePath(filePath)),
			).rejects.toThrow('ELOOP: too many symbolic links encountered');
		});
	});

	describe('writeContentToFile', () => {
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
	});
});
