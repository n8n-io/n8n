import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { DbConnection } from '../index';
import { copyTable } from './migration-helpers';

describe('Migration Helpers', () => {
	let dataSource: DataSource;

	beforeEach(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);
	});

	afterEach(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.close();
	});

	describe('copyTable', () => {
		it('should put OFFSET after LIMIT in INSERT statement for sqlite support', async () => {
			// Regression test for SQLite LIMIT/OFFSET ordering bug
			// copyTable should correctly copy rows when count exceeds batch size
			const testTableName = 'test_copy_source';
			const destTableName = 'test_copy_dest';
			const rowCount = 25; // More than default batch size of 10

			// Cleanup any existing tables from previous test runs
			await dataSource.query(`DROP TABLE IF EXISTS ${testTableName}`);
			await dataSource.query(`DROP TABLE IF EXISTS ${destTableName}`);

			// Create source table and populate with test data
			await dataSource.query(`
				CREATE TABLE ${testTableName} (
					id INTEGER PRIMARY KEY,
					value TEXT
				)
			`);

			// Insert 25 rows
			for (let i = 1; i <= rowCount; i++) {
				await dataSource.query(`INSERT INTO ${testTableName} (id, value) VALUES (?, ?)`, [
					i,
					`value_${i}`,
				]);
			}

			// Create destination table with same schema
			await dataSource.query(`
				CREATE TABLE ${destTableName} (
					id INTEGER PRIMARY KEY,
					value TEXT
				)
			`);

			const queryRunner = dataSource.createQueryRunner();

			// Spy on queryRunner.query to capture the actual SQL being executed
			const querySpy = jest.spyOn(queryRunner, 'query');

			// Copy all data using copyTable (should trigger multiple batches with OFFSET)
			await copyTable(queryRunner, '', testTableName, destTableName);

			// Verify the SQL queries have correct LIMIT/OFFSET ordering
			const insertCalls = querySpy.mock.calls.filter(
				([sql]) => typeof sql === 'string' && sql.includes('INSERT INTO'),
			);

			// Should have 3 INSERT calls: batch 1 (rows 1-10), batch 2 (rows 11-20), batch 3 (rows 21-25)
			expect(insertCalls.length).toBe(3);

			// Get the escaped table names to construct expected queries
			const { driver } = queryRunner.connection;
			const escapedSource = driver.escape('test_copy_source');
			const escapedDest = driver.escape('test_copy_dest');

			// First batch should not have OFFSET
			const firstBatchQuery = insertCalls[0][0];
			expect(firstBatchQuery).toBe(
				`INSERT INTO ${escapedDest}  SELECT * FROM ${escapedSource} LIMIT 10`,
			);

			const secondBatchQuery = insertCalls[1][0];
			expect(secondBatchQuery).toBe(
				`INSERT INTO ${escapedDest}  SELECT * FROM ${escapedSource} LIMIT 10 OFFSET 10`,
			);

			const thirdBatchQuery = insertCalls[2][0];
			expect(thirdBatchQuery).toBe(
				`INSERT INTO ${escapedDest}  SELECT * FROM ${escapedSource} LIMIT 10 OFFSET 20`,
			);

			querySpy.mockRestore();

			// Cleanup
			await queryRunner.release();
			await dataSource.query(`DROP TABLE ${testTableName}`);
			await dataSource.query(`DROP TABLE ${destTableName}`);
		});
	});
});
