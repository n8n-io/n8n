import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { User } from './entity/User';
import { expect } from 'chai';

describe('other issues > ekifox reported issue with increment', () => {
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

	it('getters and setters should work correctly', () =>
		Promise.all(
			connections.map(async (connection) => {
				const user = new User();
				user.id = 1;
				user.nickName = 'pleerock';
				await connection.manager.save(user);

				await connection.manager.update(
					User,
					{ id: 1 },
					{
						friendsInvitesCount: () => 'friends_invites_count + 1',
					},
				);

				const loadedUser = await connection.manager
					.createQueryBuilder(User, 'user')
					.where('user.id = :id', { id: 1 })
					.getOne();

				expect(loadedUser).not.to.be.null;
				loadedUser!.id.should.be.equal(1);
				loadedUser!.friendsInvitesCount.should.be.equal(1);
			}),
		));
});
