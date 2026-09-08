import '../../utils/test-setup';
import { expect } from 'chai';
import { DataSource } from '../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { Test } from './entity/Test';

describe('github issues > #7650 Inappropriate migration generated', () => {
	let connections: DataSource[];

	before(async () => {
		connections = await createTestingConnections({
			enabledDrivers: ['postgres'],
			entities: [Test],
			schemaCreate: true,
			dropSchema: true,
		});
	});
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should not create migrations for json default which are equivalent', () =>
		Promise.all(
			connections.map(async (connection) => {
				const sqlInMemory = await connection.driver.createSchemaBuilder().log();

				expect(sqlInMemory.upQueries).to.eql([]);
				expect(sqlInMemory.downQueries).to.eql([]);
			}),
		));
});
