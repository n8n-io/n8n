import 'reflect-metadata';
import { Post } from './entity/Post';
import { Category } from './entity/Category';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../../utils/test-utils';
import { expect } from 'chai';
import { DataSource } from '../../../../../src/data-source/DataSource';

describe('query builder > relational query builder > load operation > many-to-one and one-to-one relations', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should load relation entity of a given entity object', () =>
		Promise.all(
			connections.map(async (connection) => {
				const category1 = new Category();
				category1.name = 'category #1';
				await connection.manager.save(category1);

				const category2 = new Category();
				category2.name = 'category #2';
				await connection.manager.save(category2);

				const category3 = new Category();
				category3.name = 'category #3';
				await connection.manager.save(category3);

				const post1 = new Post();
				post1.title = 'post #1';
				post1.category = category3;
				await connection.manager.save(post1);

				const post2 = new Post();
				post2.title = 'post #2';
				post2.category = category2;
				await connection.manager.save(post2);

				const post3 = new Post();
				post3.title = 'post #3';
				post3.category = category1;
				await connection.manager.save(post3);

				const loadedPost1 = await connection.manager.findOneBy(Post, {
					id: 1,
				});
				const loadedCategory1 = await connection
					.createQueryBuilder()
					.relation(Post, 'category')
					.of(loadedPost1)
					.loadOne();
				loadedPost1!.category = loadedCategory1!;

				expect(loadedPost1!.category).to.be.eql({
					id: 3,
					name: 'category #3',
				});

				const loadedPost2 = await connection.manager.findOneBy(Post, {
					id: 2,
				});
				const loadedCategory2 = await connection
					.createQueryBuilder()
					.relation(Post, 'category')
					.of(loadedPost2)
					.loadOne();
				loadedPost2!.category = loadedCategory2!;

				expect(loadedPost2!.category).to.be.eql({
					id: 2,
					name: 'category #2',
				});

				const loadedPost3 = await connection.manager.findOneBy(Post, {
					id: 3,
				});
				const loadedCategory3 = await connection
					.createQueryBuilder()
					.relation(Post, 'category')
					.of(loadedPost3)
					.loadOne();
				loadedPost3!.category = loadedCategory3!;

				expect(loadedPost3!.category).to.be.eql({
					id: 1,
					name: 'category #1',
				});
			}),
		));

	it('should load relation entity of a given entity id', () =>
		Promise.all(
			connections.map(async (connection) => {
				const category1 = new Category();
				category1.name = 'category #1';
				await connection.manager.save(category1);

				const category2 = new Category();
				category2.name = 'category #2';
				await connection.manager.save(category2);

				const category3 = new Category();
				category3.name = 'category #3';
				await connection.manager.save(category3);

				const post1 = new Post();
				post1.title = 'post #1';
				post1.category = category3;
				await connection.manager.save(post1);

				const post2 = new Post();
				post2.title = 'post #2';
				post2.category = category2;
				await connection.manager.save(post2);

				const post3 = new Post();
				post3.title = 'post #3';
				post3.category = category1;
				await connection.manager.save(post3);

				const loadedPost1 = await connection.manager.findOneBy(Post, {
					id: 1,
				});
				const loadedCategory1 = await connection
					.createQueryBuilder()
					.relation(Post, 'category')
					.of({ id: 1 })
					.loadOne();
				loadedPost1!.category = loadedCategory1!;

				expect(loadedPost1!.category).to.be.eql({
					id: 3,
					name: 'category #3',
				});

				const loadedPost2 = await connection.manager.findOneBy(Post, {
					id: 2,
				});
				const loadedCategory2 = await connection
					.createQueryBuilder()
					.relation(Post, 'category')
					.of({ id: 2 })
					.loadOne();
				loadedPost2!.category = loadedCategory2!;

				expect(loadedPost2!.category).to.be.eql({
					id: 2,
					name: 'category #2',
				});

				const loadedPost3 = await connection.manager.findOneBy(Post, {
					id: 3,
				});
				const loadedCategory3 = await connection
					.createQueryBuilder()
					.relation(Post, 'category')
					.of({ id: 3 })
					.loadOne();
				loadedPost3!.category = loadedCategory3!;

				expect(loadedPost3!.category).to.be.eql({
					id: 1,
					name: 'category #1',
				});
			}),
		));

	it('should load relation entity of a given id', () =>
		Promise.all(
			connections.map(async (connection) => {
				const category1 = new Category();
				category1.name = 'category #1';
				await connection.manager.save(category1);

				const category2 = new Category();
				category2.name = 'category #2';
				await connection.manager.save(category2);

				const category3 = new Category();
				category3.name = 'category #3';
				await connection.manager.save(category3);

				const post1 = new Post();
				post1.title = 'post #1';
				post1.category = category3;
				await connection.manager.save(post1);

				const post2 = new Post();
				post2.title = 'post #2';
				post2.category = category2;
				await connection.manager.save(post2);

				const post3 = new Post();
				post3.title = 'post #3';
				post3.category = category1;
				await connection.manager.save(post3);

				const loadedPost1 = await connection.manager.findOneBy(Post, {
					id: 1,
				});
				const loadedCategory1 = await connection
					.createQueryBuilder()
					.relation(Post, 'category')
					.of(1)
					.loadOne();
				loadedPost1!.category = loadedCategory1!;

				expect(loadedPost1!.category).to.be.eql({
					id: 3,
					name: 'category #3',
				});

				const loadedPost2 = await connection.manager.findOneBy(Post, {
					id: 2,
				});
				const loadedCategory2 = await connection
					.createQueryBuilder()
					.relation(Post, 'category')
					.of(2)
					.loadOne();
				loadedPost2!.category = loadedCategory2!;

				expect(loadedPost2!.category).to.be.eql({
					id: 2,
					name: 'category #2',
				});

				const loadedPost3 = await connection.manager.findOneBy(Post, {
					id: 3,
				});
				const loadedCategory3 = await connection
					.createQueryBuilder()
					.relation(Post, 'category')
					.of(3)
					.loadOne();
				loadedPost3!.category = loadedCategory3!;

				expect(loadedPost3!.category).to.be.eql({
					id: 1,
					name: 'category #1',
				});
			}),
		));
});
