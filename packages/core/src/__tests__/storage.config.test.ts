import { Container } from '@n8n/di';
import { existsSync, renameSync } from 'node:fs';

import { InstanceSettings } from '@/instance-settings';
import { mockInstance } from '@test/utils';

import { StoragePathError } from '../storage-path-conflict.error';
import { StorageConfig } from '../storage.config';

jest.mock('node:fs', () => ({
	existsSync: jest.fn(),
	renameSync: jest.fn(),
}));

describe('StorageConfig', () => {
	const n8nFolder = '~/.n8n';
	let markFsStorageMigrated: jest.Mock;

	beforeEach(() => {
		process.env = {};
		jest.resetAllMocks();
		Container.reset();
		markFsStorageMigrated = jest.fn();
		mockInstance(InstanceSettings, {
			n8nFolder,
			fsStorageMigrated: false,
			markFsStorageMigrated,
		});
		(existsSync as jest.Mock).mockReturnValue(false);
	});

	it('should use default values when no env variables are defined', () => {
		const config = Container.get(StorageConfig);

		expect(config.mode).toBe('database');
		expect(config.storagePath).toBe('~/.n8n/storage');
	});

	it('should set mode to filesystem when N8N_EXECUTION_DATA_STORAGE_MODE is filesystem', () => {
		process.env.N8N_EXECUTION_DATA_STORAGE_MODE = 'filesystem';

		const config = Container.get(StorageConfig);

		expect(config.mode).toBe('filesystem');
	});

	it('should override default path when N8N_STORAGE_PATH is set', () => {
		process.env.N8N_STORAGE_PATH = '/custom/storage/path';

		const config = Container.get(StorageConfig);

		expect(config.storagePath).toBe('/custom/storage/path');
	});

	it('should throw error when N8N_STORAGE_PATH and N8N_BINARY_DATA_STORAGE_PATH are set to different values', () => {
		process.env.N8N_STORAGE_PATH = '/path/one';
		process.env.N8N_BINARY_DATA_STORAGE_PATH = '/path/two';

		expect(() => Container.get(StorageConfig)).toThrow(StoragePathError);
	});

	it('should not throw error when N8N_STORAGE_PATH and N8N_BINARY_DATA_STORAGE_PATH are set to the same value', () => {
		process.env.N8N_STORAGE_PATH = '/same/path';
		process.env.N8N_BINARY_DATA_STORAGE_PATH = '/same/path';

		const config = Container.get(StorageConfig);

		expect(config.storagePath).toBe('/same/path');
	});

	it('should fall back to default for invalid mode value', () => {
		process.env.N8N_EXECUTION_DATA_STORAGE_MODE = 'invalid-mode';
		console.warn = jest.fn();

		const config = Container.get(StorageConfig);

		expect(config.mode).toBe('database');
		expect(console.warn).toHaveBeenCalledWith(
			expect.stringContaining('Invalid value for N8N_EXECUTION_DATA_STORAGE_MODE'),
		);
	});

	describe('storage dir migration', () => {
		it('should proceed when old path exists and new path does not', () => {
			(existsSync as jest.Mock)
				.mockReturnValueOnce(true) // old path exists
				.mockReturnValueOnce(false); // new path does not exist

			Container.get(StorageConfig);

			expect(renameSync).toHaveBeenCalledWith('~/.n8n/binaryData', '~/.n8n/storage');
			expect(markFsStorageMigrated).toHaveBeenCalled();
		});

		it('should skip if already migrated', () => {
			mockInstance(InstanceSettings, {
				n8nFolder,
				fsStorageMigrated: true,
				markFsStorageMigrated,
			});

			Container.get(StorageConfig);

			expect(renameSync).not.toHaveBeenCalled();
			expect(markFsStorageMigrated).not.toHaveBeenCalled();
		});

		it('should skip if `N8N_STORAGE_PATH` is set', () => {
			process.env.N8N_STORAGE_PATH = '/custom/path';

			Container.get(StorageConfig);

			expect(renameSync).not.toHaveBeenCalled();
		});

		it('should skip if `N8N_BINARY_DATA_STORAGE_PATH` is set', () => {
			process.env.N8N_BINARY_DATA_STORAGE_PATH = '/custom/path';

			Container.get(StorageConfig);

			expect(renameSync).not.toHaveBeenCalled();
		});

		it('should skip if `binaryData` does not exist', () => {
			(existsSync as jest.Mock).mockReturnValueOnce(false); // old path does not exist

			Container.get(StorageConfig);

			expect(renameSync).not.toHaveBeenCalled();
		});

		it('should error if `storage` already exists', () => {
			(existsSync as jest.Mock)
				.mockReturnValueOnce(true) // old path exists
				.mockReturnValueOnce(true); // new path also exists

			expect(() => Container.get(StorageConfig)).toThrow(StoragePathError);
			expect(renameSync).not.toHaveBeenCalled();
		});

		it.each(['ENOENT', 'EEXIST'])('should ignore `%s` error', (code) => {
			(existsSync as jest.Mock).mockReturnValueOnce(true).mockReturnValueOnce(false);
			(renameSync as jest.Mock).mockImplementation(() => {
				throw Object.assign(new Error(code), { code });
			});

			expect(() => Container.get(StorageConfig)).not.toThrow();
		});

		it('should rethrow other errors', () => {
			(existsSync as jest.Mock)
				.mockReturnValueOnce(true) // old path exists
				.mockReturnValueOnce(false); // new path does not exist
			const otherError = Object.assign(new Error('EACCES'), { code: 'EACCES' });
			(renameSync as jest.Mock).mockImplementation(() => {
				throw otherError;
			});

			expect(() => Container.get(StorageConfig)).toThrow(otherError);
		});
	});
});
