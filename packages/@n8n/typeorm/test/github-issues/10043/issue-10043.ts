import 'reflect-metadata';
import { createTestingConnections, closeTestingConnections } from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';

describe('github issues > #10043 Numeric array column type creates migration repeatedly', () => {
	let dataSources: DataSource[];
	before(
		async () =>
			(dataSources = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				migrations: [__dirname + '/migration/*{.js,.ts}'],
				schemaCreate: false,
				dropSchema: true,
				enabledDrivers: ['postgres'],
			})),
	);
	after(() => closeTestingConnections(dataSources));

	it('should not generate migration for synchronized sized-numeric array column', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				await dataSource.runMigrations();

				const sqlInMemory = await dataSource.driver.createSchemaBuilder().log();

				sqlInMemory.upQueries.length.should.equal(0);
				sqlInMemory.downQueries.length.should.equal(0);
			}),
		));
});
