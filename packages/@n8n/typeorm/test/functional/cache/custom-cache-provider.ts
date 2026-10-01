import 'reflect-metadata';
import { expect } from 'chai';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
	sleep,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { User } from './entity/User';
import { MockQueryResultCache } from './provider/MockQueryResultCache';
import { Address } from './entity/Address';

describe('custom cache provider', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				cache: {
					provider(connection) {
						return new MockQueryResultCache(connection);
					},
				},
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should be used instead of built-ins', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryResultCache: any = connection.queryResultCache;
				expect(queryResultCache).to.have.property('queryResultCacheTable');

				const queryResultCacheTable = queryResultCache.queryResultCacheTable;
				expect(queryResultCacheTable).to.contain('mock');
			}),
		));

	it('should cache results properly', () =>
		Promise.all(
			connections.map(async (connection) => {
				// first prepare data - insert users
				const user1 = new User();
				user1.firstName = 'Timber';
				user1.lastName = 'Saw';
				user1.isAdmin = false;
				await connection.manager.save(user1);

				const user2 = new User();
				user2.firstName = 'Alex';
				user2.lastName = 'Messer';
				user2.isAdmin = false;
				await connection.manager.save(user2);

				const user3 = new User();
				user3.firstName = 'Umed';
				user3.lastName = 'Pleerock';
				user3.isAdmin = true;
				await connection.manager.save(user3);

				// select for the first time with caching enabled
				const users1 = await connection
					.createQueryBuilder(User, 'user')
					.where('user.isAdmin = :isAdmin', { isAdmin: true })
					.cache(true)
					.getMany();
				expect(users1.length).to.be.equal(1);

				// insert new entity
				const user4 = new User();
				user4.firstName = 'Bakhrom';
				user4.lastName = 'Brochik';
				user4.isAdmin = true;
				await connection.manager.save(user4);

				// without cache it must return really how many there entities are
				const users2 = await connection
					.createQueryBuilder(User, 'user')
					.where('user.isAdmin = :isAdmin', { isAdmin: true })
					.getMany();
				expect(users2.length).to.be.equal(2);

				// but with cache enabled it must not return newly inserted entity since cache is not expired yet
				const users3 = await connection
					.createQueryBuilder(User, 'user')
					.where('user.isAdmin = :isAdmin', { isAdmin: true })
					.cache(true)
					.getMany();
				expect(users3.length).to.be.equal(1);

				// give some time for cache to expire
				await sleep(1000);

				// now, when our cache has expired we check if we have new user inserted even with cache enabled
				const users4 = await connection
					.createQueryBuilder(User, 'user')
					.where('user.isAdmin = :isAdmin', { isAdmin: true })
					.cache(true)
					.getMany();
				expect(users4.length).to.be.equal(2);
			}),
		));

	it('should cache results with pagination enabled properly', () =>
		Promise.all(
			connections.map(async (connection) => {
				// first prepare data - insert users
				const user1 = new User();
				user1.firstName = 'Timber';
				user1.lastName = 'Saw';
				user1.isAdmin = false;
				await connection.manager.save(user1);

				const user2 = new User();
				user2.firstName = 'Alex';
				user2.lastName = 'Messer';
				user2.isAdmin = false;
				await connection.manager.save(user2);

				const user3 = new User();
				user3.firstName = 'Umed';
				user3.lastName = 'Pleerock';
				user3.isAdmin = true;
				await connection.manager.save(user3);

				// select for the first time with caching enabled
				const users1 = await connection
					.createQueryBuilder(User, 'user')
					.where('user.isAdmin = :isAdmin', { isAdmin: false })
					.skip(1)
					.take(5)
					.orderBy('user.id')
					.cache(true)
					.getMany();
				expect(users1.length).to.be.equal(1);

				// insert new entity
				const user4 = new User();
				user4.firstName = 'Bakhrom';
				user4.lastName = 'Bro';
				user4.isAdmin = false;
				await connection.manager.save(user4);

				// without cache it must return really how many there entities are
				const users2 = await connection
					.createQueryBuilder(User, 'user')
					.where('user.isAdmin = :isAdmin', { isAdmin: false })
					.skip(1)
					.take(5)
					.orderBy('user.id')
					.getMany();
				expect(users2.length).to.be.equal(2);

				// but with cache enabled it must not return newly inserted entity since cache is not expired yet
				const users3 = await connection
					.createQueryBuilder(User, 'user')
					.where('user.isAdmin = :isAdmin', { isAdmin: false })
					.skip(1)
					.take(5)
					.cache(true)
					.orderBy('user.id')
					.getMany();
				expect(users3.length).to.be.equal(1);

				// give some time for cache to expire
				await sleep(1000);

				// now, when our cache has expired we check if we have new user inserted even with cache enabled
				const users4 = await connection
					.createQueryBuilder(User, 'user')
					.where('user.isAdmin = :isAdmin', { isAdmin: false })
					.skip(1)
					.take(5)
					.cache(true)
					.orderBy('user.id')
					.getMany();
				expect(users4.length).to.be.equal(2);
			}),
		));

	it('should cache results with custom id and duration supplied', () =>
		Promise.all(
			connections.map(async (connection) => {
				// first prepare data - insert users
				const user1 = new User();
				user1.firstName = 'Timber';
				user1.lastName = 'Saw';
				user1.isAdmin = false;
				await connection.manager.save(user1);

				const user2 = new User();
				user2.firstName = 'Alex';
				user2.lastName = 'Messer';
				user2.isAdmin = false;
				await connection.manager.save(user2);

				const user3 = new User();
				user3.firstName = 'Umed';
				user3.lastName = 'Pleerock';
				user3.isAdmin = true;
				await connection.manager.save(user3);

				// select for the first time with caching enabled
				const users1 = await connection
					.createQueryBuilder(User, 'user')
					.where('user.isAdmin = :isAdmin', { isAdmin: false })
					.skip(1)
					.take(5)
					.cache('user_admins', 2000)
					.orderBy('user.id')
					.getMany();
				expect(users1.length).to.be.equal(1);

				// insert new entity
				const user4 = new User();
				user4.firstName = 'Bakhrom';
				user4.lastName = 'Bro';
				user4.isAdmin = false;
				await connection.manager.save(user4);

				// without cache it must return really how many there entities are
				const users2 = await connection
					.createQueryBuilder(User, 'user')
					.where('user.isAdmin = :isAdmin', { isAdmin: false })
					.skip(1)
					.take(5)
					.orderBy('user.id')
					.getMany();
				expect(users2.length).to.be.equal(2);

				// give some time for cache to expire
				await sleep(1000);

				// but with cache enabled it must not return newly inserted entity since cache is not expired yet
				const users3 = await connection
					.createQueryBuilder(User, 'user')
					.where('user.isAdmin = :isAdmin', { isAdmin: false })
					.skip(1)
					.take(5)
					.orderBy('user.id')
					.cache('user_admins', 2000)
					.getMany();
				expect(users3.length).to.be.equal(1);

				// give some time for cache to expire
				await sleep(1000);

				// now, when our cache has expired we check if we have new user inserted even with cache enabled
				const users4 = await connection
					.createQueryBuilder(User, 'user')
					.where('user.isAdmin = :isAdmin', { isAdmin: false })
					.skip(1)
					.take(5)
					.orderBy('user.id')
					.cache('user_admins', 2000)
					.getMany();
				expect(users4.length).to.be.equal(2);
			}),
		));

	it('should cache results with pagination enabled properly and custom id and loaded relations', () =>
		Promise.all(
			connections.map(async (connection) => {
				const noUser = await connection.manager.getRepository(User).findOne({
					where: { isAdmin: false },
					relations: { addresses: true },
					cache: { id: 'user-address', milliseconds: 2000 },
				});

				expect(noUser).to.be.null;

				// first prepare data - insert users
				const user1 = new User();
				user1.firstName = 'Timber';
				user1.lastName = 'Saw';
				user1.isAdmin = false;
				await connection.manager.save(user1);

				const user1Address = new Address();
				user1Address.address = '1 random street';
				user1Address.user = user1;
				await connection.manager.save(user1Address);

				const user1Cached = await connection.manager.getRepository(User).findOne({
					relations: { addresses: true },
					where: { isAdmin: false },
					cache: { id: 'user-address', milliseconds: 2000 },
				});
				expect(user1Cached).to.be.null;

				const user1WithAddressWithOtherCacheId = await connection.manager
					.getRepository(User)
					.findOne({
						relations: { addresses: true },
						where: { isAdmin: false },
						cache: {
							id: 'user-1-different-cache-id',
							milliseconds: 2000,
						},
					});

				expect(user1WithAddressWithOtherCacheId?.addresses).to.have.length(1);
			}),
		));

	it('should cache results with custom id and duration supplied', () =>
		Promise.all(
			connections.map(async (connection) => {
				// first prepare data - insert users
				const user1 = new User();
				user1.firstName = 'Timber';
				user1.lastName = 'Saw';
				user1.isAdmin = false;
				await connection.manager.save(user1);

				const user2 = new User();
				user2.firstName = 'Alex';
				user2.lastName = 'Messer';
				user2.isAdmin = false;
				await connection.manager.save(user2);

				const user3 = new User();
				user3.firstName = 'Umed';
				user3.lastName = 'Pleerock';
				user3.isAdmin = true;
				await connection.manager.save(user3);

				// select for the first time with caching enabled
				const users1 = await connection
					.createQueryBuilder(User, 'user')
					.where('user.isAdmin = :isAdmin', { isAdmin: true })
					.cache(true)
					.getCount();
				expect(users1).to.be.equal(1);

				// insert new entity
				const user4 = new User();
				user4.firstName = 'Bakhrom';
				user4.lastName = 'Brochik';
				user4.isAdmin = true;
				await connection.manager.save(user4);

				// without cache it must return really how many there entities are
				const users2 = await connection
					.createQueryBuilder(User, 'user')
					.where('user.isAdmin = :isAdmin', { isAdmin: true })
					.getCount();
				expect(users2).to.be.equal(2);

				// but with cache enabled it must not return newly inserted entity since cache is not expired yet
				const users3 = await connection
					.createQueryBuilder(User, 'user')
					.where('user.isAdmin = :isAdmin', { isAdmin: true })
					.cache(true)
					.getCount();
				expect(users3).to.be.equal(1);

				// give some time for cache to expire
				await sleep(1000);

				// now, when our cache has expired we check if we have new user inserted even with cache enabled
				const users4 = await connection
					.createQueryBuilder(User, 'user')
					.where('user.isAdmin = :isAdmin', { isAdmin: true })
					.cache(true)
					.getCount();
				expect(users4).to.be.equal(2);
			}),
		));
});
