import { type Logger } from '@n8n/backend-common';
import { type DataSource } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';
import { mkdir, rm, readdir, appendFile } from 'fs/promises';

import { ExportService } from '../export.service';

// Mock fs/promises
jest.mock('fs/promises');

jest.mock('@n8n/db', () => ({
	DataSource: mock<DataSource>(),
}));

describe('ExportService', () => {
	let exportService: ExportService;
	let mockLogger: Logger;
	let mockDataSource: DataSource = mock<DataSource>();

	beforeEach(() => {
		jest.clearAllMocks();

		mockLogger = mock<Logger>();
		mockDataSource = mock<DataSource>();

		exportService = new ExportService(mockLogger, mockDataSource);
	});

	describe('exportEntities', () => {
		const mockEntityMetadata = {
			tableName: 'users',
			name: 'User',
			columns: [{ databaseName: 'id' }, { databaseName: 'email' }, { databaseName: 'name' }],
		};

		const mockEntityMetadata2 = {
			tableName: 'workflows',
			name: 'Workflow',
			columns: [{ databaseName: 'id' }, { databaseName: 'name' }, { databaseName: 'active' }],
		};

		beforeEach(() => {
			// Mock DataSource entityMetadatas
			// @ts-expect-error Protected property
			mockDataSource.entityMetadatas = [mockEntityMetadata, mockEntityMetadata2];
		});

		it('should export entities successfully', async () => {
			const outputDir = '/test/output';
			const mockEntities = [
				{ id: 1, email: 'user1@test.com', name: 'User 1' },
				{ id: 2, email: 'user2@test.com', name: 'User 2' },
			];

			// Mock file system operations
			(readdir as jest.Mock).mockResolvedValue([]);
			(mkdir as jest.Mock).mockResolvedValue(undefined);
			(appendFile as jest.Mock).mockResolvedValue(undefined);

			// Mock database queries
			jest
				.mocked(mockDataSource.query)
				.mockResolvedValueOnce(mockEntities) // First page
				.mockResolvedValueOnce([]); // No more data

			await exportService.exportEntities(outputDir);

			// Verify directory creation
			expect(mkdir).toHaveBeenCalledWith(outputDir, { recursive: true });

			// Verify database queries
			expect(mockDataSource.query).toHaveBeenCalledWith(
				'SELECT id, email, name FROM users LIMIT 500 OFFSET 0',
			);

			// Verify file writing
			expect(appendFile).toHaveBeenCalledWith(
				'/test/output/user.jsonl',
				'{"id":1,"email":"user1@test.com","name":"User 1"}\n{"id":2,"email":"user2@test.com","name":"User 2"}\n',
				'utf8',
			);
		});

		it('should handle multiple pages of data', async () => {
			const outputDir = '/test/output';
			const page1Entities = Array.from({ length: 500 }, (_, i) => ({
				id: i + 1,
				email: `user${i + 1}@test.com`,
			}));
			const page2Entities = Array.from({ length: 300 }, (_, i) => ({
				id: i + 501,
				email: `user${i + 501}@test.com`,
			}));

			// Mock file system operations
			(readdir as jest.Mock).mockResolvedValue([]);
			(mkdir as jest.Mock).mockResolvedValue(undefined);
			(appendFile as jest.Mock).mockResolvedValue(undefined);

			// Mock database queries - multiple pages
			jest
				.mocked(mockDataSource.query)
				.mockResolvedValueOnce(page1Entities) // First page
				.mockResolvedValueOnce(page2Entities) // Second page
				.mockResolvedValueOnce([]); // No more data

			await exportService.exportEntities(outputDir);

			// Verify multiple database queries
			expect(mockDataSource.query).toHaveBeenCalledWith(
				'SELECT id, email, name FROM users LIMIT 500 OFFSET 0',
			);
			expect(mockDataSource.query).toHaveBeenCalledWith(
				'SELECT id, email, name FROM users LIMIT 500 OFFSET 500',
			);

			// Verify multiple file writes
			expect(appendFile).toHaveBeenCalledTimes(2);
		});

		it('should clear existing files before export', async () => {
			const outputDir = '/test/output';
			const existingFiles = ['user.jsonl', 'user.1.jsonl', 'other.txt'];

			// Mock file system operations
			(readdir as jest.Mock).mockResolvedValue(existingFiles);
			(rm as jest.Mock).mockResolvedValue(undefined);
			(mkdir as jest.Mock).mockResolvedValue(undefined);
			(appendFile as jest.Mock).mockResolvedValue(undefined);

			// Mock database queries
			jest.mocked(mockDataSource.query).mockResolvedValue([]);

			await exportService.exportEntities(outputDir);

			// Verify existing files are deleted
			expect(rm).toHaveBeenCalledWith('/test/output/user.jsonl');
			expect(rm).toHaveBeenCalledWith('/test/output/user.1.jsonl');
			expect(rm).not.toHaveBeenCalledWith('/test/output/other.txt');

			// Verify logging
			expect(mockLogger.info).toHaveBeenCalledWith(
				'   🗑️  Found 2 existing file(s) for user, deleting...',
			);
		});

		it('should handle file splitting at 10,000 entities', async () => {
			const outputDir = '/test/output';
			const largePage = Array.from({ length: 500 }, (_, i) => ({
				id: i + 1,
				email: `user${i + 1}@test.com`,
			}));

			// Mock file system operations
			(readdir as jest.Mock).mockResolvedValue([]);
			(mkdir as jest.Mock).mockResolvedValue(undefined);
			(appendFile as jest.Mock).mockResolvedValue(undefined);

			// Mock database queries - simulate 20 pages of 500 entities each (10,000 total)
			for (let i = 0; i < 20; i++) {
				jest.mocked(mockDataSource.query).mockResolvedValueOnce(largePage);
			}
			jest.mocked(mockDataSource.query).mockResolvedValue([]); // Final empty result

			await exportService.exportEntities(outputDir);

			// Verify all entities go to the first file (user.jsonl)
			expect(appendFile).toHaveBeenCalledTimes(20);
			expect(appendFile).toHaveBeenCalledWith(
				'/test/output/user.jsonl',
				expect.any(String),
				'utf8',
			);
		});

		it('should handle empty tables', async () => {
			const outputDir = '/test/output';

			// Mock file system operations
			(readdir as jest.Mock).mockResolvedValue([]);
			(mkdir as jest.Mock).mockResolvedValue(undefined);

			// Mock database queries - empty result
			jest.mocked(mockDataSource.query).mockResolvedValue([]);

			await exportService.exportEntities(outputDir);

			// Verify no file writing for empty tables
			expect(appendFile).not.toHaveBeenCalled();
		});

		it('should handle multiple entity types', async () => {
			const outputDir = '/test/output';
			const userEntities = [{ id: 1, email: 'user@test.com' }];
			const workflowEntities = [{ id: 1, name: 'Test Workflow' }];

			// Mock file system operations
			(readdir as jest.Mock).mockResolvedValue([]);
			(mkdir as jest.Mock).mockResolvedValue(undefined);
			(appendFile as jest.Mock).mockResolvedValue(undefined);

			// Mock database queries for both entity types
			jest
				.mocked(mockDataSource.query)
				.mockResolvedValueOnce(userEntities) // Users first page
				.mockResolvedValueOnce(workflowEntities); // Workflows first page

			await exportService.exportEntities(outputDir);

			// Verify both entity types are processed
			expect(jest.mocked(appendFile).mock.calls[0]).toEqual([
				'/test/output/user.jsonl',
				'{"id":1,"email":"user@test.com"}\n',
				'utf8',
			]);

			expect(jest.mocked(appendFile).mock.calls[1]).toEqual([
				'/test/output/workflow.jsonl',
				'{"id":1,"name":"Test Workflow"}\n',
				'utf8',
			]);
		});

		it('should log export summary', async () => {
			const outputDir = '/test/output';
			const mockEntities = [{ id: 1, email: 'user@test.com' }];

			// Mock file system operations
			(readdir as jest.Mock).mockResolvedValue([]);
			(mkdir as jest.Mock).mockResolvedValue(undefined);
			(appendFile as jest.Mock).mockResolvedValue(undefined);

			// Mock database queries
			jest
				.mocked(mockDataSource.query)
				.mockResolvedValueOnce(mockEntities) // First entity type
				.mockResolvedValueOnce([]) // No more data for first type
				.mockResolvedValueOnce([]); // Second entity type is empty

			await exportService.exportEntities(outputDir);

			// Verify summary logging
			expect(mockLogger.info).toHaveBeenCalledWith('\n📊 Export Summary:');
			expect(mockLogger.info).toHaveBeenCalledWith('   Tables processed: 2');
			expect(mockLogger.info).toHaveBeenCalledWith('   Total entities exported: 1');
			expect(mockLogger.info).toHaveBeenCalledWith('   Output directory: /test/output');
			expect(mockLogger.info).toHaveBeenCalledWith('✅ Task completed successfully! \n');
		});
	});
});
