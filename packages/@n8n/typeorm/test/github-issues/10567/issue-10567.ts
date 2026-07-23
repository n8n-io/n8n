import 'reflect-metadata';
import { createTestingConnections, closeTestingConnections } from '../../utils/test-utils';
import { DataSource } from '../../../src/index.js';

describe('github issues > #10567 Postgres: Gist index on daterange column recreated every migration', () => {
	let dataSources: DataSource[];

	before(
		async () =>
			(dataSources = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				schemaCreate: false,
				dropSchema: true,
				enabledDrivers: ['postgres'],
			})),
	);

	after(() => closeTestingConnections(dataSources));

	it('can recognize model changes', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				const sqlInMemory = await dataSource.driver.createSchemaBuilder().log();

				sqlInMemory.upQueries.length.should.be.greaterThan(0);
				sqlInMemory.downQueries.length.should.be.greaterThan(0);
			}),
		));

	it('does not generate when no model changes', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				await dataSource.driver.createSchemaBuilder().build();

				const sqlInMemory = await dataSource.driver.createSchemaBuilder().log();

				sqlInMemory.upQueries.length.should.be.equal(0);
				sqlInMemory.downQueries.length.should.be.equal(0);
			}),
		));
});
