import 'reflect-metadata';
import '../../utils/test-setup';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { User } from './entity/User';
import { UserCredential } from './entity/UserCredential';

describe("github issues > #836 .save won't update entity when it contains OneToOne relationship", () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should work perfectly', () =>
		Promise.all(
			connections.map(async (connection) => {
				// just insert another dummy user
				const user1 = new User();
				user1.email = 'user1@user.com';
				user1.username = 'User 1';
				user1.privilege = 0;
				await connection.manager.save(user1);

				// create a user but do not insert it
				const user2 = new User();
				user2.email = 'user2@user.com';
				user2.username = 'User 2';
				user2.privilege = 0;

				// now create credentials and let user to be saved by cascades
				const credential = new UserCredential();
				credential.password = 'ABC';
				credential.salt = 'CDE';
				credential.user = user2;
				await connection.manager.save(credential);

				// check if credentials and user are saved properly
				const loadedCredentials = await connection.manager.findOne(UserCredential, {
					where: {
						id: 2,
					},
					relations: {
						user: true,
					},
				});
				loadedCredentials!.should.be.eql({
					id: 2,
					user: {
						id: 2,
						email: 'user2@user.com',
						username: 'User 2',
						privilege: 0,
					},
					password: 'ABC',
					salt: 'CDE',
				});
			}),
		));
});
