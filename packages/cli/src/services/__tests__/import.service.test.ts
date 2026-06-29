import type { Mock } from 'vitest';
import { safeJoinPath, type Logger } from '@n8n/backend-common';
import type { CredentialsRepository, TagRepository, UserRepository } from '@n8n/db';
import { type DataSource, type EntityManager } from '@n8n/typeorm';
import { readdir, readFile } from 'fs/promises';
import { mock } from 'vitest-mock-extended';
import type { Cipher } from 'n8n-core';

import type { DataTableDDLService } from '@/modules/data-table/data-table-ddl.service';
import type { WorkflowIndexService } from '@/modules/workflow-index/workflow-index.service';
import type { WorkflowService } from '@/workflows/workflow.service';

import { ImportService } from '../import.service';

// Mock fs/promises
vi.mock('fs/promises');

vi.mock('@/utils/compression.util');
// Partial fs mock: override only existsSync (used by decompressEntitiesZip via a
// dynamic import), keeping the rest of fs real for other tests in this file.
vi.mock('fs', async (importOriginal) => ({
	...(await importOriginal<typeof import('fs')>()),
	existsSync: vi.fn(),
}));

vi.mock('@n8n/backend-common', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/backend-common')>()),
	safeJoinPath: vi.fn(),
}));

// Mock @n8n/db
// Spread the real module so transitively-imported exports resolve (Vitest throws
// on undeclared mock exports, unlike Jest), overriding only the repos under test.
vi.mock('@n8n/db', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/db')>()),
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
	let mockCipher: Cipher;
	let mockWorkflowIndexService: WorkflowIndexService;
	let mockDataTableDDLService: DataTableDDLService;
	let mockUserRepository: UserRepository;
	let mockWorkflowService: WorkflowService;

	beforeEach(() => {
		vi.clearAllMocks();

		mockLogger = mock<Logger>();
		mockDataSource = mock<DataSource>();
		mockCredentialsRepository = mock<CredentialsRepository>();
		mockTagRepository = mock<TagRepository>();
		mockEntityManager = mock<EntityManager>();
		mockCipher = mock<Cipher>();
		mockWorkflowIndexService = mock<WorkflowIndexService>();
		mockDataTableDDLService = mock<DataTableDDLService>();
		mockUserRepository = mock<UserRepository>();
		mockWorkflowService = mock<WorkflowService>();

		// Set up cipher mock
		mockCipher.decryptV2 = vi.fn(async (data: string) =>
			data.replace('encrypted:', ''),
		) as Cipher['decryptV2'];

		// Set up dataSource mocks
		// @ts-expect-error Accessing private property for testing
		mockDataSource.options = { type: 'sqlite' };
		mockDataSource.driver = {
			escape: vi.fn((identifier: string) => `"${identifier}"`),
		} as any;
		// @ts-expect-error Accessing private property for testing
		mockDataSource.entityMetadatas = [
			{
				name: 'User',
				tableName: 'user',
				columns: [{ databaseName: 'id' }, { databaseName: 'email' }],
			},
			{
				name: 'WorkflowEntity',
				tableName: 'workflow_entity',
				columns: [{ databaseName: 'id' }, { databaseName: 'name' }],
			},
		] as any;

		// Set up entity manager mocks
		mockEntityManager.createQueryBuilder = vi.fn().mockReturnValue({
			delete: vi.fn().mockReturnThis(),
			from: vi.fn().mockReturnThis(),
			execute: vi.fn().mockResolvedValue(undefined),
		});
		mockEntityManager.query = vi.fn().mockResolvedValue(undefined);
		mockEntityManager.insert = vi.fn().mockResolvedValue(undefined);
		mockEntityManager.upsert = vi.fn().mockResolvedValue(undefined);
		// Passthrough so tests can read column fields off the result.
		mockEntityManager.create = vi.fn().mockImplementation((_entity, data) => data);

		// Mock transaction method
		mockDataSource.transaction = vi.fn().mockImplementation(async (callback) => {
			return await callback(mockEntityManager);
		});

		importService = new ImportService(
			mockLogger,
			mockCredentialsRepository,
			mockTagRepository,
			mockDataSource,
			mockCipher,
			mockWorkflowIndexService,
			mockDataTableDDLService,
			mockUserRepository,
			mockWorkflowService,
		);
	});

	describe('isTableEmpty', () => {
		it('should return true for empty table', async () => {
			const mockQueryBuilder = {
				select: vi.fn().mockReturnThis(),
				from: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				getRawMany: vi.fn().mockResolvedValue([]),
			};

			mockDataSource.createQueryBuilder = vi.fn().mockReturnValue(mockQueryBuilder);

			const result = await importService.isTableEmpty('users');

			expect(result).toBe(true);
			expect(mockQueryBuilder.select).toHaveBeenCalledWith('1');
			expect(mockQueryBuilder.from).toHaveBeenCalledWith('users', 'users');
			expect(mockQueryBuilder.limit).toHaveBeenCalledWith(1);
			expect(mockLogger.debug).toHaveBeenCalledWith('Table users has 0 rows');
		});

		it('should return false for non-empty table', async () => {
			const mockQueryBuilder = {
				select: vi.fn().mockReturnThis(),
				from: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				getRawMany: vi.fn().mockResolvedValue([{ id: 1 }]),
			};

			mockDataSource.createQueryBuilder = vi.fn().mockReturnValue(mockQueryBuilder);

			const result = await importService.isTableEmpty('users');

			expect(result).toBe(false);
			expect(mockQueryBuilder.select).toHaveBeenCalledWith('1');
			expect(mockQueryBuilder.from).toHaveBeenCalledWith('users', 'users');
			expect(mockQueryBuilder.limit).toHaveBeenCalledWith(1);
			expect(mockLogger.debug).toHaveBeenCalledWith('Table users has 1 rows');
		});

		it('should handle database errors gracefully', async () => {
			const mockQueryBuilder = {
				select: vi.fn().mockReturnThis(),
				from: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				getRawMany: vi.fn().mockRejectedValue(new Error('Database connection failed')),
			};

			mockDataSource.createQueryBuilder = vi.fn().mockReturnValue(mockQueryBuilder);

			await expect(importService.isTableEmpty('users')).rejects.toThrow(
				'Unable to check table users',
			);
		});
	});

	describe('areAllEntityTablesEmpty', () => {
		it('should return true when all tables are empty', async () => {
			const mockQueryBuilder = {
				select: vi.fn().mockReturnThis(),
				from: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				getRawMany: vi.fn().mockResolvedValue([]),
			};

			mockDataSource.createQueryBuilder = vi.fn().mockReturnValue(mockQueryBuilder);

			const result = await importService.areAllEntityTablesEmpty(['users', 'workflows']);

			expect(result).toBe(true);
			expect(mockDataSource.createQueryBuilder).toHaveBeenCalledTimes(2);
		});

		it('should return false when any table has data', async () => {
			const mockQueryBuilder = {
				select: vi.fn().mockReturnThis(),
				from: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				getRawMany: vi
					.fn()
					.mockResolvedValueOnce([]) // First table empty
					.mockResolvedValueOnce([{ id: 1 }]), // Second table has data
			};

			mockDataSource.createQueryBuilder = vi.fn().mockReturnValue(mockQueryBuilder);

			const result = await importService.areAllEntityTablesEmpty(['users', 'workflows']);

			expect(result).toBe(false);
		});

		it('should return true for empty table names array', async () => {
			const result = await importService.areAllEntityTablesEmpty([]);

			expect(result).toBe(true);
			expect(mockDataSource.createQueryBuilder).not.toHaveBeenCalled();
		});

		it('should handle multiple non-empty tables', async () => {
			const mockQueryBuilder = {
				select: vi.fn().mockReturnThis(),
				from: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				getRawMany: vi
					.fn()
					.mockResolvedValueOnce([{ id: 1 }]) // First table has data
					.mockResolvedValueOnce([{ id: 2 }]), // Second table has data
			};

			mockDataSource.createQueryBuilder = vi.fn().mockReturnValue(mockQueryBuilder);

			const result = await importService.areAllEntityTablesEmpty(['users', 'workflows']);

			expect(result).toBe(false);
		});
	});

	describe('truncateEntityTable', () => {
		it('should truncate table successfully', async () => {
			await importService.truncateEntityTable('users', mockEntityManager);

			expect(mockEntityManager.createQueryBuilder).toHaveBeenCalled();
			expect(mockLogger.info).toHaveBeenCalledWith('🗑️  Truncating table: users');
			expect(mockLogger.info).toHaveBeenCalledWith('   ✅ Table users truncated successfully');
		});

		it('should handle database errors gracefully', async () => {
			const mockQueryBuilder = {
				delete: vi.fn().mockReturnThis(),
				from: vi.fn().mockReturnThis(),
				execute: vi.fn().mockRejectedValue(new Error('Database error')),
			};
			mockEntityManager.createQueryBuilder = vi.fn().mockReturnValue(mockQueryBuilder);

			await expect(importService.truncateEntityTable('users', mockEntityManager)).rejects.toThrow(
				'Database error',
			);
		});
	});

	describe('getImportMetadata', () => {
		it('should return complete import metadata for valid entity files', async () => {
			const mockFiles = ['user.jsonl', 'workflowentity.jsonl', 'migrations.jsonl'];

			vi.mocked(readdir).mockResolvedValue(mockFiles as any);
			vi.mocked(safeJoinPath)
				.mockReturnValueOnce('/test/input/user.jsonl')
				.mockReturnValueOnce('/test/input/workflowentity.jsonl');

			const result = await importService.getImportMetadata('/test/input');

			expect(result).toEqual({
				entityFiles: {
					user: ['/test/input/user.jsonl'],
					workflowentity: ['/test/input/workflowentity.jsonl'],
				},
				tableNames: ['user', 'workflow_entity'],
				dataTableFiles: {},
			});
		});

		it('should handle numbered entity files', async () => {
			const mockFiles = ['user.jsonl', 'user.2.jsonl', 'user.3.jsonl'];

			vi.mocked(readdir).mockResolvedValue(mockFiles as any);
			vi.mocked(safeJoinPath)
				.mockReturnValueOnce('/test/input/user.jsonl')
				.mockReturnValueOnce('/test/input/user.2.jsonl')
				.mockReturnValueOnce('/test/input/user.3.jsonl');

			const result = await importService.getImportMetadata('/test/input');

			expect(result).toEqual({
				entityFiles: {
					user: ['/test/input/user.jsonl', '/test/input/user.2.jsonl', '/test/input/user.3.jsonl'],
				},
				tableNames: ['user'],
				dataTableFiles: {},
			});
		});

		it('should skip entities without metadata', async () => {
			const mockFiles = ['unknown.jsonl', 'invalid.txt'];

			vi.mocked(readdir).mockResolvedValue(mockFiles as any);

			const result = await importService.getImportMetadata('/test/input');

			expect(result).toEqual({
				entityFiles: {},
				tableNames: [],
				dataTableFiles: {},
			});
		});

		it('should handle empty directory', async () => {
			vi.mocked(readdir).mockResolvedValue([]);

			const result = await importService.getImportMetadata('/test/input');

			expect(result).toEqual({
				entityFiles: {},
				tableNames: [],
				dataTableFiles: {},
			});
		});

		it('should ignore non-jsonl files', async () => {
			const mockFiles = ['user.txt', 'user.json', 'user.csv'];

			vi.mocked(readdir).mockResolvedValue(mockFiles as any);

			const result = await importService.getImportMetadata('/test/input');

			expect(result).toEqual({
				entityFiles: {},
				tableNames: [],
				dataTableFiles: {},
			});
		});

		it('should exclude migrations from import metadata', async () => {
			const mockFiles = ['user.jsonl', 'migrations.jsonl'];

			vi.mocked(readdir).mockResolvedValue(mockFiles as any);

			vi.mocked(safeJoinPath).mockReturnValue('/test/input/user.jsonl');

			const result = await importService.getImportMetadata('/test/input');

			expect(result).toEqual({
				entityFiles: {
					user: ['/test/input/user.jsonl'],
				},
				tableNames: ['user'],
				dataTableFiles: {},
			});
		});

		it('should route data-table user-row files into dataTableFiles', async () => {
			const mockFiles = [
				'user.jsonl',
				'data_table_user_abc.jsonl',
				'data_table_user_abc.2.jsonl',
				'data_table_user_xyz.jsonl',
			];

			vi.mocked(readdir).mockResolvedValue(mockFiles as any);
			vi.mocked(safeJoinPath)
				.mockReturnValueOnce('/test/input/user.jsonl')
				.mockReturnValueOnce('/test/input/data_table_user_abc.jsonl')
				.mockReturnValueOnce('/test/input/data_table_user_abc.2.jsonl')
				.mockReturnValueOnce('/test/input/data_table_user_xyz.jsonl');

			const result = await importService.getImportMetadata('/test/input');

			expect(result).toEqual({
				entityFiles: {
					user: ['/test/input/user.jsonl'],
				},
				tableNames: ['user'],
				dataTableFiles: {
					abc: ['/test/input/data_table_user_abc.jsonl', '/test/input/data_table_user_abc.2.jsonl'],
					xyz: ['/test/input/data_table_user_xyz.jsonl'],
				},
			});
		});
	});

	describe('readEntityFile', () => {
		it('should parse valid JSONL file', async () => {
			const mockContent = '{"id":1,"name":"Test"}\n{"id":2,"name":"Test2"}';
			vi.mocked(readFile).mockResolvedValue(mockContent);

			const result = await importService.readEntityFile('/test/data.jsonl');

			expect(result).toEqual([
				{ id: 1, name: 'Test' },
				{ id: 2, name: 'Test2' },
			]);
			expect(mockCipher.decryptV2).toHaveBeenCalledWith('{"id":1,"name":"Test"}', undefined);
			expect(mockCipher.decryptV2).toHaveBeenCalledWith('{"id":2,"name":"Test2"}', undefined);
		});

		it('should handle empty lines in JSONL file', async () => {
			const mockContent = '{"id":1,"name":"Test"}\n\n{"id":2,"name":"Test2"}\n';
			vi.mocked(readFile).mockResolvedValue(mockContent);

			const result = await importService.readEntityFile('/test/data.jsonl');

			expect(result).toEqual([
				{ id: 1, name: 'Test' },
				{ id: 2, name: 'Test2' },
			]);
		});

		it('should handle Windows line endings', async () => {
			const mockContent = '{"id":1,"name":"Test"}\r\n{"id":2,"name":"Test2"}';
			vi.mocked(readFile).mockResolvedValue(mockContent);

			const result = await importService.readEntityFile('/test/data.jsonl');

			expect(result).toEqual([
				{ id: 1, name: 'Test' },
				{ id: 2, name: 'Test2' },
			]);
		});

		it('should handle empty file', async () => {
			const mockContent = '';
			vi.mocked(readFile).mockResolvedValue(mockContent);

			const result = await importService.readEntityFile('/test/data.jsonl');

			expect(result).toEqual([]);
		});

		it('should throw error for invalid JSON', async () => {
			const mockContent = '{"id":1,"name":"Test"}\n{invalid json}';
			vi.mocked(readFile).mockResolvedValue(mockContent);

			await expect(importService.readEntityFile('/test/invalid.jsonl')).rejects.toThrow(
				'Invalid JSON on line 1 in file /test/invalid.jsonl. JSONL format requires one complete JSON object per line.',
			);
		});

		it('should handle file read errors', async () => {
			vi.mocked(readFile).mockRejectedValue(new Error('File not found'));

			await expect(importService.readEntityFile('/test/missing.jsonl')).rejects.toThrow(
				'File not found',
			);
		});
	});

	describe('importEntitiesFromFiles', () => {
		it('should import entities successfully', async () => {
			const importMetadata = {
				entityFiles: {
					user: ['/test/input/user.jsonl'],
				},
				tableNames: ['user'],
			};

			mockDataSource.driver.escapeQueryWithParameters = vi
				.fn()
				.mockReturnValue(['INSERT COMMAND', { data: 'data' }]);

			const mockEntities = [{ id: 1, name: 'Test User' }];
			const mockContent = JSON.stringify(mockEntities[0]);
			vi.mocked(readFile).mockResolvedValue(mockContent);

			await importService.importEntitiesFromFiles(
				'/test/input',
				mockEntityManager,
				Object.keys(importMetadata.entityFiles),
				importMetadata.entityFiles,
			);

			expect(readFile).toHaveBeenCalledWith('/test/input/user.jsonl', 'utf8');
			expect(mockEntityManager.query).toHaveBeenCalledWith('INSERT COMMAND', { data: 'data' });
		});

		it('should handle empty input directory', async () => {
			const importMetadata = {
				entityFiles: {},
				tableNames: [],
			};

			await importService.importEntitiesFromFiles(
				'/test/input',
				mockEntityManager,
				Object.keys(importMetadata.entityFiles),
				importMetadata.entityFiles,
			);

			expect(readFile).not.toHaveBeenCalled();
			expect(mockEntityManager.insert).not.toHaveBeenCalled();
		});

		it('should skip entities without metadata', async () => {
			const importMetadata = {
				entityFiles: {},
				tableNames: [],
			};

			await importService.importEntitiesFromFiles(
				'/test/input',
				mockEntityManager,
				Object.keys(importMetadata.entityFiles),
				importMetadata.entityFiles,
			);

			expect(readFile).not.toHaveBeenCalled();
			expect(mockEntityManager.insert).not.toHaveBeenCalled();
		});

		it('should handle empty entity files', async () => {
			const importMetadata = {
				entityFiles: {
					user: ['/test/input/user.jsonl'],
				},
				tableNames: ['user'],
			};

			const mockContent = '';
			vi.mocked(readFile).mockResolvedValue(mockContent);

			await importService.importEntitiesFromFiles(
				'/test/input',
				mockEntityManager,
				Object.keys(importMetadata.entityFiles),
				importMetadata.entityFiles,
			);

			expect(readFile).toHaveBeenCalledWith('/test/input/user.jsonl', 'utf8');
			expect(mockEntityManager.insert).not.toHaveBeenCalled();
		});

		it('should import entities with a custom encryption key', async () => {
			const importMetadata = {
				entityFiles: {
					user: ['/test/input/user.jsonl'],
				},
				tableNames: ['user'],
			};

			mockDataSource.driver.escapeQueryWithParameters = vi
				.fn()
				.mockReturnValue(['INSERT COMMAND', { data: 'data' }]);

			const mockEntities = [{ id: 1, name: 'Test User' }];
			const mockContent = JSON.stringify(mockEntities[0]);
			vi.mocked(readFile).mockResolvedValue(mockContent);

			await importService.importEntitiesFromFiles(
				'/test/input',
				mockEntityManager,
				Object.keys(importMetadata.entityFiles),
				importMetadata.entityFiles,
				'custom-encryption-key',
			);

			expect(mockCipher.decryptV2).toHaveBeenCalledWith(
				'{"id":1,"name":"Test User"}',
				'custom-encryption-key',
			);
			expect(readFile).toHaveBeenCalledWith('/test/input/user.jsonl', 'utf8');
			expect(mockEntityManager.query).toHaveBeenCalledWith('INSERT COMMAND', { data: 'data' });
		});
	});

	describe('disableForeignKeyConstraints', () => {
		it('should disable foreign key constraints for SQLite', async () => {
			// @ts-expect-error Accessing private property for testing
			mockDataSource.options = { type: 'sqlite' };

			await importService.disableForeignKeyConstraints(mockEntityManager);

			expect(mockEntityManager.query).toHaveBeenCalledWith('PRAGMA defer_foreign_keys = ON;');
		});

		it('should disable foreign key constraints for PostgreSQL', async () => {
			// @ts-expect-error Accessing private property for testing
			mockDataSource.options = { type: 'postgres' };

			await importService.disableForeignKeyConstraints(mockEntityManager);

			expect(mockEntityManager.query).toHaveBeenCalledWith(
				'SET session_replication_role = replica;',
			);
		});
	});

	describe('enableForeignKeyConstraints', () => {
		it('should enable foreign key constraints for SQLite', async () => {
			// @ts-expect-error Accessing private property for testing
			mockDataSource.options = { type: 'sqlite' };

			await importService.enableForeignKeyConstraints(mockEntityManager);

			expect(mockEntityManager.query).toHaveBeenCalledWith('PRAGMA defer_foreign_keys = OFF;');
		});

		it('should enable foreign key constraints for PostgreSQL', async () => {
			// @ts-expect-error Accessing private property for testing
			mockDataSource.options = { type: 'postgres' };

			await importService.enableForeignKeyConstraints(mockEntityManager);

			expect(mockEntityManager.query).toHaveBeenCalledWith(
				'SET session_replication_role = ORIGIN;',
			);
		});
	});

	describe('toNewCredentialFormat', () => {
		it('should convert old credential format to new format', async () => {
			const node = {
				credentials: {
					httpBasicAuth: 'credential-id-123',
				},
			};

			// Mock the credentials repository to return a matching credential
			const mockCredential = { id: null, name: 'My Auth' };
			mockCredentialsRepository.findOneBy = vi.fn().mockResolvedValue(mockCredential);

			// @ts-expect-error For testing purposes
			importService.toNewCredentialFormat(node);

			expect(node.credentials).toEqual({
				httpBasicAuth: {
					id: null,
					name: 'credential-id-123',
				},
			});
		});

		it('should handle nodes without credentials', async () => {
			const node = {};

			// @ts-expect-error For testing purposes
			importService.toNewCredentialFormat(node);

			expect(node).toEqual({});
		});

		it('should handle credentials not found in database', async () => {
			const node = {
				credentials: {
					httpBasicAuth: 'non-existent-id',
				},
			};

			mockCredentialsRepository.findOneBy = vi.fn().mockResolvedValue(null);

			// @ts-expect-error For testing purposes
			importService.toNewCredentialFormat(node);

			// Should be converted to new format with null id and string as name
			expect(node.credentials).toEqual({
				httpBasicAuth: {
					id: null,
					name: 'non-existent-id',
				},
			});
		});

		it('should handle non-string credential values', async () => {
			const node = {
				credentials: {
					httpBasicAuth: { id: 'already-converted' },
				},
			};

			// @ts-expect-error For testing purposes
			importService.toNewCredentialFormat(node);

			// Should remain unchanged when already in new format
			expect(node.credentials).toEqual({
				httpBasicAuth: { id: 'already-converted' },
			});
		});
	});

	describe('validateMigrations', () => {
		beforeEach(() => {
			vi.mocked(readFile).mockResolvedValue('{"id":"1","timestamp":"123","name":"TestMigration"}');
			// @ts-expect-error Accessing private property for testing
			mockDataSource.options = { type: 'sqlite' };
		});

		it('should throw error when migrations file is missing', async () => {
			vi.mocked(readFile).mockRejectedValue(new Error('ENOENT: no such file or directory'));

			await expect(importService.validateMigrations('/test/input')).rejects.toThrow(
				'Migrations file not found. Cannot proceed with import without migration validation.',
			);
		});

		it('should throw error when migrations file contains invalid JSON', async () => {
			const invalidJsonContent = '{invalid json}';
			vi.mocked(readFile).mockResolvedValue(invalidJsonContent);

			await expect(importService.validateMigrations('/test/input')).rejects.toThrow(
				'Invalid JSON in migrations file:',
			);
		});

		it('should handle empty migrations file gracefully', async () => {
			const emptyContent = '';
			vi.mocked(readFile).mockResolvedValue(emptyContent);

			// Empty content should not throw an error as it results in empty migrations array
			await expect(importService.validateMigrations('/test/input')).resolves.not.toThrow();
		});

		it('should handle migrations file with only whitespace', async () => {
			const whitespaceContent = '   \n  \t  ';
			vi.mocked(readFile).mockResolvedValue(whitespaceContent);

			// Whitespace content should not throw an error
			await expect(importService.validateMigrations('/test/input')).resolves.not.toThrow();
		});

		it('should throw error when target database has no migrations', async () => {
			const migrationsContent = '{"id":"1","timestamp":"123","name":"TestMigration"}';
			vi.mocked(readFile).mockResolvedValue(migrationsContent);
			vi.mocked(mockDataSource.query).mockResolvedValue([]);

			await expect(importService.validateMigrations('/test/input')).rejects.toThrow(
				'Target database has no migrations. Cannot import data from a different migration state.',
			);
		});

		it('should throw error when migration timestamps do not match', async () => {
			const migrationsContent = '{"id":"1","timestamp":"1000","name":"TestMigration"}';
			const dbMigrations = [{ id: '1', timestamp: '2000', name: 'TestMigration' }];

			vi.mocked(readFile).mockResolvedValue(migrationsContent);
			vi.mocked(mockDataSource.query).mockResolvedValue(dbMigrations);

			await expect(importService.validateMigrations('/test/input')).rejects.toThrow(
				'Migration timestamp mismatch. Import data: TestMigration (1000) does not match target database TestMigration (2000). Cannot import data from different migration states.',
			);
		});

		it('should throw error when migration names do not match', async () => {
			const migrationsContent = '{"id":"1","timestamp":"1000","name":"ImportMigration"}';
			const dbMigrations = [{ id: '1', timestamp: '1000', name: 'DbMigration' }];

			vi.mocked(readFile).mockResolvedValue(migrationsContent);
			vi.mocked(mockDataSource.query).mockResolvedValue(dbMigrations);

			await expect(importService.validateMigrations('/test/input')).rejects.toThrow(
				'Migration name mismatch. Import data: ImportMigration does not match target database DbMigration. Cannot import data from different migration states.',
			);
		});

		it('should pass validation when migrations match exactly', async () => {
			const migrationsContent = '{"id":"1","timestamp":"1000","name":"TestMigration"}';
			const dbMigrations = [{ id: '1', timestamp: '1000', name: 'TestMigration' }];

			vi.mocked(readFile).mockResolvedValue(migrationsContent);
			vi.mocked(mockDataSource.query).mockResolvedValue(dbMigrations);

			await expect(importService.validateMigrations('/test/input')).resolves.not.toThrow();
		});

		it('should handle multiple migrations and find the latest one', async () => {
			const migrationsContent = '{"id":"2","timestamp":"2000","name":"LatestMigration"}';
			const dbMigrations = [
				{ id: '1', timestamp: '1000', name: 'FirstMigration' },
				{ id: '2', timestamp: '2000', name: 'LatestMigration' },
			];

			vi.mocked(readFile).mockResolvedValue(migrationsContent);
			vi.mocked(mockDataSource.query).mockResolvedValue(dbMigrations);

			await expect(importService.validateMigrations('/test/input')).rejects.toThrow();
		});

		it('should handle database query errors gracefully', async () => {
			const migrationsContent = '{"id":"1","timestamp":"1000","name":"TestMigration"}';
			vi.mocked(readFile).mockResolvedValue(migrationsContent);
			vi.mocked(mockDataSource.query).mockRejectedValue(new Error('Database connection failed'));

			await expect(importService.validateMigrations('/test/input')).rejects.toThrow(
				'Database connection failed',
			);
		});

		it('should handle migrations with table prefix', async () => {
			const migrationsContent = '{"id":"1","timestamp":"1000","name":"TestMigration"}';
			const dbMigrations = [{ id: '1', timestamp: '1000', name: 'TestMigration' }];

			// @ts-expect-error Accessing private property for testing
			mockDataSource.options = { type: 'sqlite', entityPrefix: 'n8n_' };

			vi.mocked(readFile).mockResolvedValue(migrationsContent);
			vi.mocked(mockDataSource.query).mockResolvedValue(dbMigrations);

			await expect(importService.validateMigrations('/test/input')).resolves.not.toThrow();

			expect(mockDataSource.query).toHaveBeenCalledWith(
				'SELECT * FROM "n8n_migrations" ORDER BY timestamp DESC LIMIT 1',
			);
		});

		it('should handle migrations with mixed line endings', async () => {
			const migrationsContent =
				'{"id":"1","timestamp":"1000","name":"TestMigration"}\r\n{"id":"2","timestamp":"2000","name":"TestMigration2"}';
			const dbMigrations = [{ id: '2', timestamp: '2000', name: 'TestMigration2' }];

			vi.mocked(readFile).mockResolvedValue(migrationsContent);
			vi.mocked(mockDataSource.query).mockResolvedValue(dbMigrations);

			await expect(importService.validateMigrations('/test/input')).resolves.not.toThrow();
		});
	});

	describe('normalizeEntityJsonColumns', () => {
		const metadata = {
			columns: [
				{ databaseName: 'id', type: 'varchar' },
				{ databaseName: 'nodes', type: 'simple-json' },
				{ databaseName: 'meta', type: 'json' },
				{ databaseName: 'name', type: 'text' },
			],
		} as any;

		it('should parse and re-serialise a SQLite string JSON array value', () => {
			const entity = { id: '1', nodes: '[{"id":"abc"}]', name: 'test' };

			// @ts-expect-error accessing private method for testing
			const result = importService.normalizeEntityJsonColumns(entity, metadata);

			expect(result.nodes).toBe(JSON.stringify([{ id: 'abc' }]));
		});

		it('should parse and re-serialise a SQLite string JSON object value', () => {
			const entity = { id: '1', meta: '{"key":"value"}', name: 'test' };

			// @ts-expect-error accessing private method for testing
			const result = importService.normalizeEntityJsonColumns(entity, metadata);

			expect(result.meta).toBe(JSON.stringify({ key: 'value' }));
		});

		it('should serialise a Postgres parsed object value to a JSON string', () => {
			const entity = { id: '1', nodes: [{ id: 'abc' }], name: 'test' };

			// @ts-expect-error accessing private method for testing
			const result = importService.normalizeEntityJsonColumns(entity, metadata);

			expect(result.nodes).toBe(JSON.stringify([{ id: 'abc' }]));
		});

		it('should serialise a Postgres parsed array value to a JSON string', () => {
			const entity = { id: '1', meta: [1, 2, 3], name: 'test' };

			// @ts-expect-error accessing private method for testing
			const result = importService.normalizeEntityJsonColumns(entity, metadata);

			expect(result.meta).toBe(JSON.stringify([1, 2, 3]));
		});

		it('should leave null json column values unchanged', () => {
			const entity = { id: '1', nodes: null, meta: null };

			// @ts-expect-error accessing private method for testing
			const result = importService.normalizeEntityJsonColumns(entity, metadata);

			expect(result.nodes).toBeNull();
			expect(result.meta).toBeNull();
		});

		it('should not modify non-json columns', () => {
			const entity = { id: '1', name: 'should-not-change', nodes: '[]' };

			// @ts-expect-error accessing private method for testing
			const result = importService.normalizeEntityJsonColumns(entity, metadata);

			expect(result.id).toBe('1');
			expect(result.name).toBe('should-not-change');
		});

		it('should leave an invalid JSON string unchanged', () => {
			const entity = { id: '1', nodes: 'not-valid-json' };

			// @ts-expect-error accessing private method for testing
			const result = importService.normalizeEntityJsonColumns(entity, metadata);

			expect(result.nodes).toBe('not-valid-json');
		});

		it('should only normalise json columns in a mixed entity', () => {
			const entity = {
				id: '1',
				name: 'workflow',
				nodes: '[{"id":"abc"}]',
				meta: { key: 'value' },
			};

			// @ts-expect-error accessing private method for testing
			const result = importService.normalizeEntityJsonColumns(entity, metadata);

			expect(result.id).toBe('1');
			expect(result.name).toBe('workflow');
			expect(result.nodes).toBe(JSON.stringify([{ id: 'abc' }]));
			expect(result.meta).toBe(JSON.stringify({ key: 'value' }));
		});
	});

	describe('importEntitiesFromFiles — JSON column normalisation', () => {
		it('should normalise SQLite string json column values before inserting into Postgres', async () => {
			// @ts-expect-error Accessing private property for testing
			mockDataSource.entityMetadatas = [
				{
					name: 'WorkflowEntity',
					tableName: 'workflow_entity',
					columns: [
						{ databaseName: 'id', type: 'varchar' },
						{ databaseName: 'nodes', type: 'simple-json' },
					],
				},
			] as any;

			// SQLite-origin: nodes is a serialised string, not an object
			const sqliteEntity = { id: '1', nodes: '[{"id":"abc"}]' };
			vi.mocked(readFile).mockResolvedValue(JSON.stringify(sqliteEntity));

			const capturedParams: Array<Record<string, unknown>> = [];
			mockDataSource.driver.escapeQueryWithParameters = vi
				.fn()
				.mockImplementation((_query, params) => {
					capturedParams.push(params as Record<string, unknown>);
					return ['INSERT COMMAND', params];
				});

			await importService.importEntitiesFromFiles(
				'/test/input',
				mockEntityManager,
				['workflowentity'],
				{ workflowentity: ['/test/input/workflowentity.jsonl'] },
			);

			expect(capturedParams).toHaveLength(1);
			// nodes must be a serialised JSON string, not the raw SQLite text
			expect(capturedParams[0].nodes).toBe(JSON.stringify([{ id: 'abc' }]));
		});

		it('should normalise Postgres object json column values before inserting into SQLite', async () => {
			// @ts-expect-error Accessing private property for testing
			mockDataSource.entityMetadatas = [
				{
					name: 'WorkflowEntity',
					tableName: 'workflow_entity',
					columns: [
						{ databaseName: 'id', type: 'varchar' },
						{ databaseName: 'nodes', type: 'json' },
					],
				},
			] as any;

			// Postgres-origin: nodes is a parsed object in the JSONL
			const postgresEntity = { id: '1', nodes: [{ id: 'abc' }] };
			vi.mocked(readFile).mockResolvedValue(JSON.stringify(postgresEntity));

			const capturedParams: Array<Record<string, unknown>> = [];
			mockDataSource.driver.escapeQueryWithParameters = vi
				.fn()
				.mockImplementation((_query, params) => {
					capturedParams.push(params as Record<string, unknown>);
					return ['INSERT COMMAND', params];
				});

			await importService.importEntitiesFromFiles(
				'/test/input',
				mockEntityManager,
				['workflowentity'],
				{ workflowentity: ['/test/input/workflowentity.jsonl'] },
			);

			expect(capturedParams).toHaveLength(1);
			// nodes must be a JSON string, not the raw JS object
			expect(capturedParams[0].nodes).toBe(JSON.stringify([{ id: 'abc' }]));
		});
	});

	describe('decompressEntitiesZip', () => {
		it('should decompress entities.zip successfully when file exists', async () => {
			const inputDir = '/test/input';
			const entitiesZipPath = '/test/input/entities.zip';

			// Override the partial fs mock's existsSync for this test.
			const { existsSync } = await import('fs');
			vi.mocked(existsSync).mockReturnValue(true);

			// decompressFolder is auto-mocked at the top of the file (resolves undefined).
			vi.mocked(safeJoinPath).mockReturnValue(entitiesZipPath);

			// @ts-expect-error For testing purposes
			await importService.decompressEntitiesZip(inputDir);

			expect(mockLogger.info).toHaveBeenCalledWith(
				`\n🗜️  Found entities.zip file, decompressing to ${inputDir}...`,
			);
			expect(mockLogger.info).toHaveBeenCalledWith('✅ Successfully decompressed entities.zip');
		});
	});

	describe('dropExistingDataTableUserTables', () => {
		it('should drop dynamic tables for every entry in the destination registry', async () => {
			mockEntityManager.query = vi.fn().mockResolvedValue([{ id: 'abc' }, { id: 'xyz' }]);

			await importService.dropExistingDataTableUserTables(mockEntityManager);

			expect(mockEntityManager.query).toHaveBeenCalledWith(
				expect.stringContaining('SELECT id FROM "data_table"'),
			);
			expect(mockDataTableDDLService.dropTable).toHaveBeenCalledTimes(2);
			expect(mockDataTableDDLService.dropTable).toHaveBeenCalledWith('abc', mockEntityManager);
			expect(mockDataTableDDLService.dropTable).toHaveBeenCalledWith('xyz', mockEntityManager);
		});

		it('should silently skip when the registry is missing on the destination', async () => {
			mockEntityManager.query = vi.fn().mockRejectedValue(new Error('table not found'));

			await expect(
				importService.dropExistingDataTableUserTables(mockEntityManager),
			).resolves.not.toThrow();

			expect(mockDataTableDDLService.dropTable).not.toHaveBeenCalled();
		});

		it('should respect the table prefix when querying the registry', async () => {
			// @ts-expect-error overriding for the test
			mockDataSource.options = { type: 'sqlite', entityPrefix: 'n8n_' };
			mockEntityManager.query = vi.fn().mockResolvedValue([]);

			await importService.dropExistingDataTableUserTables(mockEntityManager);

			expect(mockEntityManager.query).toHaveBeenCalledWith(
				expect.stringContaining('"n8n_data_table"'),
			);
		});
	});

	describe('recreateDataTableUserTablesFromRegistry', () => {
		it('should recreate every backing table referenced in the imported registry', async () => {
			mockEntityManager.query = vi
				.fn()
				.mockResolvedValueOnce([{ id: 'abc' }, { id: 'xyz' }]) // SELECT id FROM data_table
				.mockResolvedValueOnce([
					{ id: 'col-1', dataTableId: 'abc', name: 'foo', type: 'string', index: 0 },
					{ id: 'col-2', dataTableId: 'xyz', name: 'bar', type: 'number', index: 0 },
				]); // SELECT cols

			await importService.recreateDataTableUserTablesFromRegistry(mockEntityManager);

			expect(mockDataTableDDLService.dropTable).toHaveBeenCalledTimes(2);
			expect(mockDataTableDDLService.createTableWithColumns).toHaveBeenCalledWith(
				'abc',
				expect.arrayContaining([expect.objectContaining({ name: 'foo', type: 'string' })]),
				mockEntityManager,
			);
			expect(mockDataTableDDLService.createTableWithColumns).toHaveBeenCalledWith(
				'xyz',
				expect.arrayContaining([expect.objectContaining({ name: 'bar', type: 'number' })]),
				mockEntityManager,
			);
		});

		it('should sort columns by index before recreating the backing table', async () => {
			mockEntityManager.query = vi
				.fn()
				.mockResolvedValueOnce([{ id: 'abc' }])
				.mockResolvedValueOnce([
					{ id: 'col-2', dataTableId: 'abc', name: 'b', type: 'string', index: 1 },
					{ id: 'col-1', dataTableId: 'abc', name: 'a', type: 'string', index: 0 },
				]);

			await importService.recreateDataTableUserTablesFromRegistry(mockEntityManager);

			const call = (mockDataTableDDLService.createTableWithColumns as Mock).mock.calls[0];
			const [, sortedColumns] = call;
			expect((sortedColumns as Array<{ name: string }>).map((c) => c.name)).toEqual(['a', 'b']);
		});

		it('should drop existing tables before recreating to make the operation idempotent', async () => {
			mockEntityManager.query = vi
				.fn()
				.mockResolvedValueOnce([{ id: 'abc' }])
				.mockResolvedValueOnce([
					{ id: 'col-1', dataTableId: 'abc', name: 'foo', type: 'string', index: 0 },
				]);

			await importService.recreateDataTableUserTablesFromRegistry(mockEntityManager);

			const dropCallOrder = (mockDataTableDDLService.dropTable as Mock).mock.invocationCallOrder[0];
			const createCallOrder = (mockDataTableDDLService.createTableWithColumns as Mock).mock
				.invocationCallOrder[0];
			expect(dropCallOrder).toBeLessThan(createCallOrder);
		});

		it('should skip silently when the registry is missing', async () => {
			mockEntityManager.query = vi.fn().mockRejectedValue(new Error('relation does not exist'));

			await expect(
				importService.recreateDataTableUserTablesFromRegistry(mockEntityManager),
			).resolves.not.toThrow();

			expect(mockDataTableDDLService.createTableWithColumns).not.toHaveBeenCalled();
		});

		it('should no-op when the registry is empty', async () => {
			mockEntityManager.query = vi.fn().mockResolvedValueOnce([]);

			await importService.recreateDataTableUserTablesFromRegistry(mockEntityManager);

			expect(mockDataTableDDLService.createTableWithColumns).not.toHaveBeenCalled();
			expect(mockDataTableDDLService.dropTable).not.toHaveBeenCalled();
		});

		describe('row import', () => {
			beforeEach(() => {
				mockDataSource.driver.escapeQueryWithParameters = vi
					.fn()
					.mockImplementation((sql, params) => [sql, params]);
			});

			it('should insert rows into the recreated backing table when files are provided', async () => {
				mockEntityManager.query = vi
					.fn()
					.mockResolvedValueOnce([{ id: 'abc' }])
					.mockResolvedValueOnce([
						{ id: 'col-1', dataTableId: 'abc', name: 'flag', type: 'boolean', index: 0 },
					])
					.mockResolvedValue(undefined); // subsequent INSERTs

				const row = {
					id: 1,
					createdAt: '2024-01-01 12:00:00',
					updatedAt: '2024-01-01 12:00:00',
					flag: 0,
				};
				vi.mocked(readFile).mockResolvedValue(JSON.stringify(row));

				await importService.recreateDataTableUserTablesFromRegistry(mockEntityManager, {
					abc: ['/test/input/data_table_user_abc.jsonl'],
				});

				const insertCalls = (mockEntityManager.query as Mock).mock.calls.filter(
					([sql]) => typeof sql === 'string' && sql.startsWith('INSERT INTO'),
				);
				expect(insertCalls).toHaveLength(1);
				const [, params] = insertCalls[0];
				// Boolean must have been normalised from 0 -> false (matters for cross-DB inserts)
				expect((params as Record<string, unknown>).flag).toBe(false);
				// id is preserved
				expect((params as Record<string, unknown>).id).toBe(1);
			});

			it('should warn when archive has row files but registry is empty', async () => {
				mockEntityManager.query = vi.fn().mockResolvedValueOnce([]);

				await importService.recreateDataTableUserTablesFromRegistry(mockEntityManager, {
					orphan: ['/test/input/data_table_user_orphan.jsonl'],
				});

				expect(mockLogger.warn).toHaveBeenCalledWith(
					expect.stringContaining('but no entries in the data_table registry'),
				);
			});

			it('should reset the id sequence after inserts on Postgres', async () => {
				// @ts-expect-error overriding for the test
				mockDataSource.options = { type: 'postgres' };

				// Mixed-case id matters: pg_get_serial_sequence folds unquoted
				// identifiers to lowercase, so the param must be the quoted form.
				const mixedCaseId = 'AbC123';

				mockEntityManager.query = vi
					.fn()
					.mockResolvedValueOnce([{ id: mixedCaseId }])
					.mockResolvedValueOnce([
						{ id: 'col-1', dataTableId: mixedCaseId, name: 'foo', type: 'string', index: 0 },
					])
					.mockResolvedValueOnce(undefined) // INSERT row
					.mockResolvedValueOnce([{ column_name: 'id' }]) // information_schema lookup
					.mockResolvedValue(undefined);

				vi.mocked(readFile).mockResolvedValue(
					JSON.stringify({
						id: 5,
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z',
						foo: 'x',
					}),
				);

				await importService.recreateDataTableUserTablesFromRegistry(mockEntityManager, {
					[mixedCaseId]: [`/test/input/data_table_user_${mixedCaseId}.jsonl`],
				});

				const setvalCalls = (mockEntityManager.query as Mock).mock.calls.filter(
					([sql]) => typeof sql === 'string' && sql.includes('setval('),
				);
				expect(setvalCalls).toHaveLength(1);
				const [, params] = setvalCalls[0];
				expect(params).toEqual([`"data_table_user_${mixedCaseId}"`, 'id']);
			});

			it('should NOT call setval on Postgres when no rows were inserted', async () => {
				// @ts-expect-error overriding for the test
				mockDataSource.options = { type: 'postgres' };

				mockEntityManager.query = vi
					.fn()
					.mockResolvedValueOnce([{ id: 'abc' }])
					.mockResolvedValueOnce([])
					.mockResolvedValue(undefined);

				await importService.recreateDataTableUserTablesFromRegistry(mockEntityManager, {});

				const setvalCalls = (mockEntityManager.query as Mock).mock.calls.filter(
					([sql]) => typeof sql === 'string' && sql.includes('setval('),
				);
				expect(setvalCalls).toHaveLength(0);
			});
		});
	});

	describe('extractSubworkflowId', () => {
		it('should extract workflow ID from legacy string format', () => {
			const node = {
				parameters: { workflowId: 'abc123' },
			};

			// @ts-expect-error accessing private method for testing
			expect(importService.extractSubworkflowId(node)).toBe('abc123');
		});

		it('should extract workflow ID from resource-locator object format', () => {
			const node = {
				parameters: {
					workflowId: { __rl: true, value: 'LCEM9GnTcIVSy1D8', mode: 'list' },
				},
			};

			// @ts-expect-error accessing private method for testing
			expect(importService.extractSubworkflowId(node)).toBe('LCEM9GnTcIVSy1D8');
		});

		it('should return undefined when workflowId is missing', () => {
			const node = {
				parameters: {},
			};

			// @ts-expect-error accessing private method for testing
			expect(importService.extractSubworkflowId(node)).toBeUndefined();
		});
	});

	describe('sortWorkflowsForActivation', () => {
		function makeNode(id: string, type: string, parameters: Record<string, unknown> = {}) {
			return { id, type, parameters, disabled: false } as any;
		}

		function makeExecuteWorkflowNode(id: string, calleeId: string) {
			return makeNode(id, 'n8n-nodes-base.executeWorkflow', {
				workflowId: calleeId,
			});
		}

		function makeWorkflow(id: string, nodes: any[] = []) {
			return { id, nodes } as any;
		}

		function makeToActivate(ids: string[]) {
			return ids.map((id) => ({ workflowId: id, versionId: `v-${id}` }));
		}

		it('should return single workflow unchanged', () => {
			const workflows = [makeWorkflow('A')];
			const toActivate = makeToActivate(['A']);

			// @ts-expect-error accessing private method for testing
			const result = importService.sortWorkflowsForActivation(workflows, toActivate);

			expect(result.map((w) => w.workflowId)).toEqual(['A']);
		});

		it('should activate callee (B) before caller (A) — simple A→B case', () => {
			const workflows = [
				makeWorkflow('A', [makeExecuteWorkflowNode('n1', 'B')]),
				makeWorkflow('B'),
			];
			const toActivate = makeToActivate(['A', 'B']);

			// @ts-expect-error accessing private method for testing
			const result = importService.sortWorkflowsForActivation(workflows, toActivate);

			expect(result.map((w) => w.workflowId)).toEqual(['B', 'A']);
		});

		it('should activate C → B → A for a three-level chain', () => {
			const workflows = [
				makeWorkflow('A', [makeExecuteWorkflowNode('n1', 'B')]),
				makeWorkflow('B', [makeExecuteWorkflowNode('n2', 'C')]),
				makeWorkflow('C'),
			];
			const toActivate = makeToActivate(['A', 'B', 'C']);

			// @ts-expect-error accessing private method for testing
			const result = importService.sortWorkflowsForActivation(workflows, toActivate);

			expect(result.map((w) => w.workflowId)).toEqual(['C', 'B', 'A']);
		});

		it('should activate both B and C before A when A calls both', () => {
			const workflows = [
				makeWorkflow('A', [makeExecuteWorkflowNode('n1', 'B'), makeExecuteWorkflowNode('n2', 'C')]),
				makeWorkflow('B'),
				makeWorkflow('C'),
			];
			const toActivate = makeToActivate(['A', 'B', 'C']);

			// @ts-expect-error accessing private method for testing
			const result = importService.sortWorkflowsForActivation(workflows, toActivate);

			const ids = result.map((w) => w.workflowId);
			expect(ids.indexOf('B')).toBeLessThan(ids.indexOf('A'));
			expect(ids.indexOf('C')).toBeLessThan(ids.indexOf('A'));
			expect(ids).toHaveLength(3);
		});

		it('should ignore referenced workflows not present in the activation batch', () => {
			const workflows = [
				makeWorkflow('A', [makeExecuteWorkflowNode('n1', 'EXTERNAL')]),
				makeWorkflow('B'),
			];
			const toActivate = makeToActivate(['A', 'B']);

			// @ts-expect-error accessing private method for testing
			const result = importService.sortWorkflowsForActivation(workflows, toActivate);

			expect(result).toHaveLength(2);
			expect(result.map((w) => w.workflowId)).toContain('A');
			expect(result.map((w) => w.workflowId)).toContain('B');
		});

		it('should skip disabled executeWorkflow nodes when building the dependency graph', () => {
			const disabledNode = { ...makeExecuteWorkflowNode('n1', 'B'), disabled: true };
			const workflows = [makeWorkflow('A', [disabledNode]), makeWorkflow('B')];
			const toActivate = makeToActivate(['A', 'B']);

			// @ts-expect-error accessing private method for testing
			const result = importService.sortWorkflowsForActivation(workflows, toActivate);

			// A has no active dependencies on B, so order can be anything — just verify both present
			expect(result).toHaveLength(2);
		});

		it('should handle resource-locator workflowId format in nodes', () => {
			const node = makeNode('n1', 'n8n-nodes-base.executeWorkflow', {
				workflowId: { __rl: true, value: 'B', mode: 'list' },
			});
			const workflows = [makeWorkflow('A', [node]), makeWorkflow('B')];
			const toActivate = makeToActivate(['A', 'B']);

			// @ts-expect-error accessing private method for testing
			const result = importService.sortWorkflowsForActivation(workflows, toActivate);

			expect(result.map((w) => w.workflowId)).toEqual(['B', 'A']);
		});

		it('should return original order (fast path) when no workflow references another batch workflow', () => {
			// Both workflows have executeWorkflow nodes, but they point to external IDs not in batch
			const workflows = [
				makeWorkflow('A', [makeExecuteWorkflowNode('n1', 'EXTERNAL_1')]),
				makeWorkflow('B', [makeExecuteWorkflowNode('n2', 'EXTERNAL_2')]),
			];
			const toActivate = makeToActivate(['A', 'B']);

			// @ts-expect-error accessing private method for testing
			const result = importService.sortWorkflowsForActivation(workflows, toActivate);

			// Same reference → fast path returned the original array unchanged
			expect(result).toBe(toActivate);
		});

		it('should return original order (fast path) when no workflows have executeWorkflow nodes', () => {
			const workflows = [makeWorkflow('A'), makeWorkflow('B'), makeWorkflow('C')];
			const toActivate = makeToActivate(['A', 'B', 'C']);

			// @ts-expect-error accessing private method for testing
			const result = importService.sortWorkflowsForActivation(workflows, toActivate);

			expect(result).toBe(toActivate);
		});

		it('should append mutually-cyclic workflows (A↔B) and log a warning', () => {
			const workflows = [
				makeWorkflow('A', [makeExecuteWorkflowNode('n1', 'B')]),
				makeWorkflow('B', [makeExecuteWorkflowNode('n2', 'A')]),
			];
			const toActivate = makeToActivate(['A', 'B']);

			// @ts-expect-error accessing private method for testing
			const result = importService.sortWorkflowsForActivation(workflows, toActivate);

			expect(result).toHaveLength(2);
			expect(result.map((w) => w.workflowId)).toContain('A');
			expect(result.map((w) => w.workflowId)).toContain('B');
			expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('circular'));
		});

		it('should append all workflows in a three-way cycle (A→B→C→A) and log a warning', () => {
			const workflows = [
				makeWorkflow('A', [makeExecuteWorkflowNode('n1', 'B')]),
				makeWorkflow('B', [makeExecuteWorkflowNode('n2', 'C')]),
				makeWorkflow('C', [makeExecuteWorkflowNode('n3', 'A')]),
			];
			const toActivate = makeToActivate(['A', 'B', 'C']);

			// @ts-expect-error accessing private method for testing
			const result = importService.sortWorkflowsForActivation(workflows, toActivate);

			expect(result).toHaveLength(3);
			expect(result.map((w) => w.workflowId)).toContain('A');
			expect(result.map((w) => w.workflowId)).toContain('B');
			expect(result.map((w) => w.workflowId)).toContain('C');
			expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('circular'));
		});

		it('should sort non-cyclic workflows first and append cyclic workflows at the end', () => {
			// D→E: normal dependency, no cycle
			// A↔B: mutual cycle
			const workflows = [
				makeWorkflow('D', [makeExecuteWorkflowNode('n1', 'E')]),
				makeWorkflow('E'),
				makeWorkflow('A', [makeExecuteWorkflowNode('n2', 'B')]),
				makeWorkflow('B', [makeExecuteWorkflowNode('n3', 'A')]),
			];
			const toActivate = makeToActivate(['D', 'E', 'A', 'B']);

			// @ts-expect-error accessing private method for testing
			const result = importService.sortWorkflowsForActivation(workflows, toActivate);

			expect(result).toHaveLength(4);
			const ids = result.map((w) => w.workflowId);
			// E must come before D (normal dependency order)
			expect(ids.indexOf('E')).toBeLessThan(ids.indexOf('D'));
			// A and B are cyclic — they appear after the sorted pair
			expect(ids.indexOf('A')).toBeGreaterThan(ids.indexOf('D'));
			expect(ids.indexOf('B')).toBeGreaterThan(ids.indexOf('D'));
			expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('circular'));
		});
	});

	describe('advanceIdentitySequences', () => {
		it('should run setval for each identity column on Postgres', async () => {
			// @ts-expect-error overriding for the test
			mockDataSource.options = { type: 'postgres' };

			mockEntityManager.query = vi
				.fn()
				// information_schema lookup for "workflow_dependency"
				.mockResolvedValueOnce([{ column_name: 'id' }])
				// setval call returns nothing meaningful
				.mockResolvedValueOnce(undefined)
				// information_schema lookup for "insights_metadata" (has 'metaId')
				.mockResolvedValueOnce([{ column_name: 'metaId' }])
				.mockResolvedValueOnce(undefined)
				// information_schema lookup for "user" (no identity columns)
				.mockResolvedValueOnce([]);

			await importService.advanceIdentitySequences(mockEntityManager, [
				'workflow_dependency',
				'insights_metadata',
				'user',
			]);

			const setvalCalls = (mockEntityManager.query as Mock).mock.calls.filter(
				([sql]) => typeof sql === 'string' && sql.includes('setval('),
			);
			expect(setvalCalls).toHaveLength(2);
			// Quoted table identifier passed through to pg_get_serial_sequence
			// (regclass folds unquoted names to lowercase, so the quoted form is required).
			expect(setvalCalls[0][1]).toEqual(['"workflow_dependency"', 'id']);
			expect(setvalCalls[1][1]).toEqual(['"insights_metadata"', 'metaId']);
		});

		it('should be a no-op on SQLite', async () => {
			// SQLite is the default in beforeEach.
			mockEntityManager.query = vi.fn();

			await importService.advanceIdentitySequences(mockEntityManager, ['workflow_dependency']);

			expect(mockEntityManager.query).not.toHaveBeenCalled();
		});

		it('should be a no-op when no tables are provided', async () => {
			// @ts-expect-error overriding for the test
			mockDataSource.options = { type: 'postgres' };
			mockEntityManager.query = vi.fn();

			await importService.advanceIdentitySequences(mockEntityManager, []);

			expect(mockEntityManager.query).not.toHaveBeenCalled();
		});
	});
});
