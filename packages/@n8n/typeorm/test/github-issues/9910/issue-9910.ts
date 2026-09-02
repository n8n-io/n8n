import 'reflect-metadata';
import { expect } from 'chai';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { User } from './entity/User';

describe("github issues > #9910 Incorrect behaivor of 'alwaysEnabled: true' after change from issue #9023", () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				cache: {
					alwaysEnabled: true,
				},
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should automatically cache if alwaysEnabled', () =>
		Promise.all(
			connections.map(async (connection) => {
				const user1 = new User();
				user1.name = 'Foo';
				await connection.manager.save(user1);

				const users1 = await connection.createQueryBuilder(User, 'user').getMany();
				expect(users1.length).to.be.equal(1);

				const user2 = new User();
				user2.name = 'Bar';
				await connection.manager.save(user2);

				// result should be cached and second user should not be retrieved
				const users2 = await connection.createQueryBuilder(User, 'user').getMany();
				expect(users2.length).to.be.equal(1);

				// with cache explicitly disabled, the second user should be retrieved
				const users3 = await connection.createQueryBuilder(User, 'user').cache(false).getMany();
				expect(users3.length).to.be.equal(2);
			}),
		));
});
