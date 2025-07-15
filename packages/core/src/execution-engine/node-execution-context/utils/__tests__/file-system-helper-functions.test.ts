import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { createReadStream } from 'node:fs';
import { access as fsAccess } from 'node:fs/promises';
import { join } from 'node:path';

import {
	BINARY_DATA_STORAGE_PATH,
	BLOCK_FILE_ACCESS_TO_N8N_FILES,
	CONFIG_FILES,
	CUSTOM_EXTENSION_ENV,
	RESTRICT_FILE_ACCESS_TO,
	UM_EMAIL_TEMPLATES_INVITE,
	UM_EMAIL_TEMPLATES_PWRESET,
} from '@/constants';
import { InstanceSettings } from '@/instance-settings';

import { getFileSystemHelperFunctions, isFilePathBlocked } from '../file-system-helper-functions';

jest.mock('node:fs');
jest.mock('node:fs/promises');

const originalProcessEnv = { ...process.env };

let instanceSettings: InstanceSettings;
beforeEach(() => {
	process.env = { ...originalProcessEnv };

	const error = new Error('ENOENT');
	// @ts-expect-error undefined property
	error.code = 'ENOENT';
	(fsAccess as jest.Mock).mockRejectedValue(error);

	instanceSettings = Container.get(InstanceSettings);
});

