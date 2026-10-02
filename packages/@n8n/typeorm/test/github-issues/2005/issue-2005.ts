import { DataSource } from '../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { User } from './entity/User';

describe('github issues > #2005', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				enabledDrivers: ['sqlite', 'sqlite-pooled'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should be able to find by boolean find', () =>
		Promise.all(
			connections.map(async (connection) => {
				const user = new User();
				user.activated = true;
				await connection.manager.save(user);
				user.activated.should.be.equal(true);
			}),
		));
});
