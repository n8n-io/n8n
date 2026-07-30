import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { User } from './entity/User';
import { expect } from 'chai';

describe('github issues > #867 result of `findAndCount` is wrong when apply `skip` and `take` option', () => {
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
				const userRepository = connection.getRepository(User);
				const users = new Array(5).fill(0).map((n, i) => {
					const user = new User();
					user.username = `User_${i}`;
					return user;
				});
				await userRepository.save(users);
				const [foundUsers, totalCount] = await userRepository.findAndCount({
					skip: 1,
					take: 2,
					order: {
						username: 'ASC',
					},
				});
				expect(totalCount).to.equal(5);
				expect(foundUsers).to.have.lengthOf(2);
				expect(foundUsers[0].username).to.equal('User_1');
			}),
		));
});
