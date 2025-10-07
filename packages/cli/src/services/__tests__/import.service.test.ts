import { safeJoinPath, type Logger } from '@n8n/backend-common';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { type DataSource, type EntityManager } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';
import { readdir, readFile } from 'fs/promises';
import type { Cipher } from 'n8n-core';

import { ImportService } from '../import.service';
import type { CredentialsRepository, TagRepository } from '@n8n/db';
import type { ActiveWorkflowManager } from '@/active-workflow-manager';

// Mock fs/promises
jest.mock('fs/promises');

jest.mock('@/utils/compression.util');

jest.mock('@n8n/backend-common', () => ({
	safeJoinPath: jest.fn(),
}));

// Mock @n8n/db
jest.mock('@n8n/db', () => ({
	CredentialsRepository: mock<CredentialsRepository>(),
	TagRepository: mock<TagRepository>(),
	DataSource: mock<DataSource>(),
}));

jest.mock('@/active-workflow-manager', () => ({
	ActiveWorkflowManager: mock<ActiveWorkflowManager>(),
}));

describe('ImportService', () => {
	let importService: ImportService;
	let mockLogger: Logger;
	let mockDataSource: DataSource;
	let mockCredentialsRepository: CredentialsRepository;
	let mockTagRepository: TagRepository;
	let mockEntityManager: EntityManager;
	let mockCipher: Cipher;
	let mockActiveWorkflowManager: ActiveWorkflowManager;

	beforeEach(() => {
		jest.clearAllMocks();

		mockLogger = mock<Logger>();
		mockDataSource = mock<DataSource>();
		mockCredentialsRepository = mock<CredentialsRepository>();
		mockTagRepository = mock<TagRepository>();
		mockEntityManager = mock<EntityManager>();
		mockCipher = mock<Cipher>();
		mockActiveWorkflowManager = mock<ActiveWorkflowManager>();

		// Set up cipher mock
		mockCipher.decrypt = jest.fn((data: string) => data.replace('encrypted:', ''));

		// Set up dataSource mocks
		// @ts-expect-error Accessing private property for testing
		mockDataSource.options = { type: 'sqlite' };
		mockDataSource.driver = {
			escape: jest.fn((identifier: string) => `"${identifier}"`),
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
		mockEntityManager.createQueryBuilder = jest.fn().mockReturnValue({
			delete: jest.fn().mockReturnThis(),
			from: jest.fn().mockReturnThis(),
			execute: jest.fn().mockResolvedValue(undefined),
		});
		mockEntityManager.query = jest.fn().mockResolvedValue(undefined);
		mockEntityManager.insert = jest.fn().mockResolvedValue(undefined);

		// Mock transaction method
		mockDataSource.transaction = jest.fn().mockImplementation(async (callback) => {
			return await callback(mockEntityManager);
		});

		importService = new ImportService(
			mockLogger,
			mockCredentialsRepository,
			mockTagRepository,
			mockDataSource,
			mockCipher,
			mockActiveWorkflowManager,
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
			expect(mockDataSource.createQueryBuilder).toHaveBeenCalledTimes(2);
		});

		it('should return false when any table has data', async () => {
			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				from: jest.fn().mockReturnThis(),
				limit: jest.fn().mockReturnThis(),
				getRawMany: jest
					.fn()
					.mockResolvedValueOnce([]) // First table empty
					.mockResolvedValueOnce([{ id: 1 }]), // Second table has data
			};

			mockDataSource.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

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
				select: jest.fn().mockReturnThis(),
				from: jest.fn().mockReturnThis(),
				limit: jest.fn().mockReturnThis(),
				getRawMany: jest
					.fn()
					.mockResolvedValueOnce([{ id: 1 }]) // First table has data
					.mockResolvedValueOnce([{ id: 2 }]), // Second table has data
			};

			mockDataSource.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

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
				delete: jest.fn().mockReturnThis(),
				from: jest.fn().mockReturnThis(),
				execute: jest.fn().mockRejectedValue(new Error('Database error')),
			};
			mockEntityManager.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

			await expect(importService.truncateEntityTable('users', mockEntityManager)).rejects.toThrow(
				'Database error',
			);
		});
	});

	describe('getImportMetadata', () => {
		it('should return complete import metadata for valid entity files', async () => {
			const mockFiles = ['user.jsonl', 'workflowentity.jsonl', 'migrations.jsonl'];

			jest.mocked(readdir).mockResolvedValue(mockFiles as any);
			jest
				.mocked(safeJoinPath)
				.mockReturnValueOnce('/test/input/user.jsonl')
				.mockReturnValueOnce('/test/input/workflowentity.jsonl');

			const result = await importService.getImportMetadata('/test/input');

			expect(result).toEqual({
				entityFiles: {
					user: ['/test/input/user.jsonl'],
					workflowentity: ['/test/input/workflowentity.jsonl'],
				},
				tableNames: ['user', 'workflow_entity'],
			});
		});

		it('should handle numbered entity files', async () => {
			const mockFiles = ['user.jsonl', 'user.2.jsonl', 'user.3.jsonl'];

			jest.mocked(readdir).mockResolvedValue(mockFiles as any);
			jest
				.mocked(safeJoinPath)
				.mockReturnValueOnce('/test/input/user.jsonl')
				.mockReturnValueOnce('/test/input/user.2.jsonl')
				.mockReturnValueOnce('/test/input/user.3.jsonl');

			const result = await importService.getImportMetadata('/test/input');

			expect(result).toEqual({
				entityFiles: {
					user: ['/test/input/user.jsonl', '/test/input/user.2.jsonl', '/test/input/user.3.jsonl'],
				},
				tableNames: ['user'],
			});
		});

		it('should skip entities without metadata', async () => {
			const mockFiles = ['unknown.jsonl', 'invalid.txt'];

			jest.mocked(readdir).mockResolvedValue(mockFiles as any);

			const result = await importService.getImportMetadata('/test/input');

			expect(result).toEqual({
				entityFiles: {},
				tableNames: [],
			});
		});

		it('should handle empty directory', async () => {
			jest.mocked(readdir).mockResolvedValue([]);

			const result = await importService.getImportMetadata('/test/input');

			expect(result).toEqual({
				entityFiles: {},
				tableNames: [],
			});
		});

		it('should ignore non-jsonl files', async () => {
			const mockFiles = ['user.txt', 'user.json', 'user.csv'];

			jest.mocked(readdir).mockResolvedValue(mockFiles as any);

			const result = await importService.getImportMetadata('/test/input');

			expect(result).toEqual({
				entityFiles: {},
				tableNames: [],
			});
		});

		it('should exclude migrations from import metadata', async () => {
			const mockFiles = ['user.jsonl', 'migrations.jsonl'];

			jest.mocked(readdir).mockResolvedValue(mockFiles as any);

			jest.mocked(safeJoinPath).mockReturnValue('/test/input/user.jsonl');

			const result = await importService.getImportMetadata('/test/input');

			expect(result).toEqual({
				entityFiles: {
					user: ['/test/input/user.jsonl'],
				},
				tableNames: ['user'],
			});
		});
	});

	describe('readEntityFile', () => {
		it('should parse valid JSONL file', async () => {
			const mockContent = '{"id":1,"name":"Test"}\n{"id":2,"name":"Test2"}';
			jest.mocked(readFile).mockResolvedValue(mockContent);

			const result = await importService.readEntityFile('/test/data.jsonl');

			expect(result).toEqual([
				{ id: 1, name: 'Test' },
				{ id: 2, name: 'Test2' },
			]);
			expect(mockCipher.decrypt).toHaveBeenCalledWith('{"id":1,"name":"Test"}');
			expect(mockCipher.decrypt).toHaveBeenCalledWith('{"id":2,"name":"Test2"}');
		});

		it('should handle empty lines in JSONL file', async () => {
			const mockContent = '{"id":1,"name":"Test"}\n\n{"id":2,"name":"Test2"}\n';
			jest.mocked(readFile).mockResolvedValue(mockContent);

			const result = await importService.readEntityFile('/test/data.jsonl');

			expect(result).toEqual([
				{ id: 1, name: 'Test' },
				{ id: 2, name: 'Test2' },
			]);
		});

		it('should handle Windows line endings', async () => {
			const mockContent = '{"id":1,"name":"Test"}\r\n{"id":2,"name":"Test2"}';
			jest.mocked(readFile).mockResolvedValue(mockContent);

			const result = await importService.readEntityFile('/test/data.jsonl');

			expect(result).toEqual([
				{ id: 1, name: 'Test' },
				{ id: 2, name: 'Test2' },
			]);
		});

		it('should handle empty file', async () => {
			const mockContent = '';
			jest.mocked(readFile).mockResolvedValue(mockContent);

			const result = await importService.readEntityFile('/test/data.jsonl');

			expect(result).toEqual([]);
		});

		it('should throw error for invalid JSON', async () => {
			const mockContent = '{"id":1,"name":"Test"}\n{invalid json}';
			jest.mocked(readFile).mockResolvedValue(mockContent);

			await expect(importService.readEntityFile('/test/invalid.jsonl')).rejects.toThrow(
				'Invalid JSON on line 1 in file /test/invalid.jsonl. JSONL format requires one complete JSON object per line.',
			);
		});

		it('should handle file read errors', async () => {
			jest.mocked(readFile).mockRejectedValue(new Error('File not found'));

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

			mockDataSource.driver.escapeQueryWithParameters = jest
				.fn()
				.mockReturnValue(['INSERT COMMAND', { data: 'data' }]);

			const mockEntities = [{ id: 1, name: 'Test User' }];
			const mockContent = JSON.stringify(mockEntities[0]);
			jest.mocked(readFile).mockResolvedValue(mockContent);

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
			jest.mocked(readFile).mockResolvedValue(mockContent);

			await importService.importEntitiesFromFiles(
				'/test/input',
				mockEntityManager,
				Object.keys(importMetadata.entityFiles),
				importMetadata.entityFiles,
			);

			expect(readFile).toHaveBeenCalledWith('/test/input/user.jsonl', 'utf8');
			expect(mockEntityManager.insert).not.toHaveBeenCalled();
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
				'SET session_replication_role = DEFAULT;',
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
			mockCredentialsRepository.findOneBy = jest.fn().mockResolvedValue(mockCredential);

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

			mockCredentialsRepository.findOneBy = jest.fn().mockResolvedValue(null);

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
			jest
				.mocked(readFile)
				.mockResolvedValue('{"id":"1","timestamp":"123","name":"TestMigration"}');
			// @ts-expect-error Accessing private property for testing
			mockDataSource.options = { type: 'sqlite' };
		});

		it('should throw error when migrations file is missing', async () => {
			jest.mocked(readFile).mockRejectedValue(new Error('ENOENT: no such file or directory'));

			await expect(importService.validateMigrations('/test/input')).rejects.toThrow(
				'Migrations file not found. Cannot proceed with import without migration validation.',
			);
		});

		it('should throw error when migrations file contains invalid JSON', async () => {
			const invalidJsonContent = '{invalid json}';
			jest.mocked(readFile).mockResolvedValue(invalidJsonContent);

			await expect(importService.validateMigrations('/test/input')).rejects.toThrow(
				'Invalid JSON in migrations file:',
			);
		});

		it('should handle empty migrations file gracefully', async () => {
			const emptyContent = '';
			jest.mocked(readFile).mockResolvedValue(emptyContent);

			// Empty content should not throw an error as it results in empty migrations array
			await expect(importService.validateMigrations('/test/input')).resolves.not.toThrow();
		});

		it('should handle migrations file with only whitespace', async () => {
			const whitespaceContent = '   \n  \t  ';
			jest.mocked(readFile).mockResolvedValue(whitespaceContent);

			// Whitespace content should not throw an error
			await expect(importService.validateMigrations('/test/input')).resolves.not.toThrow();
		});

		it('should throw error when target database has no migrations', async () => {
			const migrationsContent = '{"id":"1","timestamp":"123","name":"TestMigration"}';
			jest.mocked(readFile).mockResolvedValue(migrationsContent);
			jest.mocked(mockDataSource.query).mockResolvedValue([]);

			await expect(importService.validateMigrations('/test/input')).rejects.toThrow(
				'Target database has no migrations. Cannot import data from a different migration state.',
			);
		});

		it('should throw error when migration timestamps do not match', async () => {
			const migrationsContent = '{"id":"1","timestamp":"1000","name":"TestMigration"}';
			const dbMigrations = [{ id: '1', timestamp: '2000', name: 'TestMigration' }];

			jest.mocked(readFile).mockResolvedValue(migrationsContent);
			jest.mocked(mockDataSource.query).mockResolvedValue(dbMigrations);

			await expect(importService.validateMigrations('/test/input')).rejects.toThrow(
				'Migration timestamp mismatch. Import data: TestMigration (1000) does not match target database TestMigration (2000). Cannot import data from different migration states.',
			);
		});

		it('should throw error when migration names do not match', async () => {
			const migrationsContent = '{"id":"1","timestamp":"1000","name":"ImportMigration"}';
			const dbMigrations = [{ id: '1', timestamp: '1000', name: 'DbMigration' }];

			jest.mocked(readFile).mockResolvedValue(migrationsContent);
			jest.mocked(mockDataSource.query).mockResolvedValue(dbMigrations);

			await expect(importService.validateMigrations('/test/input')).rejects.toThrow(
				'Migration name mismatch. Import data: ImportMigration does not match target database DbMigration. Cannot import data from different migration states.',
			);
		});

		it('should throw error when migration IDs do not match', async () => {
			const migrationsContent = '{"id":"001","timestamp":"1000","name":"TestMigration"}';
			const dbMigrations = [{ id: '002', timestamp: '1000', name: 'TestMigration' }];

			jest.mocked(readFile).mockResolvedValue(migrationsContent);
			jest.mocked(mockDataSource.query).mockResolvedValue(dbMigrations);

			await expect(importService.validateMigrations('/test/input')).rejects.toThrow(
				'Migration ID mismatch. Import data: TestMigration (id: 001) does not match target database TestMigration (id: 002). Cannot import data from different migration states.',
			);
		});

		it('should pass validation when migrations match exactly', async () => {
			const migrationsContent = '{"id":"1","timestamp":"1000","name":"TestMigration"}';
			const dbMigrations = [{ id: '1', timestamp: '1000', name: 'TestMigration' }];

			jest.mocked(readFile).mockResolvedValue(migrationsContent);
			jest.mocked(mockDataSource.query).mockResolvedValue(dbMigrations);

			await expect(importService.validateMigrations('/test/input')).resolves.not.toThrow();
		});

		it('should throw error when migration IDs have different formats', async () => {
			const migrationsContent = '{"id":"001","timestamp":"1000","name":"TestMigration"}';
			const dbMigrations = [{ id: '1', timestamp: '1000', name: 'TestMigration' }];

			jest.mocked(readFile).mockResolvedValue(migrationsContent);
			jest.mocked(mockDataSource.query).mockResolvedValue(dbMigrations);

			await expect(importService.validateMigrations('/test/input')).rejects.toThrow(
				'Migration ID mismatch. Import data: TestMigration (id: 001) does not match target database TestMigration (id: 1). Cannot import data from different migration states.',
			);
		});

		it('should handle multiple migrations and find the latest one', async () => {
			const migrationsContent = '{"id":"2","timestamp":"2000","name":"LatestMigration"}';
			const dbMigrations = [
				{ id: '1', timestamp: '1000', name: 'FirstMigration' },
				{ id: '2', timestamp: '2000', name: 'LatestMigration' },
			];

			jest.mocked(readFile).mockResolvedValue(migrationsContent);
			jest.mocked(mockDataSource.query).mockResolvedValue(dbMigrations);

			await expect(importService.validateMigrations('/test/input')).rejects.toThrow();
		});

		it('should handle database query errors gracefully', async () => {
			const migrationsContent = '{"id":"1","timestamp":"1000","name":"TestMigration"}';
			jest.mocked(readFile).mockResolvedValue(migrationsContent);
			jest.mocked(mockDataSource.query).mockRejectedValue(new Error('Database connection failed'));

			await expect(importService.validateMigrations('/test/input')).rejects.toThrow(
				'Database connection failed',
			);
		});

		it('should handle migrations with table prefix', async () => {
			const migrationsContent = '{"id":"1","timestamp":"1000","name":"TestMigration"}';
			const dbMigrations = [{ id: '1', timestamp: '1000', name: 'TestMigration' }];

			// @ts-expect-error Accessing private property for testing
			mockDataSource.options = { type: 'sqlite', entityPrefix: 'n8n_' };

			jest.mocked(readFile).mockResolvedValue(migrationsContent);
			jest.mocked(mockDataSource.query).mockResolvedValue(dbMigrations);

			await expect(importService.validateMigrations('/test/input')).resolves.not.toThrow();

			expect(mockDataSource.query).toHaveBeenCalledWith(
				'SELECT * FROM "n8n_migrations" ORDER BY timestamp DESC LIMIT 1',
			);
		});

		it('should handle migrations with mixed line endings', async () => {
			const migrationsContent =
				'{"id":"1","timestamp":"1000","name":"TestMigration"}\r\n{"id":"2","timestamp":"2000","name":"TestMigration2"}';
			const dbMigrations = [{ id: '2', timestamp: '2000', name: 'TestMigration2' }];

			jest.mocked(readFile).mockResolvedValue(migrationsContent);
			jest.mocked(mockDataSource.query).mockResolvedValue(dbMigrations);

			await expect(importService.validateMigrations('/test/input')).resolves.not.toThrow();
		});
	});

	describe('decompressEntitiesZip', () => {
		it('should decompress entities.zip successfully when file exists', async () => {
			const inputDir = '/test/input';
			const entitiesZipPath = '/test/input/entities.zip';

			// Mock fs module
			const mockExistsSync = jest.fn().mockReturnValue(true);
			jest.mock('fs', () => ({
				existsSync: mockExistsSync,
			}));

			// Mock decompressFolder
			const mockDecompressFolder = jest.fn().mockResolvedValue(undefined);
			jest.mock('@/utils/compression.util', () => ({
				decompressFolder: mockDecompressFolder,
			}));

			jest.mocked(safeJoinPath).mockReturnValue(entitiesZipPath);

			// @ts-expect-error For testing purposes
			await importService.decompressEntitiesZip(inputDir);

			expect(mockLogger.info).toHaveBeenCalledWith(
				`\n🗜️  Found entities.zip file, decompressing to ${inputDir}...`,
			);
			expect(mockLogger.info).toHaveBeenCalledWith('✅ Successfully decompressed entities.zip');
		});
	});
});
