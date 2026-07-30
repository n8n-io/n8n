import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { expect } from 'chai';
import { User } from './entity/User';

describe('github issues > #4277 Using cache in findAndCount and getManyAndCount returns 0 as count', () => {
	let connections: DataSource[];
	before(async () => {
		connections = await createTestingConnections({
			entities: [__dirname + '/entity/*{.js,.ts}'],
			schemaCreate: true,
			dropSchema: true,
			cache: {
				type: 'database',
			},
		});
	});
	beforeEach(async () => {
		await reloadTestingDatabases(connections);
		await Promise.all(
			connections.map((conn) => {
				const repo = conn.getRepository(User);

				const usersToInsert = [...Array(10)].map((e) => {
					const user = new User();
					user.name = 'Jeremy Clarkson';
					return user;
				});

				return repo.save(usersToInsert);
			}),
		);
	});
	after(() => closeTestingConnections(connections));

	it('getManyAndCount and findAndCount should count correctly when using cacheId', () =>
		Promise.all(
			connections.map(async (connection) => {
				const repo = connection.getRepository(User);

				const getManyAndCount = () =>
					repo.createQueryBuilder().cache('cache-id-1', 60000).getManyAndCount();

				const findAndCount = () =>
					repo.findAndCount({
						cache: {
							id: 'cache-id-2',
							milliseconds: 60000,
						},
					});

				const [users, count] = await getManyAndCount();
				expect(users.length).equal(10);
				expect(count).equal(10);

				const [users2, count2] = await findAndCount();
				expect(users2.length).equal(10);
				expect(count2).equal(10);

				await repo.save({ name: 'Jeremy Clarkson' });

				// After caching, both queries should be cached correctly. Save above should not affect results
				const [_users, _count] = await getManyAndCount();
				expect(_users.length).equal(10);
				expect(_count).equal(10);

				const [_users2, _count2] = await findAndCount();
				expect(_users2.length).equal(10);
				expect(_count2).equal(10);
			}),
		));

	it('getManyAndCount and findAndCount should count correctly when NOT using cacheId', () =>
		Promise.all(
			connections.map(async (connection) => {
				const repo = connection.getRepository(User);

				const getManyAndCount = () => repo.createQueryBuilder().cache(60000).getManyAndCount();

				const findAndCount = () =>
					repo.findAndCount({
						cache: 60000,
					});

				const [users, count] = await getManyAndCount();
				expect(users.length).equal(10);
				expect(count).equal(10);

				const [users2, count2] = await findAndCount();
				expect(users2.length).equal(10);
				expect(count2).equal(10);

				await repo.save({ name: 'Jeremy Clarkson' });

				// After caching, both queries should be cached correctly. Save above should not affect results
				const [_users, _count] = await getManyAndCount();
				expect(_users.length).equal(10);
				expect(_count).equal(10);

				const [_users2, _count2] = await findAndCount();
				expect(_users2.length).equal(10);
				expect(_count2).equal(10);
			}),
		));

	it('getManyAndCount and findAndCount should count correctly when NOT using cache', () =>
		Promise.all(
			connections.map(async (connection) => {
				const repo = connection.getRepository(User);

				const getManyAndCount = () => repo.createQueryBuilder().getManyAndCount();

				const findAndCount = () => repo.findAndCount();

				const [users, count] = await getManyAndCount();
				expect(users.length).equal(10);
				expect(count).equal(10);

				const [users2, count2] = await findAndCount();
				expect(users2.length).equal(10);
				expect(count2).equal(10);

				await repo.save({ name: 'Jeremy Clarkson' });

				// After queries, both should NOT be cached. Save above SHOULD affect results
				const [_users, _count] = await getManyAndCount();
				expect(_users.length).equal(11);
				expect(_count).equal(11);

				const [_users2, _count2] = await findAndCount();
				expect(_users2.length).equal(11);
				expect(_count2).equal(11);
			}),
		));
});
