import { Container } from '@n8n/di';

import { InstanceSettings } from '@/instance-settings';
import { mockInstance } from '@test/utils';

import { ConflictingStoragePathsError } from '../conflicting-storage-paths.error';
import { StorageConfig } from '../storage.config';

describe('StorageConfig', () => {
	const n8nFolder = '~/.n8n';

	beforeEach(() => {
		process.env = {};
		jest.resetAllMocks();
		Container.reset();
		mockInstance(InstanceSettings, { n8nFolder });
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

		expect(() => Container.get(StorageConfig)).toThrow(ConflictingStoragePathsError);
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
});
