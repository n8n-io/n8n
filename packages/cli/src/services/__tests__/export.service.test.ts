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
	});
});
