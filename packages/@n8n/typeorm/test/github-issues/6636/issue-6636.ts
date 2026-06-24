import { DataSource } from '../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { Test } from './entity/Test';
import { expect } from 'chai';

describe('github issues > #6636 migration issues with scale & precision', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [Test],
				enabledDrivers: ['sqlite', 'sqlite-pooled'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should not create migrations columns with precision', async () => {
		await Promise.all(
			connections.map(async (connection) => {
				const sqlInMemory = await connection.driver.createSchemaBuilder().log();
				expect(sqlInMemory.upQueries).to.eql([]);
				expect(sqlInMemory.downQueries).to.eql([]);
			}),
		);
	});
});
