import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';

import type { ErrorReporter } from '@/errors';
import type { BinaryData } from '../types';
import { InvalidManagerError } from '../../errors/invalid-manager.error';

import { BinaryDataConfig } from '../binary-data.config';
import { BinaryDataService } from '../binary-data.service';

describe('BinaryDataService - Lazy Loading', () => {
	let binaryDataService: BinaryDataService;
	let config: BinaryDataConfig;
	let errorReporter: ErrorReporter;
	let logger: Logger;
	let mockManager: BinaryData.Manager;

	beforeEach(() => {
		const instanceSettings = {
			encryptionKey: 'test-key',
			n8nFolder: '/tmp/n8n',
		};
		const executionsConfig = {
			mode: 'regular',
		};
		config = new BinaryDataConfig(instanceSettings, executionsConfig);
		config.mode = 'filesystem';

		errorReporter = mock<ErrorReporter>();
		logger = mock<Logger>();

		// Create a mock manager
		mockManager = {
			init: jest.fn().mockResolvedValue(undefined),
			store: jest.fn(),
			getPath: jest.fn().mockReturnValue('/fake/path'),
			getAsBuffer: jest.fn().mockResolvedValue(Buffer.from('test')),
			getAsStream: jest.fn(),
			getMetadata: jest.fn().mockResolvedValue({ fileSize: 100 }),
			copyByFileId: jest.fn(),
			copyByFilePath: jest.fn(),
			rename: jest.fn(),
		};

		binaryDataService = new BinaryDataService(config, errorReporter, logger);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('Configured mode is eagerly loaded', () => {
		it('should eagerly load filesystem manager when mode is filesystem', async () => {
			config.mode = 'filesystem';

			await binaryDataService.init();

			// Manager should be loaded immediately
			const manager = await binaryDataService.getManager('filesystem-v2');
			expect(manager).toBeDefined();
		});

		it('should not load database manager when mode is filesystem', async () => {
			config.mode = 'filesystem';

			const databaseLoader = jest.fn().mockResolvedValue(mockManager);
			binaryDataService.registerLoader('database', databaseLoader);

			await binaryDataService.init();

			// Database loader should not be called
			expect(databaseLoader).not.toHaveBeenCalled();
		});
	});

	describe('Non-configured modes are lazy loaded', () => {
		it('should lazy-load database manager on first access', async () => {
			config.mode = 'filesystem';

			const databaseLoader = jest.fn().mockResolvedValue(mockManager);
			binaryDataService.registerLoader('database', databaseLoader);

			await binaryDataService.init();

			// Database loader should not be called yet
			expect(databaseLoader).not.toHaveBeenCalled();

			// Access database manager
			const manager = await binaryDataService.getManager('database');

			// Now loader should be called
			expect(databaseLoader).toHaveBeenCalledTimes(1);
			expect(manager).toBe(mockManager);
			expect(mockManager.init).toHaveBeenCalledTimes(1);
		});

		it('should cache loaded managers for subsequent accesses', async () => {
			config.mode = 'filesystem';

			const databaseLoader = jest.fn().mockResolvedValue(mockManager);
			binaryDataService.registerLoader('database', databaseLoader);

			await binaryDataService.init();

			// Access database manager multiple times
			const manager1 = await binaryDataService.getManager('database');
			const manager2 = await binaryDataService.getManager('database');
			const manager3 = await binaryDataService.getManager('database');

			// Loader should only be called once
			expect(databaseLoader).toHaveBeenCalledTimes(1);
			expect(manager1).toBe(manager2);
			expect(manager2).toBe(manager3);
		});

		it('should lazy-load S3 manager on first access', async () => {
			config.mode = 'filesystem';

			const s3Loader = jest.fn().mockResolvedValue(mockManager);
			binaryDataService.registerLoader('s3', s3Loader);

			await binaryDataService.init();

			// S3 loader should not be called yet
			expect(s3Loader).not.toHaveBeenCalled();

			// Access S3 manager
			const manager = await binaryDataService.getManager('s3');

			// Now loader should be called
			expect(s3Loader).toHaveBeenCalledTimes(1);
			expect(manager).toBe(mockManager);
		});
	});

	describe('Race condition handling', () => {
		it('should only load manager once when accessed simultaneously', async () => {
			config.mode = 'filesystem';

			let loaderCallCount = 0;
			const databaseLoader = jest.fn().mockImplementation(async () => {
				loaderCallCount++;
				// Simulate async loading delay
				await new Promise((resolve) => setTimeout(resolve, 50));
				return mockManager;
			});

			binaryDataService.registerLoader('database', databaseLoader);

			await binaryDataService.init();

			// Access database manager simultaneously
			const promises = [
				binaryDataService.getManager('database'),
				binaryDataService.getManager('database'),
				binaryDataService.getManager('database'),
			];

			const managers = await Promise.all(promises);

			// Loader should only be called once despite multiple simultaneous accesses
			expect(databaseLoader).toHaveBeenCalledTimes(1);
			expect(loaderCallCount).toBe(1);

			// All should return the same manager instance
			expect(managers[0]).toBe(managers[1]);
			expect(managers[1]).toBe(managers[2]);
		});
	});

	describe('Failed loads are not cached', () => {
		it('should retry loading on subsequent access after failure', async () => {
			config.mode = 'filesystem';

			let callCount = 0;
			const flakyLoader = jest.fn().mockImplementation(async () => {
				callCount++;
				if (callCount === 1) {
					throw new Error('Simulated loader failure');
				}
				return mockManager;
			});

			binaryDataService.registerLoader('database', flakyLoader);

			await binaryDataService.init();

			// First access should fail
			await expect(binaryDataService.getManager('database')).rejects.toThrow(
				'Simulated loader failure',
			);

			// Second access should succeed
			const manager = await binaryDataService.getManager('database');

			expect(flakyLoader).toHaveBeenCalledTimes(2);
			expect(manager).toBe(mockManager);
		});

		it('should log warning on loader failure', async () => {
			config.mode = 'filesystem';

			const failingLoader = jest.fn().mockRejectedValue(new Error('Load failed'));
			binaryDataService.registerLoader('database', failingLoader);

			await binaryDataService.init();

			// Try to access failing manager
			await expect(binaryDataService.getManager('database')).rejects.toThrow('Load failed');

			// Should log warning
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to load binary data manager for mode database',
				expect.objectContaining({
					error: expect.any(Error),
				}),
			);
		});

		it('should log debug messages during successful loading', async () => {
			config.mode = 'filesystem';

			const databaseLoader = jest.fn().mockResolvedValue(mockManager);
			binaryDataService.registerLoader('database', databaseLoader);

			await binaryDataService.init();

			// Access database manager
			await binaryDataService.getManager('database');

			// Should log debug messages
			expect(logger.debug).toHaveBeenCalledWith(
				'Lazy-loading binary data manager for mode: database',
			);
			expect(logger.debug).toHaveBeenCalledWith(
				'Successfully loaded binary data manager for mode: database',
			);
		});
	});

	describe('Invalid mode throws error', () => {
		it('should throw InvalidManagerError for unregistered mode', async () => {
			config.mode = 'filesystem';

			await binaryDataService.init();

			// Try to access unregistered mode
			await expect(binaryDataService.getManager('nonexistent')).rejects.toThrow(
				InvalidManagerError,
			);
		});

		it('should throw InvalidManagerError with mode information', async () => {
			config.mode = 'filesystem';

			await binaryDataService.init();

			// Try to access unregistered mode
			try {
				await binaryDataService.getManager('unknown-mode');
				fail('Should have thrown InvalidManagerError');
			} catch (error) {
				expect(error).toBeInstanceOf(InvalidManagerError);
				expect((error as InvalidManagerError).message).toContain('unknown-mode');
			}
		});
	});

	describe('Filesystem-v2 alias works correctly', () => {
		it('should set both filesystem and filesystem-v2 managers when loading filesystem', async () => {
			config.mode = 'filesystem';

			await binaryDataService.init();

			// Both keys should exist and point to same manager
			const fsManager = await binaryDataService.getManager('filesystem');
			const fsV2Manager = await binaryDataService.getManager('filesystem-v2');

			expect(fsManager).toBe(fsV2Manager);
		});
	});

	describe('Integration with binary data operations', () => {
		it('should lazy-load manager when reading binary data with non-configured mode', async () => {
			config.mode = 'filesystem';

			const databaseLoader = jest.fn().mockResolvedValue(mockManager);
			binaryDataService.registerLoader('database', databaseLoader);

			await binaryDataService.init();

			// Access via getAsBuffer (which calls getManager internally)
			const binaryData = { id: 'database:file123', data: '', mimeType: 'text/plain' };
			await binaryDataService.getAsBuffer(binaryData);

			// Database loader should have been called
			expect(databaseLoader).toHaveBeenCalledTimes(1);
			expect(mockManager.getAsBuffer).toHaveBeenCalledWith('file123');
		});

		it('should lazy-load manager when calling getPath', async () => {
			config.mode = 'filesystem';

			const s3Loader = jest.fn().mockResolvedValue(mockManager);
			binaryDataService.registerLoader('s3', s3Loader);

			await binaryDataService.init();

			// Access via getPath
			await binaryDataService.getPath('s3:file456');

			// S3 loader should have been called
			expect(s3Loader).toHaveBeenCalledTimes(1);
			expect(mockManager.getPath).toHaveBeenCalledWith('file456');
		});

		it('should lazy-load manager when calling getAsStream', async () => {
			config.mode = 'filesystem';

			const databaseLoader = jest.fn().mockResolvedValue(mockManager);
			binaryDataService.registerLoader('database', databaseLoader);

			await binaryDataService.init();

			// Access via getAsStream
			await binaryDataService.getAsStream('database:file789');

			// Database loader should have been called
			expect(databaseLoader).toHaveBeenCalledTimes(1);
			expect(mockManager.getAsStream).toHaveBeenCalledWith('file789', undefined);
		});

		it('should lazy-load manager when calling getMetadata', async () => {
			config.mode = 'filesystem';

			const s3Loader = jest.fn().mockResolvedValue(mockManager);
			binaryDataService.registerLoader('s3', s3Loader);

			await binaryDataService.init();

			// Access via getMetadata
			await binaryDataService.getMetadata('s3:metadata123');

			// S3 loader should have been called
			expect(s3Loader).toHaveBeenCalledTimes(1);
			expect(mockManager.getMetadata).toHaveBeenCalledWith('metadata123');
		});
	});
});
