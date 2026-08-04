import 'reflect-metadata';
import { createTestingConnections, closeTestingConnections } from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';

describe("github issues > #9715 Database schema is not updated by sync/migration when 'simple-enum' is changed.", () => {
	let dataSources: DataSource[];
	before(
		async () =>
			(dataSources = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				migrations: [__dirname + '/migration/*{.js,.ts}'],
				schemaCreate: false,
				dropSchema: true,
				enabledDrivers: ['sqlite', 'sqlite-pooled'],
			})),
	);
	after(() => closeTestingConnections(dataSources));

	it("should update 'CHECK' constraint to match enum values", () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				await dataSource.runMigrations();

				const sqlInMemory = await dataSource.driver.createSchemaBuilder().log();

				sqlInMemory.upQueries
					.filter((i) =>
						i.query.includes(
							`CHECK( "enumcolumn" IN ('enumvalue1','enumvalue2','enumvalue3','enumvalue4') )`,
						),
					)
					.length.should.be.greaterThan(0);
			}),
		));

	// you can add additional tests if needed
});