describe('isFilePathBlocked', () => {
	beforeEach(() => {
		process.env[BLOCK_FILE_ACCESS_TO_N8N_FILES] = 'true';
	});

	it('should return true for static cache dir', () => {
		const filePath = instanceSettings.staticCacheDir;
		expect(isFilePathBlocked(filePath)).toBe(true);
	});

	it('should return true for restricted paths', () => {
		const restrictedPath = instanceSettings.n8nFolder;
		expect(isFilePathBlocked(restrictedPath)).toBe(true);
	});

	it('should handle empty allowed paths', () => {
		delete process.env[RESTRICT_FILE_ACCESS_TO];
		const result = isFilePathBlocked('/some/random/path');
		expect(result).toBe(false);
	});

	it('should handle multiple allowed paths', () => {
		process.env[RESTRICT_FILE_ACCESS_TO] = '/path1;/path2;/path3';
		const allowedPath = '/path2/somefile';
		expect(isFilePathBlocked(allowedPath)).toBe(false);
	});

	it('should handle empty strings in allowed paths', () => {
		process.env[RESTRICT_FILE_ACCESS_TO] = '/path1;;/path2';
		const allowedPath = '/path2/somefile';
		expect(isFilePathBlocked(allowedPath)).toBe(false);
	});

	it('should trim whitespace in allowed paths', () => {
		process.env[RESTRICT_FILE_ACCESS_TO] = ' /path1 ; /path2 ; /path3 ';
		const allowedPath = '/path2/somefile';
		expect(isFilePathBlocked(allowedPath)).toBe(false);
	});

	it('should return false when BLOCK_FILE_ACCESS_TO_N8N_FILES is false', () => {
		process.env[BLOCK_FILE_ACCESS_TO_N8N_FILES] = 'false';
		const restrictedPath = instanceSettings.n8nFolder;
		expect(isFilePathBlocked(restrictedPath)).toBe(false);
	});

	it('should return true when path is in allowed paths but still restricted', () => {
		process.env[RESTRICT_FILE_ACCESS_TO] = '/some/allowed/path';
		const restrictedPath = instanceSettings.n8nFolder;
		expect(isFilePathBlocked(restrictedPath)).toBe(true);
	});

	it('should return false when path is in allowed paths', () => {
		const allowedPath = '/some/allowed/path';
		process.env[RESTRICT_FILE_ACCESS_TO] = allowedPath;
		expect(isFilePathBlocked(allowedPath)).toBe(false);
	});

	it('should return true when file paths in CONFIG_FILES', () => {
		process.env[CONFIG_FILES] = '/path/to/config1,/path/to/config2';
		const configPath = '/path/to/config1/somefile';
		expect(isFilePathBlocked(configPath)).toBe(true);
	});

	it('should return true when file paths in CUSTOM_EXTENSION_ENV', () => {
		process.env[CUSTOM_EXTENSION_ENV] = '/path/to/extensions1;/path/to/extensions2';
		const extensionPath = '/path/to/extensions1/somefile';
		expect(isFilePathBlocked(extensionPath)).toBe(true);
	});

	it('should return true when file paths in BINARY_DATA_STORAGE_PATH', () => {
		process.env[BINARY_DATA_STORAGE_PATH] = '/path/to/binary/storage';
		const binaryPath = '/path/to/binary/storage/somefile';
		expect(isFilePathBlocked(binaryPath)).toBe(true);
	});

	it('should block file paths in email template paths', () => {
		process.env[UM_EMAIL_TEMPLATES_INVITE] = '/path/to/invite/templates';
		process.env[UM_EMAIL_TEMPLATES_PWRESET] = '/path/to/pwreset/templates';

		const invitePath = '/path/to/invite/templates/invite.html';
		const pwResetPath = '/path/to/pwreset/templates/reset.html';

		expect(isFilePathBlocked(invitePath)).toBe(true);
		expect(isFilePathBlocked(pwResetPath)).toBe(true);
	});

	it('should block access to n8n files if restrict and block are set', () => {
		const homeVarName = process.platform === 'win32' ? 'USERPROFILE' : 'HOME';
		const userHome = process.env.N8N_USER_FOLDER ?? process.env[homeVarName] ?? process.cwd();

		process.env[RESTRICT_FILE_ACCESS_TO] = userHome;
		process.env[BLOCK_FILE_ACCESS_TO_N8N_FILES] = 'true';
		const restrictedPath = instanceSettings.n8nFolder;
		expect(isFilePathBlocked(restrictedPath)).toBe(true);
	});

	it('should allow access to parent folder if restrict and block are set', () => {
		const homeVarName = process.platform === 'win32' ? 'USERPROFILE' : 'HOME';
		const userHome = process.env.N8N_USER_FOLDER ?? process.env[homeVarName] ?? process.cwd();

		process.env[RESTRICT_FILE_ACCESS_TO] = userHome;
		process.env[BLOCK_FILE_ACCESS_TO_N8N_FILES] = 'true';
		const restrictedPath = join(userHome, 'somefile.txt');
		expect(isFilePathBlocked(restrictedPath)).toBe(false);
	});

	it('should not block similar paths', () => {
		const homeVarName = process.platform === 'win32' ? 'USERPROFILE' : 'HOME';
		const userHome = process.env.N8N_USER_FOLDER ?? process.env[homeVarName] ?? process.cwd();

		process.env[RESTRICT_FILE_ACCESS_TO] = userHome;
		process.env[BLOCK_FILE_ACCESS_TO_N8N_FILES] = 'true';
		const restrictedPath = join(userHome, '.n8n_x');
		expect(isFilePathBlocked(restrictedPath)).toBe(false);
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

			await expect(helperFunctions.createReadStream(filePath)).rejects.toThrow(
				`The file "${filePath}" could not be accessed.`,
			);
		});

		it('should throw when file access is blocked', async () => {
			process.env[RESTRICT_FILE_ACCESS_TO] = '/allowed/path';
			(fsAccess as jest.Mock).mockResolvedValueOnce({});
			await expect(helperFunctions.createReadStream('/blocked/path')).rejects.toThrow(
				'Access to the file is not allowed',
			);
		});

		it('should create a read stream if file access is permitted', async () => {
			const filePath = '/allowed/path';
			(fsAccess as jest.Mock).mockResolvedValueOnce({});
			await helperFunctions.createReadStream(filePath);
			expect(createReadStream).toHaveBeenCalledWith(filePath);
		});
	});

	describe('writeContentToFile', () => {
		it('should throw error for blocked file path', async () => {
			process.env[BLOCK_FILE_ACCESS_TO_N8N_FILES] = 'true';

			await expect(
				helperFunctions.writeContentToFile(
					instanceSettings.n8nFolder + '/test.txt',
					'content',
					'w',
				),
			).rejects.toThrow('not writable');
		});
	});
});
