import 'reflect-metadata';
import { expect } from 'chai';
import { closeTestingConnections, createTestingConnections } from '../../utils/test-utils';
import { DataSource, Table } from '../../../src';

describe('query runner > drop column', () => {
	let connections: DataSource[];
	before(async () => {
		connections = await createTestingConnections({
			entities: [__dirname + '/entity/*{.js,.ts}'],
			schemaCreate: true,
			dropSchema: true,
		});
	});
	after(() => closeTestingConnections(connections));

	describe('when columns are instances of TableColumn', () => {
		it('should correctly drop column and revert drop', () =>
			Promise.all(
				connections.map(async (connection) => {
					const queryRunner = connection.createQueryRunner();

					let table = await queryRunner.getTable('post');
					const idColumn = table!.findColumnByName('id')!;
					const nameColumn = table!.findColumnByName('name')!;
					const versionColumn = table!.findColumnByName('version')!;
					idColumn!.should.be.exist;
					nameColumn!.should.be.exist;
					versionColumn!.should.be.exist;

					// better-sqlite3 seems not able to create a check constraint on a non-existing column
					if (connection.name === 'better-sqlite3') {
						await queryRunner.dropCheckConstraints(table!, table!.checks);
					}

					// In Sqlite 'dropColumns' method is more optimal than 'dropColumn', because it recreate table just once,
					// without all removed columns. In other drivers it's no difference between these methods, because 'dropColumns'
					// calls 'dropColumn' method for each removed column.
					await queryRunner.dropColumns(table!, [idColumn, nameColumn, versionColumn]);

					table = await queryRunner.getTable('post');
					expect(table!.findColumnByName('name')).to.be.undefined;
					expect(table!.findColumnByName('version')).to.be.undefined;

					await queryRunner.executeMemoryDownSql();

					table = await queryRunner.getTable('post');
					table!.findColumnByName('id')!.should.be.exist;
					table!.findColumnByName('name')!.should.be.exist;
					table!.findColumnByName('version')!.should.be.exist;

					await queryRunner.release();
				}),
			));
	});

	describe('when columns are strings', () => {
		it('should correctly drop column and revert drop', () =>
			Promise.all(
				connections.map(async (connection) => {
					const queryRunner = connection.createQueryRunner();

					let table = await queryRunner.getTable('post');
					const idColumn = table!.findColumnByName('id')!;
					const nameColumn = table!.findColumnByName('name')!;
					const versionColumn = table!.findColumnByName('version')!;
					idColumn!.should.be.exist;
					nameColumn!.should.be.exist;
					versionColumn!.should.be.exist;

					// better-sqlite3 seems not able to create a check constraint on a non-existing column
					if (connection.name === 'better-sqlite3') {
						await queryRunner.dropCheckConstraints(table!, table!.checks);
					}

					// In Sqlite 'dropColumns' method is more optimal than 'dropColumn', because it recreate table just once,
					// without all removed columns. In other drivers it's no difference between these methods, because 'dropColumns'
					// calls 'dropColumn' method for each removed column.
					await queryRunner.dropColumns(table!, ['id', 'name', 'version']);

					table = await queryRunner.getTable('post');
					expect(table!.findColumnByName('name')).to.be.undefined;
					expect(table!.findColumnByName('version')).to.be.undefined;

					await queryRunner.executeMemoryDownSql();

					table = await queryRunner.getTable('post');
					table!.findColumnByName('id')!.should.be.exist;
					table!.findColumnByName('name')!.should.be.exist;
					table!.findColumnByName('version')!.should.be.exist;

					await queryRunner.release();
				}),
			));
	});

	it('should preserve triggers when recreating table in sqlite', () =>
		Promise.all(
			connections
				// Only run this test for sqlite-based connections
				.filter(
					(connection) =>
						connection.options.type === 'sqlite' || connection.options.type === 'sqlite-pooled',
				)
				.map(async (connection) => {
					const queryRunner = connection.createQueryRunner();

					// Get the post table
					let table = await queryRunner.getTable('post');
					expect(table).to.exist;

					// Create a trigger on the table
					const triggerName = 'test_insert_trigger';
					const triggerSql = `CREATE TRIGGER ${triggerName} AFTER INSERT ON "${table!.name}" BEGIN SELECT 1; END`;
					await queryRunner.query(triggerSql);

					// Verify trigger exists before column drop
					const triggersBefore: { name: string; sql: string }[] = await queryRunner.query(
						`SELECT name, sql FROM sqlite_master WHERE type = 'trigger' AND tbl_name = ?`,
						[table!.name],
					);
					expect(triggersBefore).to.have.length(1);
					expect(triggersBefore[0].name).to.equal(triggerName);

					// Drop a column, which triggers recreateTable in SQLite
					await queryRunner.dropColumn(table!, 'version');

					// Verify trigger still exists after table recreation
					table = await queryRunner.getTable('post');
					const triggersAfter: { name: string; sql: string }[] = await queryRunner.query(
						`SELECT name, sql FROM sqlite_master WHERE type = 'trigger' AND tbl_name = ?`,
						[table!.name],
					);
					expect(triggersAfter).to.have.length(1);
					expect(triggersAfter[0].name).to.equal(triggerName);
					expect(triggersAfter[0].sql).to.equal(triggerSql);

					// Clean up
					await queryRunner.query(`DROP TRIGGER ${triggerName}`);
					await queryRunner.executeMemoryDownSql();
					await queryRunner.release();
				}),
		));

	it('should safely handle SQL injection in hasEnumType', () =>
		Promise.all(
			connections
				.filter((connection) => connection.options.type === 'postgres')
				.map(async (connection) => {
					// ARRANGE
					const queryRunner = connection.createQueryRunner();
					// Try to create a table with a column name containing SQL
					// injection The malicious column name will inject a
					// subquery into hasEnumType
					const maliciousColumnName = "test' OR (SELECT COUNT(*) FROM pg_type) > 0 OR '1'='";
					let creationError = null;

					// ACT
					try {
						await queryRunner.createTable(
							new Table({
								name: 'sqli_test',
								columns: [
									{
										name: 'id',
										type: 'int',
										isPrimary: true,
									},
									{
										name: maliciousColumnName,
										type: 'enum',
										enum: ['val1', 'val2'],
									},
								],
							}),
							true,
						);
					} catch (error) {
						creationError = error;
					}

					// ASSERT
					// Verify the SQL injection did not affect the query logic
					// If vulnerable, we'd get "does not exist" error (hasEnumType returned wrong result)
					// If secure, parameterized queries prevent the injection
					if (creationError) {
						expect(creationError.message).to.not.include('does not exist');
					}

					// CLEANUP
					await queryRunner.dropTable('sqli_test', true);
					await queryRunner.release();
				}),
		));

	it('should safely handle SQL injection in getUserDefinedTypeName', () =>
		Promise.all(
			connections
				.filter((connection) => connection.options.type === 'postgres')
				.map(async (connection) => {
					// ARRANGE
					const queryRunner = connection.createQueryRunner();
					// First, create a victim table that we'll verify isn't affected by the injection
					await queryRunner.createTable(
						new Table({
							name: 'victim_table',
							columns: [
								{ name: 'id', type: 'int', isPrimary: true },
								{
									name: 'priority',
									type: 'enum',
									enum: ['low', 'high'],
								},
							],
						}),
						true,
					);

					// Try to create a table with SQL injection in the table name
					const maliciousTableName = "test' OR '1'='1";
					let maliciousTableCreated = false;
					let dropError = null;

					const tableWithMaliciousName = new Table({
						name: maliciousTableName,
						columns: [
							{ name: 'id', type: 'int', isPrimary: true },
							{
								name: 'priority',
								type: 'enum',
								enum: ['yes', 'no'],
							},
						],
					});

					// ACT
					try {
						await queryRunner.createTable(tableWithMaliciousName, true);
						maliciousTableCreated = true;

						// Try to drop the ENUM column, which triggers
						// getUserDefinedTypeName with the malicious table name
						await queryRunner.dropColumn(tableWithMaliciousName, 'priority');
					} catch (error) {
						dropError = error;
					}

					// ASSERT
					// Verify the SQL injection didn't cause cross-table data
					// leakage If vulnerable, the error would reference the
					// victim table or system tables If secure, parameterized
					// queries prevent the injection
					if (dropError) {
						const errorMsg = dropError.message.toLowerCase();
						expect(errorMsg).to.not.include('victim_table');
						expect(errorMsg).to.not.include('victim_table_priority_enum');
						expect(errorMsg).to.not.include('geography_columns');
						expect(errorMsg).to.not.include('geometry_columns');
					}

					// CLEANUP
					if (maliciousTableCreated) {
						try {
							await queryRunner.dropTable(tableWithMaliciousName, true);
						} catch {
							// TODO: this fails because `loadTables` is also
							// susceptive to the injection and thus return
							// the wrong table which cannot be deleted and thus
							// this throws this error:
							// QueryFailedError: "geography_columns" is not a table
						}
					}
					await queryRunner.dropTable('victim_table', true);
					await queryRunner.release();
				}),
		));
});
