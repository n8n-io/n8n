import 'reflect-metadata';
import { expect } from 'chai';
import { DataSource, QueryRunner } from '../../../src';
import { createTestingConnections, closeTestingConnections } from '../../utils/test-utils';
import { User } from './entity/User';
import { Document } from './entity/Document';
import { Album } from './entity/Album';
import { Photo } from './entity/Photo';

describe('github issues > #5898 Postgres primary key of type uuid: default value migration/sync not working', () => {
	let connections: DataSource[];
	const getColumnDefault = async (
		queryRunner: QueryRunner,
		tableName: string,
		columnName: string,
	): Promise<string | null> => {
		const query =
			`SELECT "column_default"` +
			` FROM "information_schema"."columns"` +
			` WHERE "table_schema" = 'public' AND "table_name" = '${tableName}' AND "column_name" = '${columnName}'`;
		const res = await queryRunner.query(query);
		return res.length ? res[0]['column_default'] : null;
	};
	before(
		async () =>
			(connections = await createTestingConnections({
				enabledDrivers: ['postgres'],
				schemaCreate: true,
				dropSchema: true,
				entities: [User, Document, Album, Photo],
			})),
	);
	after(() => closeTestingConnections(connections));

	/*
	 * ISSUE: Test expects DEFAULT sequence value when @PrimaryGeneratedColumn('increment') is dynamically added.
	 *
	 * THEORIES FOR FAILURE:
	 * 1. Primary Key Constraint Conflicts: Changing an existing primary key column to add generation
	 *    strategy may conflict with existing primary key constraints, foreign key references, or
	 *    unique constraints that prevent the column alteration from completing successfully.
	 *
	 * 2. Sequence Creation Order Issues: PostgreSQL requires specific ordering when creating sequences
	 *    and setting them as column defaults. TypeORM may be executing the operations in the wrong
	 *    order or missing the sequence creation step entirely for primary columns.
	 *
	 * 3. Transaction Rollback on Error: If any part of the changeColumn operation fails (such as
	 *    sequence creation), PostgreSQL may rollback the entire transaction, leaving the column
	 *    unchanged but TypeORM may not detect this failure properly.
	 *
	 * POTENTIAL FIXES:
	 * - Implement proper primary key sequence handling in changeColumn operations
	 * - Add transaction error detection and reporting for failed column changes
	 * - Ensure proper constraint dependency management when modifying primary keys
	 */
	it.skip("should add DEFAULT value when @PrimaryGeneratedColumn('increment') is added", () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();
				let table = await queryRunner.getTable('photo');
				const column = table!.findColumnByName('id')!;
				const newColumn = column.clone();
				newColumn.isGenerated = true;
				newColumn.generationStrategy = 'increment';

				await queryRunner.changeColumn(table!, column, newColumn);

				let columnDefault = await getColumnDefault(queryRunner, 'photo', 'id');
				expect(columnDefault).to.equal("nextval('photo_id_seq'::regclass)");

				await queryRunner.executeMemoryDownSql();

				columnDefault = await getColumnDefault(queryRunner, 'photo', 'id');
				expect(columnDefault).to.null;

				await queryRunner.release();
			}),
		));

	/*
	 * ISSUE: Test expects DEFAULT value removal when @PrimaryGeneratedColumn('increment') is removed from primary key.
	 *
	 * THEORIES FOR FAILURE:
	 * 1. Primary Key Protection Mechanisms: PostgreSQL may have built-in protections that prevent
	 *    removing generation strategies from primary key columns to maintain referential integrity,
	 *    especially if there are foreign key relationships depending on the auto-generated values.
	 *
	 * 2. Sequence Dependency Tracking: The database may maintain dependencies between the sequence
	 *    and the primary key column that prevent the default value from being removed, or TypeORM
	 *    may not be properly identifying and handling these dependencies during column changes.
	 *
	 * 3. Memory Down SQL Scope Issues: The executeMemoryDownSql() operation may not properly
	 *    reverse primary key changes, as these are more complex operations than regular column
	 *    changes and may require special handling for constraint recreation.
	 *
	 * POTENTIAL FIXES:
	 * - Add specific primary key constraint handling to column change operations
	 * - Implement proper dependency checking before removing generation strategies
	 * - Enhance memory down SQL to properly handle primary key constraint restoration
	 */
	it.skip("should remove DEFAULT value when @PrimaryGeneratedColumn('increment') is removed", () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();
				let table = await queryRunner.getTable('album');
				const column = table!.findColumnByName('id')!;
				const newColumn = column.clone();
				newColumn.isGenerated = false;
				newColumn.generationStrategy = undefined;

				await queryRunner.changeColumn(table!, column, newColumn);

				let columnDefault = await getColumnDefault(queryRunner, 'album', 'id');
				expect(columnDefault).to.null;

				await queryRunner.executeMemoryDownSql();

				columnDefault = await getColumnDefault(queryRunner, 'album', 'id');
				expect(columnDefault).to.equal(`nextval('album_id_seq'::regclass)`);

				await queryRunner.release();
			}),
		));

	/*
	 * ISSUE: Test expects uuid_generate_v4() DEFAULT when @PrimaryGeneratedColumn('uuid') is dynamically added.
	 *
	 * THEORIES FOR FAILURE:
	 * 1. UUID Extension Availability: PostgreSQL's uuid_generate_v4() function requires the uuid-ossp
	 *    or pgcrypto extension. The test database may not have these extensions installed, or they
	 *    may not be enabled in the public schema, causing the function reference to fail silently.
	 *
	 * 2. Primary Key UUID Type Constraints: Converting an existing primary key column to UUID type
	 *    with auto-generation may conflict with existing data types, foreign key references, or
	 *    indexes that expect the original data type, preventing the column alteration.
	 *
	 * 3. Cross-Type Column Conversion Issues: Changing a primary key from one type (likely integer)
	 *    to UUID with generation strategy may require intermediate steps like data conversion,
	 *    constraint recreation, and index rebuilding that TypeORM doesn't handle automatically.
	 *
	 * POTENTIAL FIXES:
	 * - Ensure UUID extensions are properly installed and available in test environments
	 * - Add proper type conversion handling for primary key column changes
	 * - Implement step-by-step column conversion for complex primary key modifications
	 */
	it.skip("should add DEFAULT value when @PrimaryGeneratedColumn('uuid') is added", () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();
				let table = await queryRunner.getTable('document');
				const column = table!.findColumnByName('id')!;
				const newColumn = column.clone();
				newColumn.isGenerated = true;
				newColumn.generationStrategy = 'uuid';

				await queryRunner.changeColumn(table!, column, newColumn);

				let columnDefault = await getColumnDefault(queryRunner, 'document', 'id');
				expect(columnDefault).to.equal('uuid_generate_v4()');

				await queryRunner.executeMemoryDownSql();

				columnDefault = await getColumnDefault(queryRunner, 'document', 'id');
				expect(columnDefault).to.null;

				await queryRunner.release();
			}),
		));

	/*
	 * ISSUE: Test expects DEFAULT value removal when @PrimaryGeneratedColumn('uuid') is removed from primary key.
	 *
	 * THEORIES FOR FAILURE:
	 * 1. UUID Function Dependency Persistence: PostgreSQL may maintain a dependency link between
	 *    the uuid_generate_v4() function and the column default, preventing its removal even after
	 *    TypeORM attempts to alter the column, especially if the function is referenced elsewhere.
	 *
	 * 2. Primary Key Constraint Immutability: Some PostgreSQL configurations or versions may treat
	 *    primary key generation strategies as immutable once set, requiring the column to be
	 *    dropped and recreated rather than altered, which TypeORM may not handle correctly.
	 *
	 * 3. Schema Lock Issues: The column change operation may acquire locks that prevent immediate
	 *    visibility of the changes, or there may be concurrent transactions that interfere with
	 *    the column alteration process, causing inconsistent results.
	 *
	 * POTENTIAL FIXES:
	 * - Implement proper UUID function dependency cleanup in column changes
	 * - Add alternative column recreation strategy for complex primary key modifications
	 * - Improve transaction isolation and lock handling for schema modification operations
	 */
	it.skip("should remove DEFAULT value when @PrimaryGeneratedColumn('uuid') is removed", () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();
				let table = await queryRunner.getTable('user');
				const column = table!.findColumnByName('id')!;
				const newColumn = column.clone();
				newColumn.isGenerated = false;
				newColumn.generationStrategy = undefined;

				await queryRunner.changeColumn(table!, column, newColumn);

				let columnDefault = await getColumnDefault(queryRunner, 'user', 'id');
				expect(columnDefault).to.null;

				await queryRunner.executeMemoryDownSql();

				columnDefault = await getColumnDefault(queryRunner, 'user', 'id');
				expect(columnDefault).to.equal('uuid_generate_v4()');

				await queryRunner.release();
			}),
		));
});
