import { type Logger } from '@n8n/backend-common';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { type DataSource } from '@n8n/typeorm';
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

	beforeEach(() => {
		jest.clearAllMocks();

		mockLogger = mock<Logger>();
		mockDataSource = mock<DataSource>();
		mockCredentialsRepository = mock<CredentialsRepository>();
		mockTagRepository = mock<TagRepository>();

		importService = new ImportService(
			mockLogger,
			mockCredentialsRepository,
			mockTagRepository,
			mockDataSource,
		);
	});

	describe('generateForeignKeyDisableCommand', () => {
		it('should generate correct SQLite disable command', () => {
			const result = importService.generateForeignKeyDisableCommand('sqlite');
			expect(result).toBe('PRAGMA foreign_keys = OFF;');
		});

		it('should generate correct SQLite pooled disable command', () => {
			const result = importService.generateForeignKeyDisableCommand('sqlite-pooled');
			expect(result).toBe('PRAGMA foreign_keys = OFF;');
		});

		it('should generate correct SQLite memory disable command', () => {
			const result = importService.generateForeignKeyDisableCommand('sqlite-memory');
			expect(result).toBe('PRAGMA foreign_keys = OFF;');
		});

		it('should generate correct PostgreSQL disable command', () => {
			const result = importService.generateForeignKeyDisableCommand('postgres');
			expect(result).toBe('SET session_replication_role = replica;');
		});

		it('should generate correct PostgreSQL disable command with postgresql variant', () => {
			const result = importService.generateForeignKeyDisableCommand('postgresql');
			expect(result).toBe('SET session_replication_role = replica;');
		});

		it('should handle case insensitive database types', () => {
			const result = importService.generateForeignKeyDisableCommand('POSTGRES');
			expect(result).toBe('SET session_replication_role = replica;');
		});

		it('should throw error for unsupported database types', () => {
			expect(() => {
				importService.generateForeignKeyDisableCommand('mysql');
			}).toThrow('Unsupported database type: mysql. Supported types: sqlite, postgres');
		});
	});

	describe('generateForeignKeyEnableCommand', () => {
		it('should generate correct SQLite enable command', () => {
			const result = importService.generateForeignKeyEnableCommand('sqlite');
			expect(result).toBe('PRAGMA foreign_keys = ON;');
		});

		it('should generate correct SQLite pooled enable command', () => {
			const result = importService.generateForeignKeyEnableCommand('sqlite-pooled');
			expect(result).toBe('PRAGMA foreign_keys = ON;');
		});

		it('should generate correct SQLite memory enable command', () => {
			const result = importService.generateForeignKeyEnableCommand('sqlite-memory');
			expect(result).toBe('PRAGMA foreign_keys = ON;');
		});

		it('should generate correct PostgreSQL enable command', () => {
			const result = importService.generateForeignKeyEnableCommand('postgres');
			expect(result).toBe('SET session_replication_role = DEFAULT;');
		});

		it('should generate correct PostgreSQL enable command with postgresql variant', () => {
			const result = importService.generateForeignKeyEnableCommand('postgresql');
			expect(result).toBe('SET session_replication_role = DEFAULT;');
		});

		it('should handle case insensitive database types', () => {
			const result = importService.generateForeignKeyEnableCommand('POSTGRES');
			expect(result).toBe('SET session_replication_role = DEFAULT;');
		});

		it('should throw error for unsupported database types', () => {
			expect(() => {
				importService.generateForeignKeyEnableCommand('mysql');
			}).toThrow('Unsupported database type: mysql. Supported types: sqlite, postgres');
		});
	});

	describe('isTableEmpty', () => {
		it('should return true for empty table', async () => {
			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				from: jest.fn().mockReturnThis(),
				getRawOne: jest.fn().mockResolvedValue({ count: '0' }),
			};

			mockDataSource.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

			const result = await importService.isTableEmpty('users');

			expect(result).toBe(true);
			expect(mockQueryBuilder.select).toHaveBeenCalledWith('COUNT(*)', 'count');
			expect(mockQueryBuilder.from).toHaveBeenCalledWith('users', 'users');
			expect(mockLogger.debug).toHaveBeenCalledWith('Table users has 0 rows');
		});

		it('should return false for non-empty table', async () => {
			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				from: jest.fn().mockReturnThis(),
				getRawOne: jest.fn().mockResolvedValue({ count: '5' }),
			};

			mockDataSource.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

			const result = await importService.isTableEmpty('users');

			expect(result).toBe(false);
			expect(mockLogger.debug).toHaveBeenCalledWith('Table users has 5 rows');
		});

		it('should handle database errors gracefully', async () => {
			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				from: jest.fn().mockReturnThis(),
				getRawOne: jest.fn().mockRejectedValue(new Error('Database connection failed')),
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
				getRawOne: jest.fn().mockResolvedValue({ count: '0' }),
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
				getRawOne: jest
					.fn()
					.mockResolvedValueOnce({ count: '0' }) // users table is empty
					.mockResolvedValueOnce({ count: '5' }), // workflows table has data
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
				getRawOne: jest
					.fn()
					.mockResolvedValueOnce({ count: '3' }) // users table has data
					.mockResolvedValueOnce({ count: '7' }), // workflows table has data
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

			mockDataSource.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

			// @ts-expect-error Protected property
			mockDataSource.options = { type: 'sqlite' };

			await importService.truncateEntityTable('users');

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

			mockDataSource.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);
			// @ts-expect-error Protected property
			mockDataSource.options = { type: 'postgres' };

			await importService.truncateEntityTable('workflows');

			expect(mockQueryBuilder.delete).toHaveBeenCalled();
			expect(mockQueryBuilder.from).toHaveBeenCalledWith('workflows', 'workflows');
			expect(mockQueryBuilder.execute).toHaveBeenCalled();
			expect(mockLogger.info).toHaveBeenCalledWith('🗑️  Truncating table: workflows');
			expect(mockLogger.info).toHaveBeenCalledWith('   ✅ Table workflows truncated successfully');
		});

		it('should throw error for unsupported database types', async () => {
			// @ts-expect-error Protected property
			mockDataSource.options = { type: 'mysql' };

			await expect(importService.truncateEntityTable('users')).rejects.toThrow(
				'Unsupported database type: mysql. Supported types: sqlite, postgres',
			);
		});
	});

	describe('getTableNamesForImport', () => {
		it('should return table names for valid entity files', async () => {
			const mockFiles = ['user.jsonl', 'workflow.jsonl', 'settings.jsonl', 'other.txt'];
			const mockEntityMetadatas = [
				{ name: 'User', tableName: 'user' },
				{ name: 'Workflow', tableName: 'workflow' },
				{ name: 'Settings', tableName: 'settings' },
			];

			(readdir as jest.Mock).mockResolvedValue(mockFiles);
			// @ts-expect-error Protected property
			mockDataSource.entityMetadatas = mockEntityMetadatas;

			const result = await importService.getTableNamesForImport('/test/input');

			expect(result).toEqual(['user', 'workflow', 'settings']);
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

			const result = await importService.getTableNamesForImport('/test/input');

			expect(result).toEqual(['user', 'workflow']);
		});

		it('should skip entities without metadata', async () => {
			const mockFiles = ['user.jsonl', 'unknown.jsonl'];
			const mockEntityMetadatas = [{ name: 'User', tableName: 'user' }];

			(readdir as jest.Mock).mockResolvedValue(mockFiles);
			// @ts-expect-error Protected property
			mockDataSource.entityMetadatas = mockEntityMetadatas;

			const result = await importService.getTableNamesForImport('/test/input');

			expect(result).toEqual(['user']);
			expect(mockLogger.warn).toHaveBeenCalledWith(
				'⚠️  No entity metadata found for unknown, skipping...',
			);
		});

		it('should handle empty directory', async () => {
			(readdir as jest.Mock).mockResolvedValue([]);
			// @ts-expect-error Protected property
			mockDataSource.entityMetadatas = [];

			const result = await importService.getTableNamesForImport('/test/input');

			expect(result).toEqual([]);
		});
	});

	describe('getEntityFiles', () => {
		it('should group entity files by entity name', async () => {
			const mockFiles = ['user.jsonl', 'user.2.jsonl', 'workflow.jsonl', 'other.txt'];
			(readdir as jest.Mock).mockResolvedValue(mockFiles);

			const result = await importService.getEntityFiles('/test/input');

			expect(result.size).toBe(2);
			expect(result.get('user')).toEqual(['/test/input/user.jsonl', '/test/input/user.2.jsonl']);
			expect(result.get('workflow')).toEqual(['/test/input/workflow.jsonl']);
		});

		it('should handle empty directory', async () => {
			(readdir as jest.Mock).mockResolvedValue([]);

			const result = await importService.getEntityFiles('/test/input');

			expect(result.size).toBe(0);
		});

		it('should ignore non-jsonl files', async () => {
			const mockFiles = ['user.jsonl', 'workflow.txt', 'settings.json', 'data.csv'];
			(readdir as jest.Mock).mockResolvedValue(mockFiles);

			const result = await importService.getEntityFiles('/test/input');

			expect(result.size).toBe(1);
			expect(result.get('user')).toEqual(['/test/input/user.jsonl']);
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

			const mockQueryBuilder = {
				insert: jest.fn().mockReturnThis(),
				into: jest.fn().mockReturnThis(),
				values: jest.fn().mockReturnThis(),
				execute: jest.fn().mockResolvedValue({ identifiers: [{ id: 1 }] }),
			};

			(readdir as jest.Mock).mockResolvedValue(mockFiles);
			(readFile as jest.Mock)
				.mockResolvedValueOnce('{"id":1,"name":"User 1"}\n')
				.mockResolvedValueOnce('{"id":1,"name":"Workflow 1"}\n');

			mockDataSource.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

			await importService.importEntitiesFromFiles('/test/input');

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
			(readdir as jest.Mock).mockResolvedValue([]);

			await importService.importEntitiesFromFiles('/test/empty');

			expect(mockLogger.warn).toHaveBeenCalledWith('No entity files found in input directory');
		});

		it('should skip entities without metadata', async () => {
			const mockFiles = ['user.jsonl', 'unknown.jsonl'];
			const mockQueryBuilder = {
				insert: jest.fn().mockReturnThis(),
				into: jest.fn().mockReturnThis(),
				values: jest.fn().mockReturnThis(),
				execute: jest.fn().mockResolvedValue({ identifiers: [{ id: 1 }] }),
			};

			(readdir as jest.Mock).mockResolvedValue(mockFiles);
			(readFile as jest.Mock).mockResolvedValue('{"id":1,"name":"User 1"}\n');
			mockDataSource.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

			await importService.importEntitiesFromFiles('/test/input');

			expect(mockLogger.warn).toHaveBeenCalledWith(
				'   ⚠️  No entity metadata found for unknown, skipping...',
			);
		});

		it('should handle empty entity files', async () => {
			const mockFiles = ['user.jsonl'];
			(readdir as jest.Mock).mockResolvedValue(mockFiles);
			(readFile as jest.Mock).mockResolvedValue(''); // Empty file

			await importService.importEntitiesFromFiles('/test/input');

			expect(mockLogger.info).toHaveBeenCalledWith('      Found 0 entities');
		});
	});

	describe('disableForeignKeyConstraints', () => {
		it('should disable foreign key constraints for SQLite', async () => {
			// @ts-expect-error Protected property
			mockDataSource.options = { type: 'sqlite' };
			mockDataSource.query = jest.fn().mockResolvedValue([]);

			await importService.disableForeignKeyConstraints();

			expect(mockDataSource.query).toHaveBeenCalledWith('PRAGMA foreign_keys = OFF;');
			expect(mockLogger.debug).toHaveBeenCalledWith('Executing: PRAGMA foreign_keys = OFF;');
			expect(mockLogger.info).toHaveBeenCalledWith('✅ Foreign key constraints disabled');
		});

		it('should disable foreign key constraints for PostgreSQL', async () => {
			// @ts-expect-error Protected property
			mockDataSource.options = { type: 'postgres' };
			mockDataSource.query = jest.fn().mockResolvedValue([]);

			await importService.disableForeignKeyConstraints();

			expect(mockDataSource.query).toHaveBeenCalledWith('SET session_replication_role = replica;');
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
			mockDataSource.query = jest.fn().mockResolvedValue([]);

			await importService.enableForeignKeyConstraints();

			expect(mockDataSource.query).toHaveBeenCalledWith('PRAGMA foreign_keys = ON;');
			expect(mockLogger.debug).toHaveBeenCalledWith('Executing: PRAGMA foreign_keys = ON;');
			expect(mockLogger.info).toHaveBeenCalledWith('✅ Foreign key constraints re-enabled');
		});

		it('should enable foreign key constraints for PostgreSQL', async () => {
			// @ts-expect-error Protected property
			mockDataSource.options = { type: 'postgres' };
			mockDataSource.query = jest.fn().mockResolvedValue([]);

			await importService.enableForeignKeyConstraints();

			expect(mockDataSource.query).toHaveBeenCalledWith('SET session_replication_role = DEFAULT;');
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
});
