import { type Logger } from '@n8n/backend-common';
import { ExportService } from '../export.service';
import { type DataSource } from '@n8n/typeorm';
import { mkdir, rm, readdir, appendFile } from 'fs/promises';
import { mock } from 'jest-mock-extended';

// Mock fs/promises
jest.mock('fs/promises');

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

	beforeEach(() => {
		jest.clearAllMocks();

		mockLogger = mock<Logger>();
		mockDataSource = mock<DataSource>();

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
		];
		// @ts-expect-error Accessing private property for testing
		mockDataSource.options = { type: 'sqlite' };
		mockDataSource.driver = {
			escape: jest.fn((identifier: string) => `"${identifier}"`),
		} as any;

		exportService = new ExportService(mockLogger, mockDataSource);
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

			// Mock the service methods properly
			jest
				.mocked(mockDataSource.query)
				.mockResolvedValueOnce(mockEntities) // First entity (User)
				.mockResolvedValueOnce([]) // User empty
				.mockResolvedValueOnce(mockEntities) // Second entity (Workflow)
				.mockResolvedValueOnce([]); // Workflow empty
			jest.mocked(readdir).mockResolvedValue([]);

			await exportService.exportEntities(outputDir);

			expect(mockDataSource.query).toHaveBeenCalled();
			expect(appendFile).toHaveBeenCalled();
			expect(mockLogger.info).toHaveBeenCalledWith('✅ Task completed successfully! \n');
		});

		it('should handle multiple pages of data', async () => {
			const outputDir = '/test/output';
			const mockEntities = Array.from({ length: 500 }, (_, i) => ({
				id: i + 1,
				email: `test${i + 1}@example.com`,
				firstName: `User${i + 1}`,
			}));

			jest
				.mocked(mockDataSource.query)
				.mockResolvedValueOnce(mockEntities) // First page
				.mockResolvedValueOnce([]) // User empty
				.mockResolvedValueOnce(mockEntities) // Workflow first page
				.mockResolvedValueOnce([]); // Workflow empty
			jest.mocked(readdir).mockResolvedValue([]);

			await exportService.exportEntities(outputDir);

			expect(mockDataSource.query).toHaveBeenCalledTimes(4);
			expect(appendFile).toHaveBeenCalled();
		});

		it('should clear existing files before export', async () => {
			const outputDir = '/test/output';
			const existingFiles = ['user.jsonl', 'user.2.jsonl', 'other.txt'];

			jest
				.mocked(readdir)
				.mockResolvedValueOnce(existingFiles as any) // For clearExistingEntityFiles
				.mockResolvedValueOnce([]); // For subsequent calls
			jest.mocked(mockDataSource.query).mockResolvedValue([]);

			await exportService.exportEntities(outputDir);

			expect(rm).toHaveBeenCalledWith('/test/output/user.jsonl');
			expect(rm).toHaveBeenCalledWith('/test/output/user.2.jsonl');
			expect(rm).not.toHaveBeenCalledWith('/test/output/other.txt');
		});

		it('should handle file splitting at 500 entities', async () => {
			const outputDir = '/test/output';
			const mockEntities = Array.from({ length: 500 }, (_, i) => ({
				id: i + 1,
				email: `test${i + 1}@example.com`,
				firstName: `User${i + 1}`,
			}));

			jest
				.mocked(mockDataSource.query)
				.mockResolvedValueOnce(mockEntities) // First page
				.mockResolvedValueOnce(mockEntities) // Second page
				.mockResolvedValueOnce([]) // User empty
				.mockResolvedValueOnce([]); // Workflow empty
			jest.mocked(readdir).mockResolvedValue([]);

			await exportService.exportEntities(outputDir);

			expect(appendFile).toHaveBeenCalledWith(
				'/test/output/user.jsonl',
				expect.stringContaining('"id":1'),
				'utf8',
			);
			expect(appendFile).toHaveBeenCalledWith(
				'/test/output/user.2.jsonl',
				expect.stringContaining('"id":1'),
				'utf8',
			);
		});

		it('should handle empty tables', async () => {
			const outputDir = '/test/output';

			jest
				.mocked(mockDataSource.query)
				.mockResolvedValueOnce([]) // User empty
				.mockResolvedValueOnce([]); // Workflow empty
			jest.mocked(readdir).mockResolvedValue([]);

			await exportService.exportEntities(outputDir);

			expect(mockLogger.info).toHaveBeenCalledWith('      No more entities available at offset 0');
			expect(appendFile).not.toHaveBeenCalled();
		});

		it('should handle multiple entity types', async () => {
			const outputDir = '/test/output';
			const userEntities = [{ id: 1, email: 'test@example.com' }];
			const workflowEntities = [{ id: 1, name: 'Test Workflow' }];

			// The service processes entities in order: User first, then Workflow
			// Since each query returns fewer entities than the page size (500),
			// the service knows there's no more data and stops after 1 query per entity
			jest
				.mocked(mockDataSource.query)
				.mockResolvedValueOnce(userEntities) // User entities (1 < 500, so no more queries needed)
				.mockResolvedValueOnce(workflowEntities); // Workflow entities (1 < 500, so no more queries needed)
			jest.mocked(readdir).mockResolvedValue([]);

			await exportService.exportEntities(outputDir);

			// Should make 2 total queries (1 per entity, since each returns < pageSize)
			expect(mockDataSource.query).toHaveBeenCalledTimes(2);
			expect(appendFile).toHaveBeenCalledWith(
				'/test/output/user.jsonl',
				expect.any(String),
				'utf8',
			);
			expect(appendFile).toHaveBeenCalledWith(
				'/test/output/workflow.jsonl',
				expect.any(String),
				'utf8',
			);
		});

		it('should log export summary', async () => {
			const outputDir = '/test/output';

			jest
				.mocked(mockDataSource.query)
				.mockResolvedValueOnce([]) // User empty
				.mockResolvedValueOnce([]); // Workflow empty
			jest.mocked(readdir).mockResolvedValue([]);

			await exportService.exportEntities(outputDir);

			expect(mockLogger.info).toHaveBeenCalledWith('\n📊 Export Summary:');
			expect(mockLogger.info).toHaveBeenCalledWith('   Tables processed: 2');
			expect(mockLogger.info).toHaveBeenCalledWith('   Total entities exported: 0');
		});

		it('should handle database errors gracefully', async () => {
			const outputDir = '/test/output';

			jest.mocked(mockDataSource.query).mockRejectedValue(new Error('Database connection failed'));
			jest.mocked(readdir).mockResolvedValue([]);

			// The service will throw the error since it's not caught
			await expect(exportService.exportEntities(outputDir)).rejects.toThrow(
				'Database connection failed',
			);
		});

		it('should handle file system errors gracefully', async () => {
			const outputDir = '/test/output';

			jest.mocked(mkdir).mockRejectedValue(new Error('Permission denied'));

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

		it('should handle file splitting at 500 entities correctly', async () => {
			const outputDir = '/test/output';
			const largePage = Array.from({ length: 500 }, (_, i) => ({
				id: i + 1,
				email: `user${i + 1}@test.com`,
			}));

			// Mock file system operations
			jest.mocked(readdir).mockResolvedValue([]);
			jest.mocked(mkdir).mockResolvedValue(undefined);
			jest.mocked(appendFile).mockResolvedValue(undefined);

			// Mock database queries - return 3 pages of 500 entities each
			jest
				.mocked(mockDataSource.query)
				.mockResolvedValueOnce(largePage) // First page of User entities
				.mockResolvedValueOnce(largePage) // Second page of User entities
				.mockResolvedValueOnce(largePage) // Third page of User entities
				.mockResolvedValueOnce([]) // User empty (end of User data)
				.mockResolvedValueOnce([]); // Workflow empty

			await exportService.exportEntities(outputDir);

			// Verify file splitting logic - should create 3 files for User entity
			expect(appendFile).toHaveBeenCalledTimes(3);

			// First call should go to user.jsonl (500 entities)
			expect(appendFile).toHaveBeenNthCalledWith(
				1,
				'/test/output/user.jsonl',
				expect.any(String),
				'utf8',
			);

			// Second call should go to user.2.jsonl (500 entities)
			expect(appendFile).toHaveBeenNthCalledWith(
				2,
				'/test/output/user.2.jsonl',
				expect.any(String),
				'utf8',
			);

			// Third call should go to user.3.jsonl (500 entities)
			expect(appendFile).toHaveBeenNthCalledWith(
				3,
				'/test/output/user.3.jsonl',
				expect.any(String),
				'utf8',
			);
		});

		it('should handle database errors gracefully', async () => {
			const outputDir = '/test/output';

			// Mock file system operations
			(readdir as jest.Mock).mockResolvedValue([]);
			(mkdir as jest.Mock).mockResolvedValue(undefined);

			// Mock database query to throw an error
			jest.mocked(mockDataSource.query).mockRejectedValue(new Error('Database connection failed'));

			await expect(exportService.exportEntities(outputDir)).rejects.toThrow(
				'Database connection failed',
			);
		});

		it('should handle file system errors gracefully', async () => {
			const outputDir = '/test/output';

			// Mock file system operations to throw an error
			(mkdir as jest.Mock).mockRejectedValue(new Error('Permission denied'));

			await expect(exportService.exportEntities(outputDir)).rejects.toThrow('Permission denied');
		});

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
				// For regular entity queries, return empty array
				return [];
			});

			// Test the exportMigrationsTable method directly since it's not called in exportEntities
			// @ts-expect-error Accessing private method for testing
			await exportService.exportMigrationsTable(outputDir);

			// Verify migrations file was created
			expect(appendFile).toHaveBeenCalledWith(
				'/test/output/migrations.jsonl',
				JSON.stringify(mockMigrations[0]) + '\n' + JSON.stringify(mockMigrations[1]) + '\n',
				'utf8',
			);

			// Verify logging
			expect(mockLogger.info).toHaveBeenCalledWith(
				'   ✅ Completed export for migrations: 2 entities in 1 file',
			);
		});
	});

	describe('clearExistingEntityFiles', () => {
		it('should clear existing entity files successfully', async () => {
			const outputDir = '/test/output';
			const entityName = 'user';
			const existingFiles = [
				'user.jsonl',
				'user.1.jsonl',
				'user.2.jsonl',
				'other.txt',
				'workflow.jsonl',
			];

			// Mock file system operations
			(readdir as jest.Mock).mockResolvedValue(existingFiles);
			(rm as jest.Mock).mockResolvedValue(undefined);

			// Access private method for testing
			// @ts-expect-error Accessing private method for testing
			await exportService.clearExistingEntityFiles(outputDir, entityName);

			// Verify only entity files are deleted
			expect(rm).toHaveBeenCalledWith('/test/output/user.jsonl');
			expect(rm).toHaveBeenCalledWith('/test/output/user.1.jsonl');
			expect(rm).toHaveBeenCalledWith('/test/output/user.2.jsonl');
			expect(rm).not.toHaveBeenCalledWith('/test/output/other.txt');
			expect(rm).not.toHaveBeenCalledWith('/test/output/workflow.jsonl');

			// Verify logging
			expect(mockLogger.info).toHaveBeenCalledWith(
				'   🗑️  Found 3 existing file(s) for user, deleting...',
			);
			expect(mockLogger.info).toHaveBeenCalledWith('      Deleted: user.jsonl');
			expect(mockLogger.info).toHaveBeenCalledWith('      Deleted: user.1.jsonl');
			expect(mockLogger.info).toHaveBeenCalledWith('      Deleted: user.2.jsonl');
		});

		it('should handle no existing files gracefully', async () => {
			const outputDir = '/test/output';
			const entityName = 'user';
			const existingFiles = ['other.txt', 'workflow.jsonl'];

			// Mock file system operations
			(readdir as jest.Mock).mockResolvedValue(existingFiles);

			// Access private method for testing
			// @ts-expect-error Accessing private method for testing
			await exportService.clearExistingEntityFiles(outputDir, entityName);

			// Verify no files are deleted
			expect(rm).not.toHaveBeenCalled();

			// Verify no logging for deletion
			expect(mockLogger.info).not.toHaveBeenCalledWith(expect.stringContaining('Found'));
		});

		it('should handle empty directory gracefully', async () => {
			const outputDir = '/test/output';
			const entityName = 'user';
			const existingFiles: string[] = [];

			// Mock file system operations
			(readdir as jest.Mock).mockResolvedValue(existingFiles);

			// Access private method for testing
			// @ts-expect-error Accessing private method for testing
			await exportService.clearExistingEntityFiles(outputDir, entityName);

			// Verify no files are deleted
			expect(rm).not.toHaveBeenCalled();

			// Verify no logging for deletion
			expect(mockLogger.info).not.toHaveBeenCalledWith(expect.stringContaining('Found'));
		});

		it('should handle file deletion errors gracefully', async () => {
			const outputDir = '/test/output';
			const entityName = 'user';
			const existingFiles = ['user.jsonl', 'user.1.jsonl'];

			// Mock file system operations
			(readdir as jest.Mock).mockResolvedValue(existingFiles);
			(rm as jest.Mock).mockRejectedValue(new Error('File in use'));

			// Access private method for testing
			// @ts-expect-error Accessing private method for testing
			await expect(exportService.clearExistingEntityFiles(outputDir, entityName)).rejects.toThrow(
				'File in use',
			);
		});
	});
});
