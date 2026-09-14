import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { DataSource } from '../../../../src/data-source/DataSource';
import { User } from './entity/User';
import { Post } from './entity/Post';
import { Category } from './entity/Category';

describe('query builder > sub-query', () => {
	// -------------------------------------------------------------------------
	// Prepare
	// -------------------------------------------------------------------------

	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	// -------------------------------------------------------------------------
	// Reusable functions
	// -------------------------------------------------------------------------

	async function prepare(connection: DataSource) {
		const user1 = new User();
		user1.name = 'Alex Messer';
		user1.registered = true;
		await connection.manager.save(user1);

		const user2 = new User();
		user2.name = 'Dima Zotov';
		user2.registered = true;
		await connection.manager.save(user2);

		const user3 = new User();
		user3.name = 'Umed Khudoiberdiev';
		user3.registered = false;
		await connection.manager.save(user3);

		const category1 = new Category();
		category1.name = 'Alex Messer';
		await connection.manager.save(category1);

		const category2 = new Category();
		category2.name = 'Dima Zotov';
		await connection.manager.save(category2);

		const post1 = new Post();
		post1.title = 'Alex Messer';
		post1.categories = [category1, category2];
		await connection.manager.save(post1);

		const post2 = new Post();
		post2.title = 'Dima Zotov';
		post2.categories = [category1, category2];
		await connection.manager.save(post2);

		const post3 = new Post();
		post3.title = 'Umed Khudoiberdiev';
		await connection.manager.save(post3);
	}

	// -------------------------------------------------------------------------
	// Specifications
	// -------------------------------------------------------------------------

	it('should execute sub query in where string using subQuery method', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepare(connection);

				const qb = await connection.getRepository(Post).createQueryBuilder('post');
				const posts = await qb
					.where(
						'post.title IN ' +
							qb
								.subQuery()
								.select('usr.name')
								.from(User, 'usr')
								.where('usr.registered = :registered')
								.getQuery(),
					)
					.setParameter('registered', true)
					.orderBy('post.id')
					.getMany();

				posts.should.be.eql([
					{ id: 1, title: 'Alex Messer' },
					{ id: 2, title: 'Dima Zotov' },
				]);
			}),
		));

	it('should execute sub query in where function using subQuery method', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepare(connection);

				const posts = await connection
					.getRepository(Post)
					.createQueryBuilder('post')
					.where((qb) => {
						const subQuery = qb
							.subQuery()
							.select('usr.name')
							.from(User, 'usr')
							.where('usr.registered = :registered')
							.getQuery();
						return 'post.title IN ' + subQuery;
					})
					.setParameter('registered', true)
					.orderBy('post.id')
					.getMany();

				posts.should.be.eql([
					{ id: 1, title: 'Alex Messer' },
					{ id: 2, title: 'Dima Zotov' },
				]);
			}),
		));

	it('should execute sub query in where function using subQuery method', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepare(connection);

				const posts = await connection
					.getRepository(Post)
					.createQueryBuilder('post')
					.where((qb) => {
						const subQuery = qb
							.subQuery()
							.select('usr.name')
							.from(User, 'usr')
							.where('usr.registered = :registered')
							.getQuery();
						return 'post.title IN ' + subQuery;
					})
					.setParameter('registered', true)
					.orderBy('post.id')
					.getMany();

				posts.should.be.eql([
					{ id: 1, title: 'Alex Messer' },
					{ id: 2, title: 'Dima Zotov' },
				]);
			}),
		));

	it('should execute sub query using different query builder', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepare(connection);

				const userQb = await connection
					.getRepository(User)
					.createQueryBuilder('usr')
					.select('usr.name')
					.where('usr.registered = :registered', { registered: true });

				const posts = await connection
					.getRepository(Post)
					.createQueryBuilder('post')
					.where('post.title IN (' + userQb.getQuery() + ')')
					.setParameters(userQb.getParameters())
					.orderBy('post.id')
					.getMany();

				posts.should.be.eql([
					{ id: 1, title: 'Alex Messer' },
					{ id: 2, title: 'Dima Zotov' },
				]);
			}),
		));

	it('should execute sub query in from expression (using different query builder)', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepare(connection);

				const userQb = await connection
					.getRepository(User)
					.createQueryBuilder('usr')
					.select('usr.name', 'name')
					.where('usr.registered = :registered', { registered: true });

				const posts = await connection
					.createQueryBuilder()
					.select(`${connection.driver.escape('usr')}.${connection.driver.escape('name')}`, 'name')
					.from('(' + userQb.getQuery() + ')', 'usr')
					.setParameters(userQb.getParameters())
					.getRawMany();

				posts.should.be.eql([{ name: 'Alex Messer' }, { name: 'Dima Zotov' }]);
			}),
		));

	it("should execute sub query in from expression (using from's query builder)", () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepare(connection);

				const userQb = await connection
					.getRepository(User)
					.createQueryBuilder('usr')
					.select('usr.name', 'name')
					.where('usr.registered = :registered', { registered: true });

				const posts = await connection
					.createQueryBuilder()
					.select(`${connection.driver.escape('usr')}.${connection.driver.escape('name')}`, 'name')
					.from((subQuery) => {
						return subQuery
							.select('usr.name', 'name')
							.from(User, 'usr')
							.where('usr.registered = :registered', {
								registered: true,
							});
					}, 'usr')
					.setParameters(userQb.getParameters())
					.getRawMany();

				posts.should.be.eql([{ name: 'Alex Messer' }, { name: 'Dima Zotov' }]);
			}),
		));

	it("should execute sub query in from expression (using from's query builder)", () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepare(connection);

				const userQb = await connection
					.getRepository(User)
					.createQueryBuilder('usr')
					.select('usr.name', 'name')
					.where('usr.registered = :registered', { registered: true });

				const posts = await connection
					.createQueryBuilder()
					.select(`${connection.driver.escape('usr')}.${connection.driver.escape('name')}`, 'name')
					.from((subQuery) => {
						return subQuery
							.select('usr.name', 'name')
							.from(User, 'usr')
							.where('usr.registered = :registered', {
								registered: true,
							});
					}, 'usr')
					.setParameters(userQb.getParameters())
					.getRawMany();

				posts.should.be.eql([{ name: 'Alex Messer' }, { name: 'Dima Zotov' }]);
			}),
		));

	it('should execute sub query in from expression as second from expression', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepare(connection);

				const posts = await connection
					.createQueryBuilder()
					.select('post')
					.from(Post, 'post')
					.addFrom((subQuery) => {
						return subQuery
							.select('usr.name', 'name')
							.from(User, 'usr')
							.where('usr.registered = :registered', {
								registered: true,
							});
					}, 'usr')
					.where(
						`${connection.driver.escape('post')}.${connection.driver.escape(
							'title',
						)} = ${connection.driver.escape('usr')}.${connection.driver.escape('name')}`,
					)
					.orderBy('post.id')
					.getMany();

				posts.should.be.eql([
					{ id: 1, title: 'Alex Messer' },
					{ id: 2, title: 'Dima Zotov' },
				]);
			}),
		));

	it('should execute sub query in selects', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepare(connection);

				const subQuery = connection
					.createQueryBuilder()
					.select('usr.name', 'name')
					.from(User, 'usr')
					.limit(1)
					.orderBy('usr.name')
					.getQuery();

				const posts = await connection
					.createQueryBuilder()
					.select('post.id', 'id')
					.addSelect(`(${subQuery})`, 'name')
					.from(Post, 'post')
					.orderBy('post.id')
					.getRawMany();

				posts.should.be.eql([
					{ id: 1, name: 'Alex Messer' },
					{ id: 2, name: 'Alex Messer' },
					{ id: 3, name: 'Alex Messer' },
				]);
			}),
		));

	it('should execute sub query in selects (using provided sub query builder)', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepare(connection);

				const posts = await connection
					.createQueryBuilder()
					.select('post.id', 'id')
					.addSelect((subQuery) => {
						return subQuery
							.select('usr.name', 'name')
							.from(User, 'usr')
							.orderBy('usr.name')
							.limit(1);
					}, 'name')
					.from(Post, 'post')
					.orderBy('post.id')
					.getRawMany();

				posts.should.be.eql([
					{ id: 1, name: 'Alex Messer' },
					{ id: 2, name: 'Alex Messer' },
					{ id: 3, name: 'Alex Messer' },
				]);
			}),
		));

	it('should execute sub query in joins (using provided sub query builder)', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepare(connection);

				const subQuery = connection
					.createQueryBuilder()
					.select('usr.name', 'name')
					.from(User, 'usr')
					.getQuery();

				const posts = await connection
					.getRepository(Post)
					.createQueryBuilder('post')
					.innerJoin(
						'post.categories',
						'category',
						`${connection.driver.escape('category')}.${connection.driver.escape(
							'name',
						)} IN (${subQuery})`,
					)
					.orderBy('post.id')
					.getMany();

				posts.should.be.eql([
					{ id: 1, title: 'Alex Messer' },
					{ id: 2, title: 'Dima Zotov' },
				]);
			}),
		));

	it('should execute sub query in joins with subquery factory (as selection)', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepare(connection);

				const joinConditionSubQuery = connection
					.createQueryBuilder()
					.select('usr.name', 'name')
					.from(User, 'usr')
					.getQuery();

				const posts = await connection
					.getRepository(Post)
					.createQueryBuilder('post')
					.innerJoin(
						(subQuery) => {
							return subQuery.select().from('category', 'category');
						},
						'category',
						`${connection.driver.escape('category')}.${connection.driver.escape(
							'name',
						)} IN (${joinConditionSubQuery})`,
					)
					.orderBy('post.id')
					.getMany();

				posts.should.be.eql([
					{ id: 1, title: 'Alex Messer' },
					{ id: 2, title: 'Dima Zotov' },
					{ id: 3, title: 'Umed Khudoiberdiev' },
				]);
			}),
		));

	it('should execute sub query in joins as string (as selection)', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepare(connection);

				const joinConditionSubQuery = connection
					.createQueryBuilder()
					.select('usr.name', 'name')
					.from(User, 'usr')
					.getQuery();

				const joinSubQuery = connection
					.createQueryBuilder()
					.select()
					.from('category', 'category')
					.getQuery();

				const posts = await connection
					.getRepository(Post)
					.createQueryBuilder('post')
					.innerJoin(
						'(' + joinSubQuery + ')',
						'category',
						`${connection.driver.escape('category')}.${connection.driver.escape(
							'name',
						)} IN (${joinConditionSubQuery})`,
					)
					.orderBy('post.id')
					.getMany();

				posts.should.be.eql([
					{ id: 1, title: 'Alex Messer' },
					{ id: 2, title: 'Dima Zotov' },
					{ id: 3, title: 'Umed Khudoiberdiev' },
				]);
			}),
		));
});
