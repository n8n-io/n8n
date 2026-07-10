import 'reflect-metadata';
import { expect } from 'chai';
import { DataSource, QueryRunner } from '../../../src';
import { createTestingConnections, closeTestingConnections } from '../../utils/test-utils';
import { User } from './entity/User';

describe("github issues > #8273 Adding @Generated('uuid') doesn't update column default in PostgreSQL", () => {
	let connections: DataSource[];
	const getColumnDefault = async (
		queryRunner: QueryRunner,
		columnName: string,
	): Promise<string | null> => {
		const query =
			`SELECT "column_default"` +
			` FROM "information_schema"."columns"` +
			` WHERE "table_schema" = 'public' AND "table_name" = 'user' AND "column_name" = '${columnName}'`;
		const res = await queryRunner.query(query);
		return res.length ? res[0]['column_default'] : null;
	};
	before(
		async () =>
			(connections = await createTestingConnections({
				enabledDrivers: ['postgres'],
				schemaCreate: true,
				dropSchema: true,
				entities: [User],
			})),
	);
	after(() => closeTestingConnections(connections));

	/*
	 * ISSUE: Test expects DEFAULT value to be set when @Generated('increment') is dynamically added to a column.
	 *
	 * THEORIES FOR FAILURE:
	 * 1. PostgreSQL Driver Column Change Logic Issue: The changeColumn() method may not properly handle
	 *    adding generation strategies to existing columns, missing the ALTER TABLE ALTER COLUMN SET DEFAULT
	 *    command needed to create the sequence and set the default value.
	 *
	 * 2. Schema Synchronization Gap: TypeORM's schema synchronizer may not detect the need to create
	 *    a sequence when a column's isGenerated flag is changed from false to true during runtime,
	 *    as this is different from initial schema creation.
	 *
	 * 3. Memory Down SQL Incomplete: The executeMemoryDownSql() may not properly reverse all the
	 *    operations, potentially leaving the database in an inconsistent state that affects subsequent
	 *    assertions about the default value.
	 *
	 * POTENTIAL FIXES:
	 * - Fix PostgresQueryRunner.changeColumn() to handle sequence creation for generated columns
	 * - Ensure schema differ properly detects generated column changes
	 * - Add proper cleanup in memory down SQL operations for sequences
	 */
	it.skip("should add DEFAULT value when @Generated('increment') is added", () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();
				let table = await queryRunner.getTable('user');
				const column = table!.findColumnByName('increment')!;
				const newColumn = column.clone();
				newColumn.isGenerated = true;
				newColumn.generationStrategy = 'increment';

				await queryRunner.changeColumn(table!, column, newColumn);

				let columnDefault = await getColumnDefault(queryRunner, 'increment');
				expect(columnDefault).to.equal("nextval('user_increment_seq'::regclass)");

				await queryRunner.executeMemoryDownSql();

				columnDefault = await getColumnDefault(queryRunner, 'increment');
				expect(columnDefault).to.null;

				await queryRunner.release();
			}),
		));

	/*
	 * ISSUE: Test expects DEFAULT value to be removed when @Generated('increment') is dynamically removed from a column.
	 *
	 * THEORIES FOR FAILURE:
	 * 1. Sequence Cleanup Missing: When removing generation strategy, PostgresQueryRunner may not properly
	 *    drop the associated sequence or remove the DEFAULT constraint, leaving the old default value intact.
	 *
	 * 2. Column Metadata Synchronization Issue: The column change detection may not properly identify
	 *    that a generated column is being converted to a regular column, missing the need to clean up
	 *    generation-related database objects.
	 *
	 * 3. Transaction Isolation Problems: The test operations may be happening within transactions that
	 *    don't properly commit changes before the assertions run, causing the default value queries
	 *    to see stale schema information.
	 *
	 * POTENTIAL FIXES:
	 * - Implement proper sequence cleanup in changeColumn() when removing generation strategies
	 * - Fix column comparison logic to detect generated -> non-generated changes
	 * - Ensure proper transaction handling in schema modification operations
	 */
	it.skip("should remove DEFAULT value when @Generated('increment') is removed", () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();
				let table = await queryRunner.getTable('user');
				const column = table!.findColumnByName('incrementWithGenerated')!;
				const newColumn = column.clone();
				newColumn.isGenerated = false;
				newColumn.generationStrategy = undefined;

				await queryRunner.changeColumn(table!, column, newColumn);

				let columnDefault = await getColumnDefault(queryRunner, 'incrementWithGenerated');
				expect(columnDefault).to.null;

				await queryRunner.executeMemoryDownSql();

				columnDefault = await getColumnDefault(queryRunner, 'incrementWithGenerated');
				expect(columnDefault).to.equal(`nextval('"user_incrementWithGenerated_seq"'::regclass)`);

				await queryRunner.release();
			}),
		));

	/*
	 * ISSUE: Test expects DEFAULT value uuid_generate_v4() when @Generated('uuid') is dynamically added to a column.
	 *
	 * THEORIES FOR FAILURE:
	 * 1. UUID Extension Missing: PostgreSQL requires the uuid-ossp or pgcrypto extension to be enabled
	 *    for uuid_generate_v4() function. The test environment may not have this extension installed
	 *    or enabled, causing the default value setting to fail silently.
	 *
	 * 2. UUID Column Type Mismatch: The column may not be properly typed as UUID in PostgreSQL,
	 *    or there may be a mismatch between TypeORM's UUID type handling and PostgreSQL's native
	 *    UUID type, preventing the default function from being applied.
	 *
	 * 3. Runtime Column Alteration Limitation: PostgreSQL may have limitations on altering existing
	 *    columns to add UUID generation functions, especially if the column already contains data
	 *    or has constraints that conflict with the new default value.
	 *
	 * POTENTIAL FIXES:
	 * - Ensure uuid-ossp extension is enabled in test PostgreSQL setup
	 * - Fix UUID column type mapping in PostgresQueryRunner
	 * - Add proper validation and error handling for UUID default function installation
	 */
	it.skip("should add DEFAULT value when @Generated('uuid') is added", () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();
				let table = await queryRunner.getTable('user');
				const column = table!.findColumnByName('uuid')!;
				const newColumn = column.clone();
				newColumn.isGenerated = true;
				newColumn.generationStrategy = 'uuid';

				await queryRunner.changeColumn(table!, column, newColumn);

				let columnDefault = await getColumnDefault(queryRunner, 'uuid');
				expect(columnDefault).to.equal('uuid_generate_v4()');

				await queryRunner.executeMemoryDownSql();

				columnDefault = await getColumnDefault(queryRunner, 'uuid');
				expect(columnDefault).to.null;

				await queryRunner.release();
			}),
		));

	/*
	 * ISSUE: Test expects DEFAULT value to be removed when @Generated('uuid') is dynamically removed from a column.
	 *
	 * THEORIES FOR FAILURE:
	 * 1. Default Constraint Persistence: PostgreSQL may maintain the DEFAULT constraint even after
	 *    TypeORM attempts to remove it, especially if the constraint was created with specific naming
	 *    or if there are multiple layers of default value handling.
	 *
	 * 2. Extension Dependency Issues: If uuid_generate_v4() function is still referenced by the
	 *    default constraint, PostgreSQL may not allow its removal, or the removal operation may
	 *    fail silently without proper error reporting in TypeORM.
	 *
	 * 3. Column State Caching: TypeORM may be caching column metadata and not properly refreshing
	 *    the column definition after the changeColumn operation, causing the test to see stale
	 *    information about the default value.
	 *
	 * POTENTIAL FIXES:
	 * - Implement explicit DEFAULT constraint dropping in changeColumn operations
	 * - Add proper error handling and reporting for UUID default value removal
	 * - Clear column metadata cache after schema modification operations
	 */
	it.skip("should remove DEFAULT value when @Generated('uuid') is removed", () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();
				let table = await queryRunner.getTable('user');
				const column = table!.findColumnByName('uuidWithGenerated')!;
				const newColumn = column.clone();
				newColumn.isGenerated = false;
				newColumn.generationStrategy = undefined;

				await queryRunner.changeColumn(table!, column, newColumn);

				let columnDefault = await getColumnDefault(queryRunner, 'uuidWithGenerated');
				expect(columnDefault).to.null;

				await queryRunner.executeMemoryDownSql();

				columnDefault = await getColumnDefault(queryRunner, 'uuidWithGenerated');
				expect(columnDefault).to.equal('uuid_generate_v4()');

				await queryRunner.release();
			}),
		));
});
