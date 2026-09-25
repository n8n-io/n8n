import 'reflect-metadata';
import { DataSource, Table } from '../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';

describe('query runner > create and drop database', () => {
	let connections: DataSource[];
	before(async () => {
		connections = await createTestingConnections({
			entities: [__dirname + '/entity/*{.js,.ts}'],
			enabledDrivers: ['postgres'],
			dropSchema: true,
		});
	});
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should correctly create and drop database and revert it', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();

				await queryRunner.createDatabase('myTestDatabase', true);
				let hasDatabase = await queryRunner.hasDatabase('myTestDatabase');
				hasDatabase.should.be.true;

				await queryRunner.dropDatabase('myTestDatabase');
				hasDatabase = await queryRunner.hasDatabase('myTestDatabase');
				hasDatabase.should.be.false;

				await queryRunner.executeMemoryDownSql();

				hasDatabase = await queryRunner.hasDatabase('myTestDatabase');
				hasDatabase.should.be.false;

				await queryRunner.release();
			}),
		));

	it('should correctly detect existing database', () =>
		Promise.all(
			connections.map(async (connection) => {
				// ARRANGE
				const queryRunner = connection.createQueryRunner();
				await queryRunner.createDatabase('test_db_exists', true);

				// ACT
				const exists = await queryRunner.hasDatabase('test_db_exists');

				// ASSERT
				exists.should.be.true;

				// CLEANUP
				await queryRunner.dropDatabase('test_db_exists');
				await queryRunner.release();
			}),
		));

	it('should correctly detect non-existing database', () =>
		Promise.all(
			connections.map(async (connection) => {
				// ARRANGE
				const queryRunner = connection.createQueryRunner();

				// ACT
				const exists = await queryRunner.hasDatabase('non_existent_db_xyz');

				// ASSERT
				exists.should.be.false;

				// CLEANUP
				await queryRunner.release();
			}),
		));

	it('should handle database names with special characters', () =>
		Promise.all(
			connections.map(async (connection) => {
				// ARRANGE
				const queryRunner = connection.createQueryRunner();
				await queryRunner.createDatabase('test_db_123', true);

				// ACT
				const exists = await queryRunner.hasDatabase('test_db_123');

				// ASSERT
				exists.should.be.true;

				// CLEANUP
				await queryRunner.dropDatabase('test_db_123');
				await queryRunner.release();
			}),
		));

	it('should handle case sensitivity correctly', () =>
		Promise.all(
			connections.map(async (connection) => {
				// ARRANGE
				const queryRunner = connection.createQueryRunner();
				await queryRunner.createDatabase('TestDatabase', true);

				// ACT
				const existsLower = await queryRunner.hasDatabase('testdatabase');
				const existsOriginal = await queryRunner.hasDatabase('TestDatabase');

				// ASSERT
				existsOriginal.should.be.true;
				existsLower.should.be.false;

				// CLEANUP
				await queryRunner.dropDatabase('TestDatabase');
				await queryRunner.release();
			}),
		));

	it('should safely handle potentially malicious database names', () =>
		Promise.all(
			connections.map(async (connection) => {
				// ARRANGE
				const queryRunner = connection.createQueryRunner();
				await queryRunner.createTable(
					new Table({
						name: 'injection_test_table',
						columns: [{ name: 'id', type: 'int', isPrimary: true }],
					}),
					true,
				);

				// ACT
				const maliciousName = "test'; DROP TABLE injection_test_table; --";
				let exists = false;
				try {
					exists = await queryRunner.hasDatabase(maliciousName);
				} catch {
					// If the database driver properly prevents SQL injection,
					// it might throw an error which is also acceptable
					// behavior (parameterized queries working correctly)
				}

				// ASSERT
				exists.should.be.false;

				// Verify the table still exists (wasn't dropped by injection)
				const tableExists = await queryRunner.hasTable('injection_test_table');
				tableExists.should.be.true;

				// CLEANUP
				await queryRunner.dropTable('injection_test_table', true);
				await queryRunner.release();
			}),
		));
});
