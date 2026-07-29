import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { User } from './entity/User';
import { Role } from './entity/Role';

describe('other issues > auto-increment id as string', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should relationIds exist', () =>
		Promise.all(
			connections.map(async function (connection) {
				const role1 = new Role();
				role1.roleName = '#role 1';
				const role2 = new Role();
				role2.roleName = '#role 2';

				const user = new User();
				user.userName = '#user 1';
				user.roles = [await connection.manager.save(role1), await connection.manager.save(role2)];

				const user2 = await connection.manager.save(user);

				const user3 = await connection.manager.findOne(User, {
					where: {
						userId: user2.userId,
					},
					loadRelationIds: true,
				});
				user3!.roles.length.should.be.equal(2);
			}),
		));
});
