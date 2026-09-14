import 'reflect-metadata';
import { expect } from 'chai';
import { DataSource } from '../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { Test } from './entity/Test';

describe('github issues > #6633 Fulltext indices continually dropped & re-created', () => {
	let connections: DataSource[];
	before(async () => {
		connections = await createTestingConnections({
			entities: [Test],
			schemaCreate: true,
			dropSchema: true,
		});
	});
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should not create migrations for fulltext indices', () =>
		Promise.all(
			connections.map(async (connection) => {
				const sqlInMemory = await connection.driver.createSchemaBuilder().log();

				expect(sqlInMemory.upQueries).to.eql([]);
				expect(sqlInMemory.downQueries).to.eql([]);
			}),
		));
});
