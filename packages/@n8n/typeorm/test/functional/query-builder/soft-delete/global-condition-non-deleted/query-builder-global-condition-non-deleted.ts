import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../../utils/test-utils';
import { DataSource } from '../../../../../src/data-source/DataSource';
import { Post } from './entity/Post';

describe(`query builder > find with the global condition of "non-deleted"`, () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it(`The global condition of "non-deleted" should be set for the entity with delete date columns`, () =>
		Promise.all(
			connections.map(async (connection) => {
				const post1 = new Post();
				post1.title = 'title#1';
				const post2 = new Post();
				post2.title = 'title#2';
				const post3 = new Post();
				post3.title = 'title#3';

				await connection.manager.save(post1);
				await connection.manager.save(post2);
				await connection.manager.save(post3);

				await connection.manager.softRemove(post1);

				const loadedPosts = await connection
					.createQueryBuilder()
					.select('post')
					.from(Post, 'post')
					.orderBy('post.id')
					.getMany();

				loadedPosts!.length.should.be.equal(2);
				loadedPosts![0].title.should.be.equals('title#2');
				loadedPosts![1].title.should.be.equals('title#3');

				const loadedPost = await connection
					.createQueryBuilder()
					.select('post')
					.from(Post, 'post')
					.orderBy('post.id')
					.getOne();
				loadedPost!.title.should.be.equals('title#2');
			}),
		));

	it(`The global condition of "non-deleted" should not be set when "withDeleted" is called`, () =>
		Promise.all(
			connections.map(async (connection) => {
				const post1 = new Post();
				post1.title = 'title#1';
				const post2 = new Post();
				post2.title = 'title#2';
				const post3 = new Post();
				post3.title = 'title#3';

				await connection.manager.save(post1);
				await connection.manager.save(post2);
				await connection.manager.save(post3);

				await connection.manager.softRemove(post1);

				const loadedPosts = await connection
					.createQueryBuilder()
					.select('post')
					.from(Post, 'post')
					.withDeleted()
					.orderBy('post.id')
					.getMany();

				loadedPosts!.length.should.be.equal(3);
				loadedPosts![0].title.should.be.equals('title#1');
				loadedPosts![1].title.should.be.equals('title#2');
				loadedPosts![2].title.should.be.equals('title#3');

				const loadedPost = await connection
					.createQueryBuilder()
					.select('post')
					.from(Post, 'post')
					.withDeleted()
					.orderBy('post.id')
					.getOne();
				loadedPost!.title.should.be.equals('title#1');
			}),
		));
});
