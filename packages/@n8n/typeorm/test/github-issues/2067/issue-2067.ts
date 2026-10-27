import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { User } from './entity/User';
import { expect } from 'chai';

describe('github issues > #2067 Unhandled promise rejection warning on postgres connection issues', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				enabledDrivers: ['postgres'],
				entities: [__dirname + '/entity/*{.js,.ts}'],
				schemaCreate: true,
				dropSchema: true,
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should return a catchable error on connection errors in queries', () =>
		Promise.all(
			connections.map(async (connection) => {
				const connectionFailureMessage = 'Test error to simulate a connection error';

				if (connection.driver.options.type === 'postgres') {
					connection.driver.obtainMasterConnection = () =>
						Promise.reject<any>(new Error(connectionFailureMessage));
					connection.driver.obtainSlaveConnection = () =>
						Promise.reject<any>(new Error(connectionFailureMessage));
				}

				const repository = connection.getRepository(User);
				return expect(repository.find()).to.be.rejectedWith(Error, connectionFailureMessage);
			}),
		));
});
