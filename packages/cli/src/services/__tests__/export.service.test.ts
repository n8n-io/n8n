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

		// Default: all queries return empty results (tables exist but are empty)
		jest.mocked(mockDataSource.query).mockResolvedValue([]);

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

			// Return mockEntities for the User data query; default [] for everything else
			jest.mocked(mockDataSource.query).mockImplementation(async (query: string) => {
				if (query.includes('"user"') && query.includes('LIMIT 500')) return mockEntities;
				return [];
			});

			await exportService.exportEntities(outputDir);

			expect(appendFile).toHaveBeenCalled();
			expect(mockLogger.info).toHaveBeenCalledWith('✅ Task completed successfully! \n');
		});

		it('should export entities successfully with a custom encryption key', async () => {
			const outputDir = '/test/output';
			const mockEntities = [
				{ id: 1, email: 'test1@example.com', firstName: 'John' },
				{ id: 2, email: 'test2@example.com', firstName: 'Jane' },
			];

			jest.mocked(mockDataSource.query).mockImplementation(async (query: string) => {
				if (query.includes('"user"') && query.includes('LIMIT 500')) return mockEntities;
				return [];
			});
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

			let userDataCallCount = 0;
			jest.mocked(mockDataSource.query).mockImplementation(async (query: string) => {
				if (query.includes('"user"') && query.includes('LIMIT 500')) {
					return userDataCallCount++ === 0 ? mockEntities : [];
				}
				return [];
			});

			await exportService.exportEntities(outputDir);

			// migrations (existence + data) + 3 entities × (existence + data) + 1 extra User page = 9
			expect(mockDataSource.query).toHaveBeenCalledTimes(9);
			expect(appendFile).toHaveBeenCalled();
		});

		it('should handle multiple pages of data, excluding execution_data', async () => {
			const outputDir = '/test/output';
			const mockEntities = Array.from({ length: 500 }, (_, i) => ({
				id: i + 1,
				email: `test${i + 1}@example.com`,
				firstName: `User${i + 1}`,
			}));

			let userDataCallCount = 0;
			jest.mocked(mockDataSource.query).mockImplementation(async (query: string) => {
				if (query.includes('"user"') && query.includes('LIMIT 500')) {
					return userDataCallCount++ === 0 ? mockEntities : [];
				}
				return [];
			});

			await exportService.exportEntities(outputDir, new Set(['execution_data']));

			// migrations (existence + data) + 2 entities × (existence + data) + 1 extra User page = 7
			expect(mockDataSource.query).toHaveBeenCalledTimes(7);
			expect(appendFile).toHaveBeenCalled();
		});

		it('should clear existing files before export', async () => {
			const outputDir = '/test/output';
			const existingFiles = ['user.jsonl', 'user.2.jsonl', 'other.txt'];

			// readdir sequence: migrations, user, workflow, execution_data, final cleanup
			jest
				.mocked(readdir)
				.mockResolvedValueOnce([])
				.mockResolvedValueOnce(existingFiles as any)
				.mockResolvedValueOnce([])
				.mockResolvedValueOnce([]);

			await exportService.exportEntities(outputDir);

			// Existing user.jsonl and user.2.jsonl are deleted before re-export
			expect(rm).toHaveBeenCalledWith('/test/output/user.jsonl');
			expect(rm).toHaveBeenCalledWith('/test/output/user.2.jsonl');
			expect(rm).not.toHaveBeenCalledWith('/test/output/other.txt');
			expect(mockLogger.info).toHaveBeenCalledWith('✅ Task completed successfully! \n');
		});

		it('should handle empty tables', async () => {
			const outputDir = '/test/output';
			// Default mock returns [] for all queries — all tables exist but are empty

			await exportService.exportEntities(outputDir);

			expect(mockLogger.info).toHaveBeenCalledWith('      No more entities available at offset 0');
			// migrations.jsonl is written even when the migrations table is empty
			expect(appendFile).toHaveBeenCalledWith(
				'/test/output/migrations.jsonl',
				expect.any(String),
				'utf8',
			);
		});

		it('should handle database errors gracefully', async () => {
			const outputDir = '/test/output';

			// All queries fail — the existence checks catch the errors and skip each table
			jest.mocked(mockDataSource.query).mockRejectedValue(new Error('Database connection failed'));

			await exportService.exportEntities(outputDir);

			expect(mockLogger.info).toHaveBeenCalledWith('✅ Task completed successfully! \n');
			// No data is written when all tables are skipped
			expect(appendFile).not.toHaveBeenCalled();
		});

		it('should handle file system errors gracefully', async () => {
			const outputDir = '/test/output';

			jest.mocked(mkdir).mockRejectedValue(new Error('Permission denied'));

			await expect(exportService.exportEntities(outputDir)).rejects.toThrow('Permission denied');
		});

		it('should skip non-existent tables', async () => {
			const outputDir = '/test/output';

			// Mock queries: migrations fails, User table fails (not found), Workflow table succeeds (empty)
			jest
				.mocked(mockDataSource.query)
				.mockImplementationOnce(async (query: string) => {
					if (query.includes('migrations')) throw new Error('Table not found');
					return [];
				})
				.mockRejectedValueOnce(new Error('relation "user" does not exist')) // User table fails
				.mockResolvedValueOnce([]); // Workflow table succeeds

			await exportService.exportEntities(outputDir);

			expect(mockLogger.info).toHaveBeenCalledWith(
				expect.stringContaining('Skipping table: user (User) as it does not exist'),
			);
			expect(mockLogger.info).toHaveBeenCalledWith(
				expect.stringContaining('Completed export for workflow_entity'),
			);
		});
	});

	describe('clearExistingEntityFiles', () => {
		it('should clear existing entity files successfully', async () => {
			const outputDir = '/test/output';
			const existingFiles = ['user.jsonl', 'user.2.jsonl', 'workflow.jsonl', 'other.txt'];

			jest.mocked(readdir).mockResolvedValue(existingFiles as any);

			// @ts-expect-error Accessing private method for testing
			await exportService.clearExistingEntityFiles(outputDir, 'user');

			expect(rm).toHaveBeenCalledWith('/test/output/user.jsonl');
			expect(rm).toHaveBeenCalledWith('/test/output/user.2.jsonl');
			expect(rm).not.toHaveBeenCalledWith('/test/output/workflow.jsonl');
			expect(rm).not.toHaveBeenCalledWith('/test/output/other.txt');
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

			// Existence check (SELECT id ... LIMIT 1) returns [] (success); data query returns mockMigrations
			jest.mocked(mockDataSource.query).mockImplementation(async (query: string) => {
				if (query.includes('SELECT *') && query.includes('migrations')) return mockMigrations;
				return [];
			});

			// @ts-expect-error Accessing private method for testing
			await exportService.exportMigrationsTable(outputDir);

			expect(appendFile).toHaveBeenCalledWith(
				'/test/output/migrations.jsonl',
				expect.any(String),
				'utf8',
			);
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
