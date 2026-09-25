import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Post } from './entity/Post';
import { User } from './entity/User';

describe('github issues > #1178 subqueries must work in insert statements', () => {
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

	it('should work fine', () =>
		Promise.all(
			connections.map(async (connection) => {
				const user = new User();
				user.name = 'Timber Saw';
				await connection.manager.save(user);

				await connection
					.getRepository(Post)
					.createQueryBuilder()
					.insert()
					.values({
						name: 'First post',
						user: () => `(SELECT "user"."id" FROM "user" WHERE "user"."name" = :userName)`,
					})
					.setParameter('userName', 'Timber Saw')
					.returning('*')
					.execute();

				await connection.manager
					.findOne(Post, {
						where: {
							id: 1,
						},
						relations: { user: true },
					})
					.should.eventually.eql({
						id: 1,
						name: 'First post',
						user: {
							id: 1,
							name: 'Timber Saw',
						},
					});
			}),
		));
});
