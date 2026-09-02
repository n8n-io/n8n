import 'reflect-metadata';
import { DataSource, Table } from '../../../src';
import { closeTestingConnections, createTestingConnections } from '../../utils/test-utils';

describe('query runner > has column', () => {
	let connections: DataSource[];
	before(async () => {
		connections = await createTestingConnections({
			entities: [__dirname + '/entity/*{.js,.ts}'],
			schemaCreate: true,
			dropSchema: true,
		});
	});
	after(() => closeTestingConnections(connections));

	it('should correctly check if column exist', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();

				let hasIdColumn = await queryRunner.hasColumn('post', 'id');
				let hasNameColumn = await queryRunner.hasColumn('post', 'name');
				let hasVersionColumn = await queryRunner.hasColumn('post', 'version');
				let hasDescriptionColumn = await queryRunner.hasColumn('post', 'description');

				hasIdColumn.should.be.true;
				hasNameColumn.should.be.true;
				hasVersionColumn.should.be.true;
				hasDescriptionColumn.should.be.false;

				await queryRunner.release();
			}),
		));

	it('should safely handle SQL injection in column name parameter', () =>
		Promise.all(
			connections.map(async (connection) => {
				// ARRANGE
				const queryRunner = connection.createQueryRunner();
				await queryRunner.createTable(
					new Table({
						name: 'injection_test_table',
						columns: [
							{
								name: 'test_column',
								type: 'varchar',
								length: '255',
							},
						],
					}),
					true,
				);

				// ACT
				const maliciousColumnName = "test'; DROP TABLE injection_test_table; --";
				let exists = false;
				try {
					exists = await queryRunner.hasColumn('post', maliciousColumnName);
				} catch {
					// Acceptable if it throws due to proper parameterization
				}

				// ASSERT
				exists.should.be.false;

				// Verify the test table still exists (wasn't dropped by
				// injection)
				const tableExists = await queryRunner.hasTable('injection_test_table');
				tableExists.should.be.true;

				// CLEANUP
				await queryRunner.dropTable('injection_test_table', true);
				await queryRunner.release();
			}),
		));

	it('should safely handle SQL injection in table name parameter', () =>
		Promise.all(
			connections.map(async (connection) => {
				// ARRANGE
				const queryRunner = connection.createQueryRunner();
				await queryRunner.createTable(
					new Table({
						name: 'injection_test_table',
						columns: [
							{
								name: 'test_column',
								type: 'varchar',
								length: '255',
							},
						],
					}),
					true,
				);
				const maliciousTableName = "post'; DROP TABLE injection_test_table; --";

				// ACT
				let exists = false;
				try {
					exists = await queryRunner.hasColumn(maliciousTableName, 'id');
				} catch {
					// Acceptable if it throws due to proper parameterization
				}

				// ASSERT
				exists.should.be.false;

				// Verify the test table still exists (wasn't dropped by
				// injection)
				const tableExists = await queryRunner.hasTable('injection_test_table');
				tableExists.should.be.true;

				// CLEANUP
				await queryRunner.dropTable('injection_test_table', true);
				await queryRunner.release();
			}),
		));
});
