import 'reflect-metadata';
import { DataSource } from '../../../src';
import { closeTestingConnections, createTestingConnections } from '../../utils/test-utils';
import { TestEntity } from './entity/Test';
import { ViewA } from './entity/ViewA';
import { ViewB } from './entity/ViewB';
import { ViewC } from './entity/ViewC';

describe('github issues > #7586 Oddly indexed views are not dropped in migration', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				enabledDrivers: ['postgres'],
				schemaCreate: true,
				dropSchema: true,
				entities: [TestEntity, ViewA, ViewB, ViewC],
			})),
	);
	after(() => closeTestingConnections(connections));

	it('should generate drop queries for all views', () =>
		Promise.all(
			connections.map(async (connection) => {
				const expectedDrops: RegExp[] = [];
				for (const view of [ViewA, ViewB, ViewC]) {
					const metadata = connection.getMetadata(view);
					metadata.expression = (metadata.expression as string)?.replace('V1', 'V2');
					expectedDrops.push(new RegExp(`^DROP\\s+VIEW.*"${metadata.tableName}"`));
				}
				const sqlInMemory = await connection.driver.createSchemaBuilder().log();
				sqlInMemory.downQueries
					.filter((q) => expectedDrops.find((expected) => q.query.match(expected)))
					.length.should.be.equal(expectedDrops.length);
				sqlInMemory.upQueries
					.filter((q) => expectedDrops.find((expected) => q.query.match(expected)))
					.length.should.be.equal(expectedDrops.length);
			}),
		));
});
