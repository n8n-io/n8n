import 'reflect-metadata';
import { DataSource, Table } from '../../../src';
import { closeTestingConnections, createTestingConnections } from '../../utils/test-utils';

describe('query runner > has table', () => {
	let connections: DataSource[];
	before(async () => {
		connections = await createTestingConnections({
			entities: [__dirname + '/entity/*{.js,.ts}'],
			schemaCreate: true,
			dropSchema: true,
		});
	});
	after(() => closeTestingConnections(connections));

	it('should correctly check if table exists', () =>
		Promise.all(
			connections.map(async (connection) => {
				// ARRANGE
				const queryRunner = connection.createQueryRunner();

				// ACT

				// Check for existing tables (created from entities)
				const hasPostTable = await queryRunner.hasTable('post');
				const hasPhotoTable = await queryRunner.hasTable('photo');
				const hasBookTable = await queryRunner.hasTable('book');
				const hasNonExistentTable = await queryRunner.hasTable('non_existent_table');

				// ASSERT
				hasPostTable.should.be.true;
				hasPhotoTable.should.be.true;
				hasBookTable.should.be.true;
				hasNonExistentTable.should.be.false;

				await queryRunner.release();
			}),
		));

	it('should correctly detect dynamically created tables', () =>
		Promise.all(
			connections.map(async (connection) => {
				// ARRANGE
				const queryRunner = connection.createQueryRunner();
				const table = new Table({
					name: 'test_dynamic_table',
					columns: [
						{
							name: 'id',
							type: 'int',
							isPrimary: true,
						},
						{
							name: 'name',
							type: 'varchar',
							length: '255',
						},
					],
				});
				let exists = false;

				// ACT & ASSERT

				// Initially table doesn't exist
				exists = await queryRunner.hasTable(table.name);
				exists.should.be.false;

				// exists after creation
				await queryRunner.createTable(table, true);
				exists = await queryRunner.hasTable(table.name);
				exists.should.be.true;

				// does not exist after dropping
				await queryRunner.dropTable(table);
				exists = await queryRunner.hasTable(table.name);
				exists.should.be.false;

				// CLEANUP
				await queryRunner.release();
			}),
		));

	it('should handle table names with special characters', () =>
		Promise.all(
			connections.map(async (connection) => {
				// ARRANGE
				const queryRunner = connection.createQueryRunner();
				const table = new Table({
					name: 'test_table_123',
					columns: [
						{
							name: 'id',
							type: 'int',
							isPrimary: true,
						},
					],
				});

				// ACT & ASSERT

				// Initially table doesn't exist
				let exists = await queryRunner.hasTable(table.name);
				exists.should.be.false;

				// Create table with special characters in name
				await queryRunner.createTable(table, true);

				// Should exist
				exists = await queryRunner.hasTable(table.name);
				exists.should.be.true;

				// CLEANUP
				await queryRunner.dropTable(table.name, true);
				await queryRunner.release();
			}),
		));

	it('should handle case sensitivity correctly', () =>
		Promise.all(
			connections.map(async (connection) => {
				// ARRANGE
				const queryRunner = connection.createQueryRunner();
				const originalName = 'TestCaseTable';
				const lowerName = 'testcasetable';
				await queryRunner.createTable(
					new Table({
						name: originalName,
						columns: [
							{
								name: 'id',
								type: 'int',
								isPrimary: true,
							},
						],
					}),
					true,
				);
				let existsLower = false;
				let existsOriginal = false;

				// ACT & ASSERT

				// original should exist
				existsOriginal = await queryRunner.hasTable(originalName);
				existsLower = await queryRunner.hasTable(lowerName);
				existsOriginal.should.be.true;
				existsLower.should.be.false;

				// both should not exist after drop
				await queryRunner.dropTable(originalName, true);
				existsOriginal = await queryRunner.hasTable(originalName);
				existsLower = await queryRunner.hasTable(lowerName);
				existsOriginal.should.be.false;
				existsLower.should.be.false;

				// CLEANUP
				await queryRunner.release();
			}),
		));

	it('should safely handle potentially malicious table names', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();

				// Test with SQL injection payload that attempts to manipulate the WHERE clause
				const maliciousName = "' OR '1'='1";
				const exists = await queryRunner.hasTable(maliciousName);

				// Should return false for non-existent table, even with malicious input
				exists.should.be.false;

				await queryRunner.release();
			}),
		));
});
