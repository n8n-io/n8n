import 'reflect-metadata';
import { expect } from 'chai';
import { DataSource } from '../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';

describe('sqlite driver > throws an error when queried after closing connection', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [],
				enabledDrivers: ['sqlite', 'sqlite-pooled'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should throw', () =>
		Promise.all(
			connections.map(async (connection) => {
				await connection.close();
				await expect(connection.query('select * from sqlite_master;')).to.rejectedWith(
					'Connection with sqlite database is not established. Check connection configuration.',
				);
			}),
		));
});
