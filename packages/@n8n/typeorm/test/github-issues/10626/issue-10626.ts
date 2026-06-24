import 'reflect-metadata';
import { createTestingConnections, closeTestingConnections } from '../../utils/test-utils';
import { DataSource } from '../../../src/index.js';
import { expect } from 'chai';

describe('github issues > #10626 Postgres CREATE INDEX CONCURRENTLY bug', () => {
	let dataSources: DataSource[];

	before(
		async () =>
			(dataSources = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				schemaCreate: false,
				dropSchema: true,
				enabledDrivers: ['postgres'],
				logging: true,
			})),
	);

	after(() => closeTestingConnections(dataSources));

	it('has to create INDEX CONCURRENTLY', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				await dataSource.setOptions({
					...dataSource.options,
					migrationsTransactionMode: 'none',
				});
				await dataSource.synchronize();
				const concurrentTestIndexes = await dataSource.query(
					`SELECT * FROM pg_indexes WHERE indexname = 'concurrentTest'`,
				);
				expect(concurrentTestIndexes).has.length(1);
			}),
		));

	it('has to drop INDEX CONCURRENTLY', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				await dataSource.setOptions({
					...dataSource.options,
					migrationsTransactionMode: 'none',
				});
				await dataSource.synchronize();

				const queryRunner = dataSource.createQueryRunner();
				const table = await queryRunner.getTable('user');
				if (table) {
					await queryRunner.dropIndex(table, table?.indices[0]);
				}
				const queries = queryRunner.getMemorySql().upQueries;
				expect(queries[0].query).to.be.eql('DROP INDEX "public"."concurrentTest"');

				await queryRunner.release();
			}),
		));
});
