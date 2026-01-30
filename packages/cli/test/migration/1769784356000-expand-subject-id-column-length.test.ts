import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { nanoid } from 'nanoid';

const MIGRATION_NAME = 'ExpandSubjectIDColumnLength1769784356000';

interface DynamicCredentialEntry {
	credential_id: string;
	subject_id: string;
	resolver_id: string;
	data: string;
}

/**
 * Generate parameter placeholders for a given context and count.
 * PostgreSQL uses $1, $2, ... while MySQL/SQLite use ?
 */
function getParamPlaceholders(context: TestMigrationContext, count: number): string {
	if (context.isPostgres) {
		return Array.from({ length: count }, (_, i) => `$${i + 1}`).join(', ');
	}
	return Array.from({ length: count }, () => '?').join(', ');
}

/**
 * Generate a single parameter placeholder for WHERE clauses
 */
function getParamPlaceholder(context: TestMigrationContext, index = 1): string {
	return context.isPostgres ? `$${index}` : '?';
}

describe('ExpandSubjectIDColumnLength Migration', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();

		dataSource = Container.get(DataSource);
		const context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.close();
	});

	/**
	 * Helper to get column data type from database schema
	 */
	async function getColumnType(
		context: TestMigrationContext,
		tableName: string,
		columnName: string,
	): Promise<string> {
		if (context.isPostgres) {
			const result = await context.queryRunner.query(
				`SELECT data_type, character_maximum_length
				 FROM information_schema.columns
				 WHERE table_name = $1 AND column_name = $2`,
				[`${context.tablePrefix}${tableName}`, columnName],
			);
			return `${result[0]?.data_type}(${result[0]?.character_maximum_length})`;
		} else if (context.isSqlite) {
			const result = await context.queryRunner.query(
				`PRAGMA table_info(${context.escape.tableName(tableName)})`,
			);
			const column = result.find((col: { name: string }) => col.name === columnName);
			return column?.type || 'unknown';
		}
		return 'unknown';
	}

	/**
	 * Helper to check if primary key constraint exists
	 */
	async function getPrimaryKeyColumns(
		context: TestMigrationContext,
		tableName: string,
	): Promise<string[]> {
		if (context.isPostgres) {
			const result = await context.queryRunner.query(
				`SELECT a.attname as column_name
				 FROM pg_index i
				 JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
				 WHERE i.indrelid = $1::regclass AND i.indisprimary`,
				[`${context.tablePrefix}${tableName}`],
			);
			return result.map((row: { column_name: string }) => row.column_name);
		} else if (context.isSqlite) {
			const result = await context.queryRunner.query(
				`PRAGMA table_info(${context.escape.tableName(tableName)})`,
			);
			return result
				.filter((col: { pk: number }) => col.pk > 0)
				.sort((a: { pk: number }, b: { pk: number }) => a.pk - b.pk)
				.map((col: { name: string }) => col.name);
		}
		return [];
	}

	/**
	 * Helper to check if foreign key constraints exist
	 */
	async function getForeignKeys(
		context: TestMigrationContext,
		tableName: string,
	): Promise<Array<{ from: string; table: string; to: string }>> {
		if (context.isPostgres) {
			const result = await context.queryRunner.query(
				`SELECT
					kcu.column_name as "from",
					ccu.table_name as "table",
					ccu.column_name as "to"
				 FROM information_schema.table_constraints AS tc
				 JOIN information_schema.key_column_usage AS kcu
				   ON tc.constraint_name = kcu.constraint_name
				   AND tc.table_schema = kcu.table_schema
				 JOIN information_schema.constraint_column_usage AS ccu
				   ON ccu.constraint_name = tc.constraint_name
				   AND ccu.table_schema = tc.table_schema
				 WHERE tc.constraint_type = 'FOREIGN KEY'
				   AND tc.table_name = $1`,
				[`${context.tablePrefix}${tableName}`],
			);
			return result.map((row: { from: string; table: string; to: string }) => ({
				from: row.from,
				table: row.table.replace(context.tablePrefix, ''),
				to: row.to,
			}));
		} else if (context.isSqlite) {
			const result = await context.queryRunner.query(
				`PRAGMA foreign_key_list(${context.escape.tableName(tableName)})`,
			);
			return result.map((fk: { from: string; table: string; to: string }) => ({
				from: fk.from,
				table: fk.table,
				to: fk.to,
			}));
		}
		return [];
	}

	/**
	 * Helper to insert test credentials (prerequisite)
	 */
	async function insertTestCredential(
		context: TestMigrationContext,
		credentialId: string,
	): Promise<void> {
		const tableName = context.escape.tableName('credentials_entity');
		const idColumn = context.escape.columnName('id');
		const nameColumn = context.escape.columnName('name');
		const dataColumn = context.escape.columnName('data');
		const typeColumn = context.escape.columnName('type');
		const createdAtColumn = context.escape.columnName('createdAt');
		const updatedAtColumn = context.escape.columnName('updatedAt');

		const placeholders = getParamPlaceholders(context, 6);
		await context.queryRunner.query(
			`INSERT INTO ${tableName} (${idColumn}, ${nameColumn}, ${dataColumn}, ${typeColumn}, ${createdAtColumn}, ${updatedAtColumn})
			 VALUES (${placeholders})`,
			[credentialId, 'Test Credential', '{}', 'testType', new Date(), new Date()],
		);
	}

	/**
	 * Helper to insert test resolver (prerequisite)
	 */
	async function insertTestResolver(
		context: TestMigrationContext,
		resolverId: string,
	): Promise<void> {
		const tableName = context.escape.tableName('dynamic_credential_resolver');
		const idColumn = context.escape.columnName('id');
		const nameColumn = context.escape.columnName('name');
		const typeColumn = context.escape.columnName('type');
		const configColumn = context.escape.columnName('config');
		const createdAtColumn = context.escape.columnName('createdAt');
		const updatedAtColumn = context.escape.columnName('updatedAt');

		const placeholders = getParamPlaceholders(context, 6);
		await context.queryRunner.query(
			`INSERT INTO ${tableName} (${idColumn}, ${nameColumn}, ${typeColumn}, ${configColumn}, ${createdAtColumn}, ${updatedAtColumn})
			 VALUES (${placeholders})`,
			[resolverId, 'Test Resolver', 'TestResolverClass', '', new Date(), new Date()],
		);
	}

	/**
	 * Helper to insert dynamic credential entry
	 */
	async function insertDynamicCredentialEntry(
		context: TestMigrationContext,
		entry: DynamicCredentialEntry,
	): Promise<void> {
		const tableName = context.escape.tableName('dynamic_credential_entry');
		const credentialIdColumn = context.escape.columnName('credential_id');
		const subjectIdColumn = context.escape.columnName('subject_id');
		const resolverIdColumn = context.escape.columnName('resolver_id');
		const dataColumn = context.escape.columnName('data');
		const createdAtColumn = context.escape.columnName('createdAt');
		const updatedAtColumn = context.escape.columnName('updatedAt');

		const placeholders = getParamPlaceholders(context, 6);
		await context.queryRunner.query(
			`INSERT INTO ${tableName} (${credentialIdColumn}, ${subjectIdColumn}, ${resolverIdColumn}, ${dataColumn}, ${createdAtColumn}, ${updatedAtColumn})
			 VALUES (${placeholders})`,
			[
				entry.credential_id,
				entry.subject_id,
				entry.resolver_id,
				entry.data,
				new Date(),
				new Date(),
			],
		);
	}

	/**
	 * Helper to get dynamic credential entries
	 */
	async function getDynamicCredentialEntry(
		context: TestMigrationContext,
		credentialId: string,
		subjectId: string,
		resolverId: string,
	): Promise<DynamicCredentialEntry | null> {
		const tableName = context.escape.tableName('dynamic_credential_entry');
		const credentialIdColumn = context.escape.columnName('credential_id');
		const subjectIdColumn = context.escape.columnName('subject_id');
		const resolverIdColumn = context.escape.columnName('resolver_id');
		const dataColumn = context.escape.columnName('data');

		const result = await context.queryRunner.query(
			`SELECT ${credentialIdColumn} as credential_id,
					${subjectIdColumn} as subject_id,
					${resolverIdColumn} as resolver_id,
					${dataColumn} as data
			 FROM ${tableName}
			 WHERE ${credentialIdColumn} = ${getParamPlaceholder(context, 1)}
			   AND ${subjectIdColumn} = ${getParamPlaceholder(context, 2)}
			   AND ${resolverIdColumn} = ${getParamPlaceholder(context, 3)}`,
			[credentialId, subjectId, resolverId],
		);

		return result[0] || null;
	}

	describe('up migration', () => {
		it('should preserve all data during migration', async () => {
			const context = createTestMigrationContext(dataSource);

			// Create test data
			const credentialId = nanoid(16);
			const resolverId = nanoid(16);

			// Test with various subject_id values
			const testEntries: DynamicCredentialEntry[] = [
				{
					credential_id: credentialId,
					subject_id: 'short-id',
					resolver_id: resolverId,
					data: JSON.stringify({ test: 'data1' }),
				},
				{
					credential_id: credentialId,
					subject_id: '1234567890123456', // Max length for varchar(16)
					resolver_id: resolverId,
					data: JSON.stringify({ test: 'data2' }),
				},
			];

			// Insert prerequisites
			await insertTestCredential(context, credentialId);
			await insertTestResolver(context, resolverId);

			// Insert test entries
			for (const entry of testEntries) {
				await insertDynamicCredentialEntry(context, entry);
			}

			// Verify pre-migration data
			const beforeMigration1 = await getDynamicCredentialEntry(
				context,
				testEntries[0].credential_id,
				testEntries[0].subject_id,
				testEntries[0].resolver_id,
			);
			expect(beforeMigration1).toBeDefined();
			expect(beforeMigration1?.data).toBe(testEntries[0].data);

			const beforeMigration2 = await getDynamicCredentialEntry(
				context,
				testEntries[1].credential_id,
				testEntries[1].subject_id,
				testEntries[1].resolver_id,
			);
			expect(beforeMigration2).toBeDefined();
			expect(beforeMigration2?.data).toBe(testEntries[1].data);

			await context.queryRunner.release();

			// Run migration
			await runSingleMigration(MIGRATION_NAME);

			// Create fresh context after migration
			const postContext = createTestMigrationContext(dataSource);

			// Verify data is preserved
			const afterMigration1 = await getDynamicCredentialEntry(
				postContext,
				testEntries[0].credential_id,
				testEntries[0].subject_id,
				testEntries[0].resolver_id,
			);
			expect(afterMigration1).toBeDefined();
			expect(afterMigration1?.subject_id).toBe(testEntries[0].subject_id);
			expect(afterMigration1?.data).toBe(testEntries[0].data);

			const afterMigration2 = await getDynamicCredentialEntry(
				postContext,
				testEntries[1].credential_id,
				testEntries[1].subject_id,
				testEntries[1].resolver_id,
			);
			expect(afterMigration2).toBeDefined();
			expect(afterMigration2?.subject_id).toBe(testEntries[1].subject_id);
			expect(afterMigration2?.data).toBe(testEntries[1].data);

			await postContext.queryRunner.release();
		});

		it('should change subject_id column type from varchar(16) to varchar(2048)', async () => {
			await runSingleMigration(MIGRATION_NAME);

			const context = createTestMigrationContext(dataSource);

			// Check column type after migration
			const columnType = await getColumnType(context, 'dynamic_credential_entry', 'subject_id');

			if (context.isPostgres) {
				expect(columnType).toBe('character varying(2048)');
			} else if (context.isSqlite) {
				expect(columnType.toUpperCase()).toBe('VARCHAR(2048)');
			}

			await context.queryRunner.release();
		});

		it('should preserve composite primary key constraint', async () => {
			await runSingleMigration(MIGRATION_NAME);

			const context = createTestMigrationContext(dataSource);

			// Check primary key columns
			const pkColumns = await getPrimaryKeyColumns(context, 'dynamic_credential_entry');

			expect(pkColumns).toHaveLength(3);
			expect(pkColumns).toContain('credential_id');
			expect(pkColumns).toContain('subject_id');
			expect(pkColumns).toContain('resolver_id');

			await context.queryRunner.release();
		});

		it('should preserve foreign key constraints', async () => {
			await runSingleMigration(MIGRATION_NAME);

			const context = createTestMigrationContext(dataSource);

			// Check foreign keys
			const foreignKeys = await getForeignKeys(context, 'dynamic_credential_entry');

			// Should have 2 foreign keys
			expect(foreignKeys.length).toBeGreaterThanOrEqual(2);

			// Check credential_id FK
			const credentialFk = foreignKeys.find((fk) => fk.from === 'credential_id');
			expect(credentialFk).toBeDefined();
			expect(credentialFk?.table).toBe('credentials_entity');
			expect(credentialFk?.to).toBe('id');

			// Check resolver_id FK
			const resolverFk = foreignKeys.find((fk) => fk.from === 'resolver_id');
			expect(resolverFk).toBeDefined();
			expect(resolverFk?.table).toBe('dynamic_credential_resolver');
			expect(resolverFk?.to).toBe('id');

			await context.queryRunner.release();
		});

		it('should allow inserting subject_id values longer than 16 characters after migration', async () => {
			await runSingleMigration(MIGRATION_NAME);

			const context = createTestMigrationContext(dataSource);

			const credentialId = nanoid(16);
			const resolverId = nanoid(16);

			await insertTestCredential(context, credentialId);
			await insertTestResolver(context, resolverId);

			// Insert entry with long subject_id (> 16 characters)
			const longSubjectId = 'this-is-a-very-long-subject-id-that-exceeds-16-characters-by-a-lot';
			const entry: DynamicCredentialEntry = {
				credential_id: credentialId,
				subject_id: longSubjectId,
				resolver_id: resolverId,
				data: JSON.stringify({ test: 'long-id-data' }),
			};

			await insertDynamicCredentialEntry(context, entry);

			// Verify the long subject_id was stored correctly
			const retrieved = await getDynamicCredentialEntry(
				context,
				credentialId,
				longSubjectId,
				resolverId,
			);

			expect(retrieved).toBeDefined();
			expect(retrieved?.subject_id).toBe(longSubjectId);
			expect(retrieved?.subject_id.length).toBeGreaterThan(16);

			await context.queryRunner.release();
		});

		it('should maintain primary key uniqueness constraint', async () => {
			await runSingleMigration(MIGRATION_NAME);

			const context = createTestMigrationContext(dataSource);

			const credentialId = nanoid(16);
			const resolverId = nanoid(16);
			const subjectId = 'duplicate-test-id';

			await insertTestCredential(context, credentialId);
			await insertTestResolver(context, resolverId);

			// Insert first entry
			await insertDynamicCredentialEntry(context, {
				credential_id: credentialId,
				subject_id: subjectId,
				resolver_id: resolverId,
				data: JSON.stringify({ test: 'first' }),
			});

			// Try to insert duplicate - should fail
			await expect(
				insertDynamicCredentialEntry(context, {
					credential_id: credentialId,
					subject_id: subjectId,
					resolver_id: resolverId,
					data: JSON.stringify({ test: 'duplicate' }),
				}),
			).rejects.toThrow();

			await context.queryRunner.release();
		});

		it('should copy all data correctly in batches (101 rows to test batch copying)', async () => {
			const context = createTestMigrationContext(dataSource);

			const credentialId = nanoid(16);
			const resolverId = nanoid(16);

			await insertTestCredential(context, credentialId);
			await insertTestResolver(context, resolverId);

			// Generate 101 test entries to verify batch copying (copyTable uses batches of 10)
			const testEntries: DynamicCredentialEntry[] = [];
			for (let i = 0; i < 101; i++) {
				testEntries.push({
					credential_id: credentialId,
					subject_id: `subject-${i.toString().padStart(3, '0')}`,
					resolver_id: resolverId,
					data: JSON.stringify({ index: i, test: `data-${i}` }),
				});
			}

			// Insert all test entries before migration
			for (const entry of testEntries) {
				await insertDynamicCredentialEntry(context, entry);
			}

			// Verify all entries exist before migration
			const tableName = context.escape.tableName('dynamic_credential_entry');
			const credentialIdColumn = context.escape.columnName('credential_id');
			const placeholder = getParamPlaceholder(context);
			const beforeCount = await context.queryRunner.query(
				`SELECT COUNT(*) as count FROM ${tableName} WHERE ${credentialIdColumn} = ${placeholder}`,
				[credentialId],
			);
			expect(Number(beforeCount[0].count)).toBe(101);

			await context.queryRunner.release();

			// Run migration
			await runSingleMigration(MIGRATION_NAME);

			// Create fresh context after migration
			const postContext = createTestMigrationContext(dataSource);

			// Verify all 101 entries still exist after migration
			const afterCount = await postContext.queryRunner.query(
				`SELECT COUNT(*) as count FROM ${tableName} WHERE ${credentialIdColumn} = ${placeholder}`,
				[credentialId],
			);
			expect(Number(afterCount[0].count)).toBe(101);

			// Verify each entry's data is intact
			for (const originalEntry of testEntries) {
				const retrieved = await getDynamicCredentialEntry(
					postContext,
					originalEntry.credential_id,
					originalEntry.subject_id,
					originalEntry.resolver_id,
				);

				expect(retrieved).toBeDefined();
				expect(retrieved?.subject_id).toBe(originalEntry.subject_id);
				expect(retrieved?.data).toBe(originalEntry.data);

				// Verify the parsed data
				const parsedData = JSON.parse(retrieved?.data || '{}');
				const originalData = JSON.parse(originalEntry.data);
				expect(parsedData.index).toBe(originalData.index);
				expect(parsedData.test).toBe(originalData.test);
			}

			await postContext.queryRunner.release();
		});
	});
});
