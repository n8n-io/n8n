import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { User } from './entity/User';

describe('github issues > #948 EntityManager#save always considers a Postgres array-type field to have changed', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				enabledDrivers: ['postgres'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should not produce extra query when array is updated?', () =>
		Promise.all(
			connections.map(async (connection) => {
				const user = new User();
				user.name = 'Hello Test';
				user.roles = ['admin', 'user'];
				await connection.manager.save(user);

				// todo: produces update query but it should not
				await connection.manager.save(user);
			}),
		));
});
