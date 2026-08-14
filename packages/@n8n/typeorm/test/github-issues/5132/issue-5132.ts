import 'reflect-metadata';
import { DataSource } from '../../../src';

import { createTestingConnections, closeTestingConnections } from '../../utils/test-utils';

import { Foo } from './entity/foo.entity';

describe('github issues > #5132: Default of -1 (minus 1) generates useless migrations`', () => {
	describe('-1 (minus 1) in default value', () => {
		let connections: DataSource[];
		before(
			async () =>
				(connections = await createTestingConnections({
					schemaCreate: false,
					dropSchema: true,
					entities: [Foo],
					enabledDrivers: ['postgres'],
				})),
		);
		after(() => closeTestingConnections(connections));

		it('can recognize model changes', () =>
			Promise.all(
				connections.map(async (connection) => {
					const sqlInMemory = await connection.driver.createSchemaBuilder().log();

					sqlInMemory.upQueries.length.should.be.greaterThan(0);
					sqlInMemory.downQueries.length.should.be.greaterThan(0);
				}),
			));

		it('does not generate when no model changes', () =>
			Promise.all(
				connections.map(async (connection) => {
					await connection.driver.createSchemaBuilder().build();

					const sqlInMemory = await connection.driver.createSchemaBuilder().log();

					sqlInMemory.upQueries.length.should.be.equal(0);
					sqlInMemory.downQueries.length.should.be.equal(0);
				}),
			));
	});
});
