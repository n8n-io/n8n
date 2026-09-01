import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../../utils/test-utils';
import { DataSource } from '../../../../../src/data-source/DataSource';
import { PostWithRelation } from './entity/PostWithRelation';

// This test is neccessary because finding with eager relation will be run in the different way
describe(`query builder > find with the global condition of "non-deleted" and eager relation`, () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it(`The global condition of "non-deleted" should be set for the entity with delete date columns and eager relation`, () =>
		Promise.all(
			connections.map(async (connection) => {
				const post1 = new PostWithRelation();
				post1.title = 'title#1';
				const post2 = new PostWithRelation();
				post2.title = 'title#2';
				const post3 = new PostWithRelation();
				post3.title = 'title#3';

				await connection.manager.save(post1);
				await connection.manager.save(post2);
				await connection.manager.save(post3);

				await connection.manager.softRemove(post1);

				const loadedWithPosts = await connection
					.createQueryBuilder()
					.select('post')
					.from(PostWithRelation, 'post')
					.orderBy('post.id')
					.getMany();
				loadedWithPosts!.length.should.be.equal(2);
				loadedWithPosts![0].title.should.be.equals('title#2');
				loadedWithPosts![1].title.should.be.equals('title#3');

				const loadedWithPost = await connection
					.createQueryBuilder()
					.select('post')
					.from(PostWithRelation, 'post')
					.orderBy('post.id')
					.getOne();
				loadedWithPost!.title.should.be.equals('title#2');
			}),
		));

	it(`The global condition of "non-deleted" should not be set when "withDeleted" is called`, () =>
		Promise.all(
			connections.map(async (connection) => {
				const post1 = new PostWithRelation();
				post1.title = 'title#1';
				const post2 = new PostWithRelation();
				post2.title = 'title#2';
				const post3 = new PostWithRelation();
				post3.title = 'title#3';

				await connection.manager.save(post1);
				await connection.manager.save(post2);
				await connection.manager.save(post3);

				await connection.manager.softRemove(post1);

				const loadedPosts = await connection
					.createQueryBuilder()
					.select('post')
					.from(PostWithRelation, 'post')
					.withDeleted()
					.orderBy('post.id')
					.getMany();

				loadedPosts!.length.should.be.equal(3);
				loadedPosts![0].title.should.be.equals('title#1');
				loadedPosts![1].title.should.be.equals('title#2');
				loadedPosts![2].title.should.be.equals('title#3');

				const loadedWithoutScopePost = await connection
					.createQueryBuilder()
					.select('post')
					.from(PostWithRelation, 'post')
					.withDeleted()
					.orderBy('post.id')
					.getOne();
				loadedWithoutScopePost!.title.should.be.equals('title#1');
			}),
		));
});
