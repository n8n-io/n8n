import { type Logger } from '@n8n/backend-common';
import { ExportService } from '../export.service';
import { type DataSource } from '@n8n/typeorm';
import { mkdir, rm, readdir, appendFile, readFile } from 'fs/promises';
import { mock } from 'jest-mock-extended';
import type { Cipher } from 'n8n-core';

// Mock fs/promises with proper implementations
jest.mock('fs/promises', () => ({
	mkdir: jest.fn(),
	rm: jest.fn(),
	readdir: jest.fn(),
	appendFile: jest.fn(),
	readFile: jest.fn(),
}));

// Mock compression utility
jest.mock('@/utils/compression.util', () => ({
	compressFolder: jest.fn(),
}));

// Mock validateDbTypeForExportEntities
jest.mock('@/utils/validate-database-type', () => ({
	validateDbTypeForExportEntities: jest.fn(),
}));

// Mock @n8n/db
jest.mock('@n8n/db', () => ({
	DataSource: mock<DataSource>(),
}));

describe('ExportService', () => {
	let exportService: ExportService;
	let mockLogger: Logger;
	let mockDataSource: DataSource;
	let mockCipher: Cipher;

	beforeEach(() => {
		jest.clearAllMocks();

		mockLogger = mock<Logger>();
		mockDataSource = mock<DataSource>();
		mockCipher = mock<Cipher>();

		// Set up cipher mock
		mockCipher.encrypt = jest.fn((data: string) => `encrypted:${data}`);

		// Set up the required DataSource properties
		// @ts-expect-error Accessing private property for testing
		mockDataSource.entityMetadatas = [
			{
				name: 'User',
				tableName: 'user',
				columns: [{ databaseName: 'id' }, { databaseName: 'email' }, { databaseName: 'firstName' }],
			},
			{
				name: 'Workflow',
				tableName: 'workflow_entity',
				columns: [{ databaseName: 'id' }, { databaseName: 'name' }, { databaseName: 'active' }],
			},
			{
				name: 'Execution Data',
				tableName: 'execution_data',
				columns: [{ databaseName: 'id' }],
			},
		];
		// @ts-expect-error Accessing private property for testing
		mockDataSource.options = { type: 'sqlite' };
		mockDataSource.driver = {
			escape: jest.fn((identifier: string) => `"${identifier}"`),
		} as any;

		// Add a default implementation for query method to handle existence checks and pagination
		jest.mocked(mockDataSource.query).mockImplementation(async (query: string) => {
			const q = query.toLowerCase();
			if (q.includes('migrations')) {
				throw new Error('Table not found');
			}
			if (q.includes('limit 1')) {
				return [{ 1: 1 }]; // Exists check success
			}
			return []; // Default to empty table
		});

		// Set up proper mock implementations for fs/promises
		jest.mocked(mkdir).mockResolvedValue(undefined);
		jest.mocked(rm).mockResolvedValue(undefined);
		jest.mocked(readdir).mockResolvedValue([]);
		jest.mocked(appendFile).mockResolvedValue(undefined);

		// Mock the compression utility
		const { compressFolder } = require('@/utils/compression.util');
		jest.mocked(compressFolder).mockResolvedValue(undefined);

		exportService = new ExportService(mockLogger, mockDataSource, mockCipher);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('exportEntities', () => {
		it('should export entities successfully', async () => {
			const outputDir = '/test/output';
			const mockEntities = [
				{ id: 1, email: 'test1@example.com', firstName: 'John' },
				{ id: 2, email: 'test2@example.com', firstName: 'Jane' },
			];

			// Mock the migrations table query to fail (table doesn't exist)
			jest
				.mocked(mockDataSource.query)
				.mockImplementationOnce(async (query: string) => {
					if (query.includes('migrations') && query.includes('COUNT')) {
						throw new Error('Table not found');
					}
					return [];
				})
				.mockResolvedValueOnce(mockEntities) // First entity (User)
				.mockResolvedValueOnce([]); // Workflow entities
			jest.mocked(readdir).mockResolvedValue([]);

			await exportService.exportEntities(outputDir);

			expect(mockDataSource.query).toHaveBeenCalled();
			expect(appendFile).toHaveBeenCalled();
			expect(mockLogger.info).toHaveBeenCalledWith('✅ Task completed successfully! \n');
		});

		it('should export entities successfully with a custom encryption key', async () => {
			const outputDir = '/test/output';
			const mockEntities = [
				{ id: 1, email: 'test1@example.com', firstName: 'John' },
				{ id: 2, email: 'test2@example.com', firstName: 'Jane' },
			];

			// Mock the migrations table query to fail (table doesn't exist)
			jest
				.mocked(mockDataSource.query)
				.mockImplementationOnce(async (query: string) => {
					if (query.includes('migrations') && query.includes('COUNT')) {
						throw new Error('Table not found');
					}
					return [];
				})
				.mockResolvedValueOnce(mockEntities) // First entity (User)
				.mockResolvedValueOnce([]); // Workflow entities
			jest.mocked(readdir).mockResolvedValue([]);
			jest.mocked(readFile).mockResolvedValueOnce('custom-encryption-key');

			await exportService.exportEntities(outputDir, undefined, 'custom-encryption-key');

			expect(mockCipher.encrypt).toHaveBeenCalledWith(expect.any(String), 'custom-encryption-key');
			expect(appendFile).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'utf8');
			expect(mockLogger.info).toHaveBeenCalledWith('✅ Task completed successfully! \n');
		});

		it('should handle multiple pages of data', async () => {
			const outputDir = '/test/output';
			const mockEntities = Array.from({ length: 500 }, (_, i) => ({
				id: i + 1,
				email: `test${i + 1}@example.com`,
				firstName: `User${i + 1}`,
			}));

			jest.mocked(mockDataSource.query).mockImplementation(async (query: string) => {
				const q = query.toLowerCase();
				if (q.includes('migrations')) throw new Error('not found');
				if (q.includes('limit 1')) return [{ 1: 1 }];
				if (q.includes('user') && q.includes('offset 0')) return mockEntities;
				return [];
			});

			jest.mocked(readdir).mockResolvedValue([]);

			await exportService.exportEntities(outputDir);

			// Expected calls:
			// 1. migrations check (fails)
			// 2. User exists check
			// 3. User page 0
			// 4. User page 500 (empty)
			// 5. Workflow exists check
			// 6. Workflow page 0 (empty)
			// 7. Execution data exists check
			// 8. Execution data page 0 (empty)
			expect(mockDataSource.query).toHaveBeenCalledTimes(8);
			expect(appendFile).toHaveBeenCalled();
		});

		it('should handle multiple pages of data, excluding execution_data', async () => {
			const outputDir = '/test/output';
			const mockEntities = Array.from({ length: 500 }, (_, i) => ({
				id: i + 1,
				email: `test${i + 1}@example.com`,
				firstName: `User${i + 1}`,
			}));

			jest.mocked(mockDataSource.query).mockImplementation(async (query: string) => {
				const q = query.toLowerCase();
				if (q.includes('migrations')) throw new Error('not found');
				if (q.includes('limit 1')) return [{ 1: 1 }];
				if (q.includes('user') && q.includes('offset 0')) return mockEntities;
				return [];
			});
			jest.mocked(readdir).mockResolvedValue([]);

			await exportService.exportEntities(outputDir, new Set(['execution_data']));

			// 1 migrations + (exists + data + end) for User + (exists + end) for Workflow = 1 + 3 + 2 = 6
			expect(mockDataSource.query).toHaveBeenCalledTimes(6);
			expect(appendFile).toHaveBeenCalled();
		});

		it('should clear existing files before export', async () => {
			const outputDir = '/test/output';
			const existingFiles = ['user.jsonl', 'user.2.jsonl', 'other.txt'];

			jest.mocked(readdir).mockResolvedValue(existingFiles as any);

			jest.mocked(mockDataSource.query).mockImplementation(async (query: string) => {
				const q = query.toLowerCase();
				if (q.includes('migrations')) throw new Error('not found');
				if (q.includes('limit 1')) return [{ 1: 1 }];
				if (q.includes('user') && q.includes('offset 0')) return [{ id: 1 }]; // User has data
				return [];
			});

			await exportService.exportEntities(outputDir);

			// User had data, so rm should have been called
			expect(rm).toHaveBeenCalledWith(expect.stringContaining('user.jsonl'));
			expect(rm).toHaveBeenCalledWith(expect.stringContaining('user.2.jsonl'));
		});

		it('should handle empty tables', async () => {
			const outputDir = '/test/output';

			jest.mocked(mockDataSource.query).mockImplementation(async (query: string) => {
				const q = query.toLowerCase();
				if (q.includes('migrations')) throw new Error('not found');
				if (q.includes('limit 1')) return [{ 1: 1 }];
				return [];
			});
			jest.mocked(readdir).mockResolvedValue([]);

			await exportService.exportEntities(outputDir);

			expect(mockLogger.info).toHaveBeenCalledWith('      No more entities available at offset 0');
		});

		it('should handle missing tables and continue', async () => {
			const outputDir = '/test/output';

			jest.mocked(mockDataSource.query).mockImplementation(async (query: string) => {
				const q = query.toLowerCase();
				if (q.includes('migrations')) throw new Error('not found');
				if (q.includes('user') && q.includes('limit 1')) throw new Error('relation "user" does not exist');
				if (q.includes('limit 1')) return [{ 1: 1 }];
				return [];
			});

			await exportService.exportEntities(outputDir);

			// Should log a warning for the missing table
			expect(mockLogger.warn).toHaveBeenCalledWith(
				expect.stringContaining('Table user (User) not found'),
			);

			// Should still complete successfully
			expect(mockLogger.info).toHaveBeenCalledWith('✅ Task completed successfully! \n');
		});

		it('should fail if a non-table-missing error occurs', async () => {
			const outputDir = '/test/output';

			jest.mocked(mockDataSource.query).mockImplementation(async (query: string) => {
				const q = query.toLowerCase();
				if (q.includes('migrations')) throw new Error('not found');
				if (q.includes('user') && q.includes('limit 1')) return [{ 1: 1 }];
				if (q.includes('user')) throw new Error('Disk full');
				if (q.includes('limit 1')) return [{ 1: 1 }];
				return [];
			});

			await expect(exportService.exportEntities(outputDir)).rejects.toThrow('Disk full');
		});

		it('should skip missing tables like secrets_provider_connection and continue export', async () => {
			const outputDir = '/test/output';

			// Update entity metadata specifically for this test
			// @ts-expect-error Accessing private property for testing
			mockDataSource.entityMetadatas = [
				{
					name: 'User',
					tableName: 'user',
					columns: [{ databaseName: 'id' }],
				},
				{
					name: 'SecretsProviderConnection',
					tableName: 'secrets_provider_connection',
					columns: [{ databaseName: 'id' }],
				},
				{
					name: 'Workflow',
					tableName: 'workflow_entity',
					columns: [{ databaseName: 'id' }],
				},
			];

			jest.mocked(mockDataSource.query).mockImplementation(async (query: string) => {
				const q = query.toLowerCase();
				if (q.includes('migrations')) throw new Error('not found');
				if (q.includes('secrets_provider_connection') && q.includes('limit 1')) {
					throw new Error('relation "secrets_provider_connection" does not exist');
				}
				if (q.includes('limit 1')) return [{ 1: 1 }];
				return [];
			});

			// Should complete without throwing
			await exportService.exportEntities(outputDir);

			// Should warn about secrets_provider_connection
			expect(mockLogger.warn).toHaveBeenCalledWith(
				expect.stringContaining('secrets_provider_connection'),
			);

			// Should still complete
			expect(mockLogger.info).toHaveBeenCalledWith('✅ Task completed successfully! \n');
		});

		it('should handle file system errors gracefully', async () => {
			const outputDir = '/test/output';

			// Mock mkdir to fail
			jest.mocked(mkdir).mockRejectedValueOnce(new Error('Permission denied'));

			await expect(exportService.exportEntities(outputDir)).rejects.toThrow('Permission denied');
		});
	});

	describe('clearExistingEntityFiles', () => {
		it('should clear existing entity files successfully', async () => {
			const outputDir = '/test/output';
			const existingFiles = ['user.jsonl', 'user.2.jsonl', 'workflow.jsonl', 'other.txt'];

			jest.mocked(readdir).mockResolvedValue(existingFiles as any);

			// @ts-expect-error Accessing private method for testing
			await exportService.clearExistingEntityFiles(outputDir, 'user');

			expect(rm).toHaveBeenCalledWith(expect.stringContaining('user.jsonl'));
			expect(rm).toHaveBeenCalledWith(expect.stringContaining('user.2.jsonl'));
			expect(rm).not.toHaveBeenCalledWith(expect.stringContaining('workflow.jsonl'));
			expect(rm).not.toHaveBeenCalledWith(expect.stringContaining('other.txt'));
		});

		it('should handle no existing files gracefully', async () => {
			const outputDir = '/test/output';

			jest.mocked(readdir).mockResolvedValue(['other.txt'] as any);

			// @ts-expect-error Accessing private method for testing
			await exportService.clearExistingEntityFiles(outputDir, 'user');

			expect(rm).not.toHaveBeenCalled();
		});

		it('should handle empty directory gracefully', async () => {
			const outputDir = '/test/output';

			jest.mocked(readdir).mockResolvedValue([]);

			// @ts-expect-error Accessing private method for testing
			await exportService.clearExistingEntityFiles(outputDir, 'user');

			expect(rm).not.toHaveBeenCalled();
		});

		it('should handle file deletion errors gracefully', async () => {
			const outputDir = '/test/output';

			jest.mocked(readdir).mockResolvedValue(['user.jsonl'] as any);
			jest.mocked(rm).mockRejectedValue(new Error('File in use'));

			// @ts-expect-error Accessing private method for testing
			await expect(exportService.clearExistingEntityFiles(outputDir, 'user')).rejects.toThrow(
				'File in use',
			);
		});
	});

	describe('exportMigrationsTable', () => {
		it('should export migrations table when it has data', async () => {
			const outputDir = '/test/output';
			const mockMigrations = [
				{ id: '001', name: 'InitialMigration', timestamp: '1000' },
				{ id: '002', name: 'AddUsersTable', timestamp: '2000' },
			];

			// Mock file system operations
			jest.mocked(readdir).mockResolvedValue([]);
			jest.mocked(mkdir).mockResolvedValue(undefined);
			jest.mocked(appendFile).mockResolvedValue(undefined);

			// Mock database queries to return migrations data
			jest.mocked(mockDataSource.query).mockImplementation(async (query: string) => {
				if (query.includes('migrations') && query.includes('COUNT')) {
					return [{ count: '2' }];
				}
				if (query.includes('migrations') && query.includes('SELECT *')) {
					return mockMigrations;
				}
				return [];
			});

			// Test the exportMigrationsTable method directly
			// @ts-expect-error Accessing private method for testing
			await exportService.exportMigrationsTable(outputDir);

			// Verify migrations file was created
			expect(appendFile).toHaveBeenCalledWith(
				expect.stringContaining('migrations.jsonl'),
				expect.any(String),
				'utf8',
			);

			// Verify logging
			expect(mockLogger.info).toHaveBeenCalledWith(
				'   ✅ Completed export for migrations: 2 entities in 1 file',
			);
		});

		it('should handle missing migrations table gracefully', async () => {
			const outputDir = '/test/output';

			// Mock file system operations
			jest.mocked(readdir).mockResolvedValue([]);
			jest.mocked(mkdir).mockResolvedValue(undefined);

			// Mock database query to fail for migrations table
			jest.mocked(mockDataSource.query).mockImplementation(async (query: string) => {
				if (query.includes('migrations')) {
					throw new Error('Table not found');
				}
				return [];
			});

			// Test the exportMigrationsTable method directly
			// @ts-expect-error Accessing private method for testing
			const result = await exportService.exportMigrationsTable(outputDir);

			// Should return 0 for no tables exported when migrations table is not found
			expect(result).toBe(0);

			// Verify logging indicates table was not found
			expect(mockLogger.info).toHaveBeenCalledWith(
				expect.stringContaining('not found or not accessible, skipping'),
				expect.objectContaining({ error: expect.any(Error) }),
			);
		});
	});
});
