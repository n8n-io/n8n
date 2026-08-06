import { expect } from 'chai';
import 'reflect-metadata';
import { DataSource } from '../../../../src';
import { closeTestingConnections, createTestingConnections } from '../../../utils/test-utils';
import { ViewC } from './entity/ViewC';
import { ViewA } from './entity/ViewA';
import { ViewB } from './entity/ViewB';
import { TestEntity } from './entity/Test';

describe('views dependencies', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				enabledDrivers: ['postgres'],
				schemaCreate: true,
				dropSchema: true,
				// entities: [ViewC, ViewB, ViewA, TestEntity],
				entities: [TestEntity, ViewA, ViewB, ViewC],
			})),
	);
	after(() => closeTestingConnections(connections));

	it('should generate drop and create queries in correct order', () =>
		Promise.all(
			connections.map(async (connection) => {
				const expectedDrops: RegExp[] = [];
				const expectedCreates: RegExp[] = [];
				// Views in order in which they should be created
				for (const view of [ViewA, ViewB, ViewC]) {
					const metadata = connection.getMetadata(view);
					// Modify ViewA, this should trigger updates on all views that depend on it
					if (view === ViewA) {
						metadata.expression = (metadata.expression as string)?.replace('V1', 'V2');
					}
					expectedDrops.push(new RegExp(`^DROP\\s+VIEW.*"${metadata.tableName}"`));
					expectedCreates.push(new RegExp(`^CREATE\\s+VIEW.*"${metadata.tableName}"`));
				}
				// Drop order should be reverse of create order
				expectedDrops.reverse();
				const sqlInMemory = await connection.driver.createSchemaBuilder().log();
				// console.log(sqlInMemory.upQueries.map(q => q.query));
				const dropPositions = expectedDrops.map((expected) =>
					sqlInMemory.upQueries.findIndex((q) => q.query.match(expected)),
				);
				// console.log("dropPositions", dropPositions);
				expect(dropPositions).to.have.length(3);
				const dropPositionsSorted = dropPositions.slice().sort((a, b) => a - b);
				expect(dropPositions).eql(dropPositionsSorted);
				const createPositions = expectedCreates.map((expected) =>
					sqlInMemory.upQueries.findIndex((q) => q.query.match(expected)),
				);
				// console.log("createPositions", createPositions);
				expect(createPositions).to.have.length(3);
				const createPositionsSorted = createPositions.slice().sort((a, b) => a - b);
				expect(createPositions).eql(createPositionsSorted);
			}),
		));
});
