import { type Logger } from '@n8n/backend-common';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { type DataSource, type EntityManager } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';
import { readdir, readFile } from 'fs/promises';

import { ImportService } from '../import.service';
import type { CredentialsRepository, TagRepository } from '@n8n/db';

// Mock fs/promises
jest.mock('fs/promises');

// Mock @n8n/db
jest.mock('@n8n/db', () => ({
	CredentialsRepository: mock<CredentialsRepository>(),
	TagRepository: mock<TagRepository>(),
	DataSource: mock<DataSource>(),
}));

describe('ImportService', () => {
	let importService: ImportService;
	let mockLogger: Logger;
	let mockDataSource: DataSource;
	let mockCredentialsRepository: CredentialsRepository;
	let mockTagRepository: TagRepository;
	let mockEntityManager: EntityManager;

	beforeEach(() => {
		jest.clearAllMocks();

		mockLogger = mock<Logger>();
		mockDataSource = mock<DataSource>();
		mockCredentialsRepository = mock<CredentialsRepository>();
		mockTagRepository = mock<TagRepository>();
		mockEntityManager = mock<EntityManager>();

		// Mock transaction method
		mockDataSource.transaction = jest.fn().mockImplementation(async (callback) => {
			return await callback(mockEntityManager);
		});

		importService = new ImportService(
			mockLogger,
			mockCredentialsRepository,
			mockTagRepository,
			mockDataSource,
		);
	});

	describe('isTableEmpty', () => {
		it('should return true for empty table', async () => {
			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				from: jest.fn().mockReturnThis(),
				limit: jest.fn().mockReturnThis(),
				getRawMany: jest.fn().mockResolvedValue([]),
			};

			mockDataSource.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

			const result = await importService.isTableEmpty('users');

			expect(result).toBe(true);
			expect(mockQueryBuilder.select).toHaveBeenCalledWith('1');
			expect(mockQueryBuilder.from).toHaveBeenCalledWith('users', 'users');
			expect(mockQueryBuilder.limit).toHaveBeenCalledWith(1);
			expect(mockLogger.debug).toHaveBeenCalledWith('Table users has 0 rows');
		});

		it('should return false for non-empty table', async () => {
			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				from: jest.fn().mockReturnThis(),
				limit: jest.fn().mockReturnThis(),
				getRawMany: jest.fn().mockResolvedValue([{ id: 1 }]),
			};

			mockDataSource.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

			const result = await importService.isTableEmpty('users');

			expect(result).toBe(false);
			expect(mockQueryBuilder.select).toHaveBeenCalledWith('1');
			expect(mockQueryBuilder.from).toHaveBeenCalledWith('users', 'users');
			expect(mockQueryBuilder.limit).toHaveBeenCalledWith(1);
			expect(mockLogger.debug).toHaveBeenCalledWith('Table users has 1 rows');
		});

		it('should handle database errors gracefully', async () => {
			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				from: jest.fn().mockReturnThis(),
				limit: jest.fn().mockReturnThis(),
				getRawMany: jest.fn().mockRejectedValue(new Error('Database connection failed')),
			};

			mockDataSource.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

			await expect(importService.isTableEmpty('users')).rejects.toThrow(
				'Unable to check table users',
			);

			expect(mockLogger.error).toHaveBeenCalledWith('Failed to check if table users is empty:', {
				error: new Error('Database connection failed'),
			});
		});
	});

	describe('areAllEntityTablesEmpty', () => {
		it('should return true when all tables are empty', async () => {
			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				from: jest.fn().mockReturnThis(),
				limit: jest.fn().mockReturnThis(),
				getRawMany: jest.fn().mockResolvedValue([]),
			};

			mockDataSource.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

			const result = await importService.areAllEntityTablesEmpty(['users', 'workflows']);

			expect(result).toBe(true);
			expect(mockLogger.info).toHaveBeenCalledWith('Checking if 2 tables are empty...');
			expect(mockLogger.info).toHaveBeenCalledWith('✅ All tables are empty');
		});

		it('should return false when any table has data', async () => {
			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				from: jest.fn().mockReturnThis(),
				limit: jest.fn().mockReturnThis(),
				getRawMany: jest
					.fn()
					.mockResolvedValueOnce([]) // users table is empty
					.mockResolvedValueOnce([{ id: 1 }]), // workflows table has data
			};

			mockDataSource.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

			const result = await importService.areAllEntityTablesEmpty(['users', 'workflows']);

			expect(result).toBe(false);
			expect(mockLogger.info).toHaveBeenCalledWith(
				'📊 Found 1 table(s) with existing data: workflows',
			);
		});

		it('should return true for empty table names array', async () => {
			const result = await importService.areAllEntityTablesEmpty([]);

			expect(result).toBe(true);
			expect(mockLogger.info).toHaveBeenCalledWith(
				'No table names provided, considering all tables empty',
			);
		});

		it('should handle multiple non-empty tables', async () => {
			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				from: jest.fn().mockReturnThis(),
				limit: jest.fn().mockReturnThis(),
				getRawMany: jest
					.fn()
					.mockResolvedValueOnce([{ id: 1 }, { id: 2 }, { id: 3 }]) // users table has data
					.mockResolvedValueOnce([
						{ id: 1 },
						{ id: 2 },
						{ id: 3 },
						{ id: 4 },
						{ id: 5 },
						{ id: 6 },
						{ id: 7 },
					]), // workflows table has data
			};

			mockDataSource.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

			const result = await importService.areAllEntityTablesEmpty(['users', 'workflows']);

			expect(result).toBe(false);
			expect(mockLogger.info).toHaveBeenCalledWith(
				'📊 Found 2 table(s) with existing data: users, workflows',
			);
		});
	});

	describe('truncateEntityTable', () => {
		it('should truncate SQLite table successfully', async () => {
			const mockQueryBuilder = {
				delete: jest.fn().mockReturnThis(),
				from: jest.fn().mockReturnThis(),
				execute: jest.fn().mockResolvedValue({ affected: 5 }),
			};

			mockEntityManager.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

			// @ts-expect-error Protected property
			mockDataSource.options = { type: 'sqlite' };

			await importService.truncateEntityTable('users', mockEntityManager);

			expect(mockQueryBuilder.delete).toHaveBeenCalled();
			expect(mockQueryBuilder.from).toHaveBeenCalledWith('users', 'users');
			expect(mockQueryBuilder.execute).toHaveBeenCalled();
			expect(mockLogger.info).toHaveBeenCalledWith('🗑️  Truncating table: users');
			expect(mockLogger.info).toHaveBeenCalledWith('   ✅ Table users truncated successfully');
		});

		it('should truncate PostgreSQL table successfully', async () => {
			const mockQueryBuilder = {
				delete: jest.fn().mockReturnThis(),
				from: jest.fn().mockReturnThis(),
				execute: jest.fn().mockResolvedValue({ affected: 3 }),
			};

			mockEntityManager.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);
			// @ts-expect-error Protected property
			mockDataSource.options = { type: 'postgres' };

			await importService.truncateEntityTable('workflows', mockEntityManager);

			expect(mockQueryBuilder.delete).toHaveBeenCalled();
			expect(mockQueryBuilder.from).toHaveBeenCalledWith('workflows', 'workflows');
			expect(mockQueryBuilder.execute).toHaveBeenCalled();
			expect(mockLogger.info).toHaveBeenCalledWith('🗑️  Truncating table: workflows');
			expect(mockLogger.info).toHaveBeenCalledWith('   ✅ Table workflows truncated successfully');
		});

		it('should handle database errors gracefully', async () => {
			const mockQueryBuilder = {
				delete: jest.fn().mockReturnThis(),
				from: jest.fn().mockReturnThis(),
				execute: jest.fn().mockRejectedValue(new Error('Database connection failed')),
			};

			mockEntityManager.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

			await expect(importService.truncateEntityTable('users', mockEntityManager)).rejects.toThrow(
				'Database connection failed',
			);
		});
	});

	describe('getImportMetadata', () => {
		it('should return complete import metadata for valid entity files', async () => {
			const mockFiles = ['user.jsonl', 'workflow.jsonl', 'settings.jsonl', 'other.txt'];
			const mockEntityMetadatas = [
				{ name: 'User', tableName: 'user' },
				{ name: 'Workflow', tableName: 'workflow' },
				{ name: 'Settings', tableName: 'settings' },
			];

			(readdir as jest.Mock).mockResolvedValue(mockFiles);
			// @ts-expect-error Protected property
			mockDataSource.entityMetadatas = mockEntityMetadatas;

			const result = await importService.getImportMetadata('/test/input');

			expect(result).toEqual({
				tableNames: ['user', 'workflow', 'settings'],
				entityFiles: {
					user: ['/test/input/user.jsonl'],
					workflow: ['/test/input/workflow.jsonl'],
					settings: ['/test/input/settings.jsonl'],
				},
			});
			expect(readdir).toHaveBeenCalledWith('/test/input');
		});

		it('should handle numbered entity files', async () => {
			const mockFiles = ['user.jsonl', 'user.2.jsonl', 'user.3.jsonl', 'workflow.jsonl'];
			const mockEntityMetadatas = [
				{ name: 'User', tableName: 'user' },
				{ name: 'Workflow', tableName: 'workflow' },
			];

			(readdir as jest.Mock).mockResolvedValue(mockFiles);
			// @ts-expect-error Protected property
			mockDataSource.entityMetadatas = mockEntityMetadatas;

			const result = await importService.getImportMetadata('/test/input');

			expect(result).toEqual({
				tableNames: ['user', 'workflow'],
				entityFiles: {
					user: ['/test/input/user.jsonl', '/test/input/user.2.jsonl', '/test/input/user.3.jsonl'],
					workflow: ['/test/input/workflow.jsonl'],
				},
			});
		});

		it('should skip entities without metadata', async () => {
			const mockFiles = ['user.jsonl', 'unknown.jsonl'];
			const mockEntityMetadatas = [{ name: 'User', tableName: 'user' }];

			(readdir as jest.Mock).mockResolvedValue(mockFiles);
			// @ts-expect-error Protected property
			mockDataSource.entityMetadatas = mockEntityMetadatas;

			const result = await importService.getImportMetadata('/test/input');

			expect(result).toEqual({
				tableNames: ['user'],
				entityFiles: {
					user: ['/test/input/user.jsonl'],
				},
			});
			expect(mockLogger.warn).toHaveBeenCalledWith(
				'⚠️  No entity metadata found for unknown, skipping...',
			);
		});

		it('should handle empty directory', async () => {
			(readdir as jest.Mock).mockResolvedValue([]);
			// @ts-expect-error Protected property
			mockDataSource.entityMetadatas = [];

			const result = await importService.getImportMetadata('/test/input');

			expect(result).toEqual({
				tableNames: [],
				entityFiles: {},
			});
		});

		it('should ignore non-jsonl files', async () => {
			const mockFiles = ['user.jsonl', 'workflow.txt', 'settings.json', 'data.csv'];
			const mockEntityMetadatas = [{ name: 'User', tableName: 'user' }];

			(readdir as jest.Mock).mockResolvedValue(mockFiles);
			// @ts-expect-error Protected property
			mockDataSource.entityMetadatas = mockEntityMetadatas;

			const result = await importService.getImportMetadata('/test/input');

			expect(result).toEqual({
				tableNames: ['user'],
				entityFiles: {
					user: ['/test/input/user.jsonl'],
				},
			});
		});

		it('should exclude migrations from import metadata', async () => {
			const mockFiles = ['user.jsonl', 'migrations.jsonl', 'workflow.jsonl'];
			const mockEntityMetadatas = [
				{ name: 'User', tableName: 'user' },
				{ name: 'Workflow', tableName: 'workflow' },
			];

			(readdir as jest.Mock).mockResolvedValue(mockFiles);
			// @ts-expect-error Protected property
			mockDataSource.entityMetadatas = mockEntityMetadatas;

			const result = await importService.getImportMetadata('/test/input');

			expect(result).toEqual({
				tableNames: ['user', 'workflow'],
				entityFiles: {
					user: ['/test/input/user.jsonl'],
					workflow: ['/test/input/workflow.jsonl'],
				},
			});
		});
	});

	describe('readEntityFile', () => {
		it('should parse valid JSONL file', async () => {
			const mockContent = '{"id":1,"name":"User 1"}\n{"id":2,"name":"User 2"}\n';
			(readFile as jest.Mock).mockResolvedValue(mockContent);

			const result = await importService.readEntityFile('/test/user.jsonl');

			expect(result).toEqual([
				{ id: 1, name: 'User 1' },
				{ id: 2, name: 'User 2' },
			]);
			expect(readFile).toHaveBeenCalledWith('/test/user.jsonl', 'utf8');
		});

		it('should handle empty lines in JSONL file', async () => {
			const mockContent = '{"id":1,"name":"User 1"}\n\n{"id":2,"name":"User 2"}\n';
			(readFile as jest.Mock).mockResolvedValue(mockContent);

			const result = await importService.readEntityFile('/test/user.jsonl');

			expect(result).toEqual([
				{ id: 1, name: 'User 1' },
				{ id: 2, name: 'User 2' },
			]);
		});

		it('should handle Windows line endings', async () => {
			const mockContent = '{"id":1,"name":"User 1"}\r\n{"id":2,"name":"User 2"}\r\n';
			(readFile as jest.Mock).mockResolvedValue(mockContent);

			const result = await importService.readEntityFile('/test/user.jsonl');

			expect(result).toEqual([
				{ id: 1, name: 'User 1' },
				{ id: 2, name: 'User 2' },
			]);
		});

		it('should handle empty file', async () => {
			(readFile as jest.Mock).mockResolvedValue('');

			const result = await importService.readEntityFile('/test/empty.jsonl');

			expect(result).toEqual([]);
		});

		it('should throw error for invalid JSON', async () => {
			const mockContent = '{"id":1,"name":"User 1"}\n{"invalid":json}\n';
			(readFile as jest.Mock).mockResolvedValue(mockContent);

			await expect(importService.readEntityFile('/test/invalid.jsonl')).rejects.toThrow(
				'Invalid JSON on line 2 in file /test/invalid.jsonl. JSONL format requires one complete JSON object per line.',
			);
		});

		it('should handle file read errors', async () => {
			(readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

			await expect(importService.readEntityFile('/test/missing.jsonl')).rejects.toThrow(
				'File not found',
			);
		});
	});

	describe('importEntitiesFromFiles', () => {
		const mockEntityMetadatas = [
			{ name: 'User', tableName: 'user' },
			{ name: 'Workflow', tableName: 'workflow' },
		];

		beforeEach(() => {
			// @ts-expect-error Protected property
			mockDataSource.entityMetadatas = mockEntityMetadatas;
		});

		it('should import entities successfully', async () => {
			const mockFiles = ['user.jsonl', 'workflow.jsonl'];

			(readdir as jest.Mock).mockResolvedValue(mockFiles);
			(readFile as jest.Mock)
				.mockResolvedValueOnce('{"id":1,"name":"User 1"}\n')
				.mockResolvedValueOnce('{"id":1,"name":"Workflow 1"}\n');

			mockEntityManager.insert = jest.fn().mockResolvedValue({ identifiers: [{ id: 1 }] });

			await importService.importEntitiesFromFiles(
				'/test/input',
				mockEntityManager,
				['user', 'workflow'],
				{
					user: ['/test/input/user.jsonl'],
					workflow: ['/test/input/workflow.jsonl'],
				},
			);

			expect(mockLogger.info).toHaveBeenCalledWith(
				'\n🚀 Starting entity import from directory: /test/input',
			);
			expect(mockLogger.info).toHaveBeenCalledWith('📋 Found 2 entity types to import:');
			expect(mockLogger.info).toHaveBeenCalledWith('   • user: 1 file(s)');
			expect(mockLogger.info).toHaveBeenCalledWith('   • workflow: 1 file(s)');
			expect(mockLogger.info).toHaveBeenCalledWith('\n📊 Import Summary:');
			expect(mockLogger.info).toHaveBeenCalledWith('   Total entities imported: 2');
			expect(mockLogger.info).toHaveBeenCalledWith('   Entity types processed: 2');
			expect(mockLogger.info).toHaveBeenCalledWith('✅ Import completed successfully!');
		});

		it('should handle empty input directory', async () => {
			await importService.importEntitiesFromFiles('/test/empty', mockEntityManager, [], {});

			expect(mockLogger.warn).toHaveBeenCalledWith('No entity files found in input directory');
		});

		it('should skip entities without metadata', async () => {
			(readFile as jest.Mock).mockResolvedValue('{"id":1,"name":"User 1"}\n');
			mockEntityManager.insert = jest.fn().mockResolvedValue({ identifiers: [{ id: 1 }] });

			await importService.importEntitiesFromFiles('/test/input', mockEntityManager, ['user'], {
				user: ['/test/input/user.jsonl'],
			});

			expect(mockLogger.info).toHaveBeenCalledWith('   ✅ Completed user: 1 entities imported');
		});

		it('should handle empty entity files', async () => {
			(readFile as jest.Mock).mockResolvedValue(''); // Empty file

			await importService.importEntitiesFromFiles('/test/input', mockEntityManager, ['user'], {
				user: ['/test/input/user.jsonl'],
			});

			expect(mockLogger.info).toHaveBeenCalledWith('      Found 0 entities');
		});
	});

	describe('disableForeignKeyConstraints', () => {
		it('should disable foreign key constraints for SQLite', async () => {
			// @ts-expect-error Protected property
			mockDataSource.options = { type: 'sqlite' };
			mockEntityManager.query = jest.fn().mockResolvedValue([]);

			await importService.disableForeignKeyConstraints(mockEntityManager);

			expect(mockEntityManager.query).toHaveBeenCalledWith('PRAGMA defer_foreign_keys = ON;');
			expect(mockLogger.debug).toHaveBeenCalledWith('Executing: PRAGMA defer_foreign_keys = ON;');
			expect(mockLogger.info).toHaveBeenCalledWith('✅ Foreign key constraints disabled');
		});

		it('should disable foreign key constraints for PostgreSQL', async () => {
			// @ts-expect-error Protected property
			mockDataSource.options = { type: 'postgres' };
			mockEntityManager.query = jest.fn().mockResolvedValue([]);

			await importService.disableForeignKeyConstraints(mockEntityManager);

			expect(mockEntityManager.query).toHaveBeenCalledWith(
				'SET session_replication_role = replica;',
			);
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Executing: SET session_replication_role = replica;',
			);
			expect(mockLogger.info).toHaveBeenCalledWith('✅ Foreign key constraints disabled');
		});
	});

	describe('enableForeignKeyConstraints', () => {
		it('should enable foreign key constraints for SQLite', async () => {
			// @ts-expect-error Protected property
			mockDataSource.options = { type: 'sqlite' };
			mockEntityManager.query = jest.fn().mockResolvedValue([]);

			await importService.enableForeignKeyConstraints(mockEntityManager);

			expect(mockEntityManager.query).toHaveBeenCalledWith('PRAGMA defer_foreign_keys = OFF;');
			expect(mockLogger.debug).toHaveBeenCalledWith('Executing: PRAGMA defer_foreign_keys = OFF;');
			expect(mockLogger.info).toHaveBeenCalledWith('✅ Foreign key constraints re-enabled');
		});

		it('should enable foreign key constraints for PostgreSQL', async () => {
			// @ts-expect-error Protected property
			mockDataSource.options = { type: 'postgres' };
			mockEntityManager.query = jest.fn().mockResolvedValue([]);

			await importService.enableForeignKeyConstraints(mockEntityManager);

			expect(mockEntityManager.query).toHaveBeenCalledWith(
				'SET session_replication_role = DEFAULT;',
			);
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Executing: SET session_replication_role = DEFAULT;',
			);
			expect(mockLogger.info).toHaveBeenCalledWith('✅ Foreign key constraints re-enabled');
		});
	});

	describe('toNewCredentialFormat', () => {
		it('should convert old credential format to new format', () => {
			const mockNode = {
				credentials: {
					httpBasicAuth: 'My HTTP Auth',
					oAuth2Api: 'My OAuth2',
				},
			};

			const mockCredentials = [
				{ id: 'cred1', name: 'My HTTP Auth', type: 'httpBasicAuth' },
				{ id: 'cred2', name: 'My OAuth2', type: 'oAuth2Api' },
			];

			// @ts-expect-error Accessing private property for testing
			importService.dbCredentials = mockCredentials;

			// @ts-expect-error Accessing private method for testing
			importService.toNewCredentialFormat(mockNode);

			expect(mockNode.credentials).toEqual({
				httpBasicAuth: { id: 'cred1', name: 'My HTTP Auth' },
				oAuth2Api: { id: 'cred2', name: 'My OAuth2' },
			});
		});

		it('should handle nodes without credentials', () => {
			const mockNode = {};

			// @ts-expect-error Accessing private method for testing
			importService.toNewCredentialFormat(mockNode);

			expect(mockNode).toEqual({});
		});

		it('should handle credentials not found in database', () => {
			const mockNode = {
				credentials: {
					httpBasicAuth: 'Unknown Credential',
				},
			};

			// @ts-expect-error Accessing private property for testing
			importService.dbCredentials = [];

			// @ts-expect-error Accessing private method for testing
			importService.toNewCredentialFormat(mockNode);

			expect(mockNode.credentials).toEqual({
				httpBasicAuth: { id: null, name: 'Unknown Credential' },
			});
		});

		it('should handle non-string credential values', () => {
			const mockNode = {
				credentials: {
					httpBasicAuth: { id: 'existing', name: 'Existing' },
					oAuth2Api: 'String Credential',
				},
			};

			const mockCredentials = [{ id: 'cred1', name: 'String Credential', type: 'oAuth2Api' }];

			// @ts-expect-error Accessing private property for testing
			importService.dbCredentials = mockCredentials;

			// @ts-expect-error Accessing private method for testing
			importService.toNewCredentialFormat(mockNode);

			expect(mockNode.credentials).toEqual({
				httpBasicAuth: { id: 'existing', name: 'Existing' },
				oAuth2Api: { id: 'cred1', name: 'String Credential' },
			});
		});
	});

	describe('importEntities', () => {
		it('should call transaction with correct parameters', async () => {
			const mockEntityMetadatas = [
				{ name: 'User', tableName: 'user' },
				{ name: 'Workflow', tableName: 'workflow' },
			];

			// @ts-expect-error Protected property
			mockDataSource.entityMetadatas = mockEntityMetadatas;
			// @ts-expect-error Protected property
			mockDataSource.options = { type: 'sqlite' };

			// Mock the transaction method to just call the callback
			mockDataSource.transaction = jest.fn().mockImplementation(async (callback) => {
				const mockManager = {
					query: jest.fn().mockResolvedValue([]),
					insert: jest.fn().mockResolvedValue({ identifiers: [{ id: 1 }] }),
					createQueryBuilder: jest.fn().mockReturnValue({
						delete: jest.fn().mockReturnThis(),
						from: jest.fn().mockReturnThis(),
						execute: jest.fn().mockResolvedValue({ affected: 5 }),
					}),
				};
				return await callback(mockManager);
			});

			// Mock the other methods
			jest.spyOn(importService, 'getImportMetadata').mockResolvedValue({
				tableNames: ['user', 'workflow'],
				entityFiles: {
					user: ['/test/input/user.jsonl'],
					workflow: ['/test/input/workflow.jsonl'],
				},
			});
			jest.spyOn(importService, 'areAllEntityTablesEmpty').mockResolvedValue(true);
			jest.spyOn(importService, 'importEntitiesFromFiles').mockResolvedValue();

			await importService.importEntities('/test/input', false);

			expect(mockDataSource.transaction).toHaveBeenCalled();
			expect(importService.getImportMetadata).toHaveBeenCalledWith('/test/input');
			expect(importService.areAllEntityTablesEmpty).toHaveBeenCalledWith(['user', 'workflow']);
			expect(importService.importEntitiesFromFiles).toHaveBeenCalledWith(
				'/test/input',
				expect.any(Object),
				['user', 'workflow'],
				{
					user: ['/test/input/user.jsonl'],
					workflow: ['/test/input/workflow.jsonl'],
				},
			);
		});

		it('should handle truncation when truncateTables is true', async () => {
			const mockEntityMetadatas = [
				{ name: 'User', tableName: 'user' },
				{ name: 'Workflow', tableName: 'workflow' },
			];

			// @ts-expect-error Protected property
			mockDataSource.entityMetadatas = mockEntityMetadatas;
			// @ts-expect-error Protected property
			mockDataSource.options = { type: 'sqlite' };

			// Mock the transaction method
			mockDataSource.transaction = jest.fn().mockImplementation(async (callback) => {
				const mockManager = {
					query: jest.fn().mockResolvedValue([]),
					insert: jest.fn().mockResolvedValue({ identifiers: [{ id: 1 }] }),
					createQueryBuilder: jest.fn().mockReturnValue({
						delete: jest.fn().mockReturnThis(),
						from: jest.fn().mockReturnThis(),
						execute: jest.fn().mockResolvedValue({ affected: 5 }),
					}),
				};
				return await callback(mockManager);
			});

			// Mock the other methods
			jest.spyOn(importService, 'getImportMetadata').mockResolvedValue({
				tableNames: ['user', 'workflow'],
				entityFiles: {
					user: ['/test/input/user.jsonl'],
					workflow: ['/test/input/workflow.jsonl'],
				},
			});
			jest.spyOn(importService, 'truncateEntityTable').mockResolvedValue();
			jest.spyOn(importService, 'importEntitiesFromFiles').mockResolvedValue();

			await importService.importEntities('/test/input', true);

			expect(mockDataSource.transaction).toHaveBeenCalled();
			expect(importService.getImportMetadata).toHaveBeenCalledWith('/test/input');
			expect(importService.truncateEntityTable).toHaveBeenCalledTimes(2);
			expect(importService.importEntitiesFromFiles).toHaveBeenCalledWith(
				'/test/input',
				expect.any(Object),
				['user', 'workflow'],
				{
					user: ['/test/input/user.jsonl'],
					workflow: ['/test/input/workflow.jsonl'],
				},
			);
		});

		it('should skip import when tables are not empty and truncateTables is false', async () => {
			const mockEntityMetadatas = [{ name: 'User', tableName: 'user' }];

			// @ts-expect-error Protected property
			mockDataSource.entityMetadatas = mockEntityMetadatas;
			// @ts-expect-error Protected property
			mockDataSource.options = { type: 'sqlite' };

			// Mock the transaction method
			mockDataSource.transaction = jest.fn().mockImplementation(async (callback) => {
				const mockManager = {
					query: jest.fn().mockResolvedValue([]),
				};
				return await callback(mockManager);
			});

			// Mock the other methods
			jest.spyOn(importService, 'getImportMetadata').mockResolvedValue({
				tableNames: ['user'],
				entityFiles: {
					user: ['/test/input/user.jsonl'],
				},
			});
			jest.spyOn(importService, 'areAllEntityTablesEmpty').mockResolvedValue(false);
			jest.spyOn(importService, 'importEntitiesFromFiles').mockResolvedValue();

			await importService.importEntities('/test/input', false);

			expect(mockDataSource.transaction).toHaveBeenCalled();
			expect(importService.getImportMetadata).toHaveBeenCalledWith('/test/input');
			expect(importService.areAllEntityTablesEmpty).toHaveBeenCalledWith(['user']);
			expect(importService.importEntitiesFromFiles).not.toHaveBeenCalled();
		});
	});

	describe('validateMigrations', () => {
		beforeEach(() => {
			// Set up default DataSource options
			// @ts-expect-error Accessing private property for testing
			mockDataSource.options = { type: 'sqlite', entityPrefix: '' };
			mockDataSource.driver = {
				escape: jest.fn((identifier: string) => `"${identifier}"`),
			} as any;
		});

		it('should throw error when migrations file is missing', async () => {
			const inputDir = '/test/input';
			const migrationsFilePath = '/test/input/migrations.jsonl';

			jest.mocked(readFile).mockRejectedValue(new Error('ENOENT: no such file or directory'));

			await expect(importService.validateMigrations(inputDir)).rejects.toThrow(
				'Migrations file not found. Cannot proceed with import without migration validation.',
			);

			expect(readFile).toHaveBeenCalledWith(migrationsFilePath, 'utf8');
		});

		it('should throw error when migrations file contains invalid JSON', async () => {
			const inputDir = '/test/input';
			const migrationsFilePath = '/test/input/migrations.jsonl';
			const invalidJsonContent =
				'{"id": "001", "name": "TestMigration", "timestamp": "1000"}\n{invalid json}';

			jest.mocked(readFile).mockResolvedValue(invalidJsonContent);

			await expect(importService.validateMigrations(inputDir)).rejects.toThrow(
				'Invalid JSON in migrations file:',
			);

			expect(readFile).toHaveBeenCalledWith(migrationsFilePath, 'utf8');
		});

		it('should handle empty migrations file gracefully', async () => {
			const inputDir = '/test/input';
			const migrationsFilePath = '/test/input/migrations.jsonl';

			jest.mocked(readFile).mockResolvedValue('');

			await importService.validateMigrations(inputDir);

			expect(readFile).toHaveBeenCalledWith(migrationsFilePath, 'utf8');
			expect(mockLogger.info).toHaveBeenCalledWith('No migrations found in import data');
		});

		it('should handle migrations file with only whitespace', async () => {
			const inputDir = '/test/input';
			const migrationsFilePath = '/test/input/migrations.jsonl';

			jest.mocked(readFile).mockResolvedValue('\n\n  \n\t\n');

			await importService.validateMigrations(inputDir);

			expect(readFile).toHaveBeenCalledWith(migrationsFilePath, 'utf8');
			expect(mockLogger.info).toHaveBeenCalledWith('No migrations found in import data');
		});

		it('should throw error when target database has no migrations', async () => {
			const inputDir = '/test/input';
			const importMigrations = [{ id: '001', name: 'TestMigration', timestamp: '1000' }];

			jest
				.mocked(readFile)
				.mockResolvedValue(importMigrations.map((m) => JSON.stringify(m)).join('\n'));
			jest.mocked(mockDataSource.query).mockResolvedValue([]);

			await expect(importService.validateMigrations(inputDir)).rejects.toThrow(
				'Target database has no migrations. Cannot import data from a different migration state.',
			);

			expect(mockDataSource.query).toHaveBeenCalledWith(
				'SELECT * FROM "migrations" ORDER BY timestamp DESC LIMIT 1',
			);
		});

		it('should throw error when migration timestamps do not match', async () => {
			const inputDir = '/test/input';
			const importMigrations = [{ id: '001', name: 'TestMigration', timestamp: '1000' }];
			const dbMigrations = [{ id: '002', name: 'TestMigration', timestamp: '2000' }];

			jest
				.mocked(readFile)
				.mockResolvedValue(importMigrations.map((m) => JSON.stringify(m)).join('\n'));
			jest.mocked(mockDataSource.query).mockResolvedValue(dbMigrations);

			await expect(importService.validateMigrations(inputDir)).rejects.toThrow(
				'Migration timestamp mismatch. Import data: TestMigration (1000) does not match target database TestMigration (2000). Cannot import data from different migration states.',
			);

			expect(mockLogger.info).toHaveBeenCalledWith(
				'Latest migration in import data: TestMigration (timestamp: 1000, id: 001)',
			);
			expect(mockLogger.info).toHaveBeenCalledWith(
				'Latest migration in target database: TestMigration (timestamp: 2000, id: 002)',
			);
		});

		it('should throw error when migration names do not match', async () => {
			const inputDir = '/test/input';
			const importMigrations = [{ id: '001', name: 'ImportMigration', timestamp: '1000' }];
			const dbMigrations = [{ id: '001', name: 'DbMigration', timestamp: '1000' }];

			jest
				.mocked(readFile)
				.mockResolvedValue(importMigrations.map((m) => JSON.stringify(m)).join('\n'));
			jest.mocked(mockDataSource.query).mockResolvedValue(dbMigrations);

			await expect(importService.validateMigrations(inputDir)).rejects.toThrow(
				'Migration name mismatch. Import data: ImportMigration does not match target database DbMigration. Cannot import data from different migration states.',
			);
		});

		it('should throw error when migration IDs do not match', async () => {
			const inputDir = '/test/input';
			const importMigrations = [{ id: '001', name: 'TestMigration', timestamp: '1000' }];
			const dbMigrations = [{ id: '002', name: 'TestMigration', timestamp: '1000' }];

			jest
				.mocked(readFile)
				.mockResolvedValue(importMigrations.map((m) => JSON.stringify(m)).join('\n'));
			jest.mocked(mockDataSource.query).mockResolvedValue(dbMigrations);

			await expect(importService.validateMigrations(inputDir)).rejects.toThrow(
				'Migration ID mismatch. Import data: TestMigration (id: 001) does not match target database TestMigration (id: 002). Cannot import data from different migration states.',
			);
		});

		it('should pass validation when migrations match exactly', async () => {
			const inputDir = '/test/input';
			const importMigrations = [{ id: '001', name: 'TestMigration', timestamp: '1000' }];
			const dbMigrations = [{ id: '001', name: 'TestMigration', timestamp: '1000' }];

			jest
				.mocked(readFile)
				.mockResolvedValue(importMigrations.map((m) => JSON.stringify(m)).join('\n'));
			jest.mocked(mockDataSource.query).mockResolvedValue(dbMigrations);

			await importService.validateMigrations(inputDir);

			expect(mockLogger.info).toHaveBeenCalledWith(
				'Latest migration in import data: TestMigration (timestamp: 1000, id: 001)',
			);
			expect(mockLogger.info).toHaveBeenCalledWith(
				'Latest migration in target database: TestMigration (timestamp: 1000, id: 001)',
			);
			expect(mockLogger.info).toHaveBeenCalledWith(
				'✅ Migration validation passed - import data matches target database migration state',
			);
		});

		it('should throw error when migration IDs have different formats', async () => {
			const inputDir = '/test/input';
			const importMigrations = [{ id: '001', name: 'TestMigration', timestamp: '1000' }];
			const dbMigrations = [{ id: 1, name: 'TestMigration', timestamp: '1000' }];

			jest
				.mocked(readFile)
				.mockResolvedValue(importMigrations.map((m) => JSON.stringify(m)).join('\n'));
			jest.mocked(mockDataSource.query).mockResolvedValue(dbMigrations);

			await expect(importService.validateMigrations(inputDir)).rejects.toThrow(
				'Migration ID mismatch. Import data: TestMigration (id: 001) does not match target database TestMigration (id: 1). Cannot import data from different migration states.',
			);
		});

		it('should handle multiple migrations and find the latest one', async () => {
			const inputDir = '/test/input';
			const importMigrations = [
				{ id: '001', name: 'FirstMigration', timestamp: '1000' },
				{ id: '002', name: 'SecondMigration', timestamp: '2000' },
				{ id: '003', name: 'LatestMigration', timestamp: '3000' },
			];
			const dbMigrations = [{ id: '003', name: 'LatestMigration', timestamp: '3000' }];

			jest
				.mocked(readFile)
				.mockResolvedValue(importMigrations.map((m) => JSON.stringify(m)).join('\n'));
			jest.mocked(mockDataSource.query).mockResolvedValue(dbMigrations);

			await importService.validateMigrations(inputDir);

			expect(mockLogger.info).toHaveBeenCalledWith(
				'Latest migration in import data: LatestMigration (timestamp: 3000, id: 003)',
			);
			expect(mockLogger.info).toHaveBeenCalledWith(
				'✅ Migration validation passed - import data matches target database migration state',
			);
		});

		it('should handle migrations with only ID field (no timestamp)', async () => {
			const inputDir = '/test/input';
			const importMigrations = [{ id: '1000', name: 'TestMigration' }];
			const dbMigrations = [{ id: '1000', name: 'TestMigration', timestamp: '1000' }];

			jest
				.mocked(readFile)
				.mockResolvedValue(importMigrations.map((m) => JSON.stringify(m)).join('\n'));
			jest.mocked(mockDataSource.query).mockResolvedValue(dbMigrations);

			await importService.validateMigrations(inputDir);

			expect(mockLogger.info).toHaveBeenCalledWith(
				'Latest migration in import data: TestMigration (timestamp: 1000, id: 1000)',
			);
			expect(mockLogger.info).toHaveBeenCalledWith(
				'✅ Migration validation passed - import data matches target database migration state',
			);
		});

		it('should handle database query errors gracefully', async () => {
			const inputDir = '/test/input';
			const importMigrations = [{ id: '001', name: 'TestMigration', timestamp: '1000' }];

			jest
				.mocked(readFile)
				.mockResolvedValue(importMigrations.map((m) => JSON.stringify(m)).join('\n'));
			jest.mocked(mockDataSource.query).mockRejectedValue(new Error('Database connection failed'));

			await expect(importService.validateMigrations(inputDir)).rejects.toThrow(
				'Database connection failed',
			);
		});

		it('should handle migrations with table prefix', async () => {
			const inputDir = '/test/input';
			const importMigrations = [{ id: '001', name: 'TestMigration', timestamp: '1000' }];
			const dbMigrations = [{ id: '001', name: 'TestMigration', timestamp: '1000' }];

			// Set up DataSource with table prefix
			// @ts-expect-error Accessing private property for testing
			mockDataSource.options = { type: 'sqlite', entityPrefix: 'n8n_' };

			jest
				.mocked(readFile)
				.mockResolvedValue(importMigrations.map((m) => JSON.stringify(m)).join('\n'));
			jest.mocked(mockDataSource.query).mockResolvedValue(dbMigrations);

			await importService.validateMigrations(inputDir);

			expect(mockDataSource.query).toHaveBeenCalledWith(
				'SELECT * FROM "n8n_migrations" ORDER BY timestamp DESC LIMIT 1',
			);
			expect(mockLogger.info).toHaveBeenCalledWith(
				'✅ Migration validation passed - import data matches target database migration state',
			);
		});

		it('should handle migrations with mixed line endings', async () => {
			const inputDir = '/test/input';
			const importMigrations = [{ id: '001', name: 'TestMigration', timestamp: '1000' }];

			// Simulate file with mixed line endings
			const fileContent = importMigrations.map((m) => JSON.stringify(m)).join('\r\n');

			jest.mocked(readFile).mockResolvedValue(fileContent);
			jest.mocked(mockDataSource.query).mockResolvedValue(importMigrations);

			await importService.validateMigrations(inputDir);

			expect(mockLogger.info).toHaveBeenCalledWith(
				'✅ Migration validation passed - import data matches target database migration state',
			);
		});
	});
});
