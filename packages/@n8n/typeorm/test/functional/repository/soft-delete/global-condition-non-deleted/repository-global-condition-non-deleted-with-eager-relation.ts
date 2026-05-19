import 'reflect-metadata';
import { expect } from 'chai';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../../utils/test-utils';
import { DataSource } from '../../../../../src/data-source/DataSource';
import { PostWithRelation } from './entity/PostWithRelation';

// This test is neccessary because finding with eager relation will be run in the different way
describe(`repository > the global condtion of "non-deleted" with eager relation`, () => {
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

				const loadedPosts = await connection.getRepository(PostWithRelation).find();
				loadedPosts!.length.should.be.equal(2);
				const loadedPost2 = loadedPosts.find((p) => p.id === 2);
				expect(loadedPost2).to.exist;
				expect(loadedPost2!.deletedAt).to.equals(null);
				expect(loadedPost2!.title).to.equals('title#2');
				const loadedPost3 = loadedPosts.find((p) => p.id === 3);
				expect(loadedPost3).to.exist;
				expect(loadedPost3!.deletedAt).to.equals(null);
				expect(loadedPost3!.title).to.equals('title#3');
			}),
		));

	it(`The global condition of "non-deleted" should not be set when the option "withDeleted" is set to true`, () =>
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

				const loadedPosts = await connection.getRepository(PostWithRelation).find({
					withDeleted: true,
				});

				loadedPosts!.length.should.be.equal(3);
				const loadedPost1 = loadedPosts.find((p) => p.id === 1);
				expect(loadedPost1).to.exist;
				expect(loadedPost1!.deletedAt).to.be.instanceof(Date);
				expect(loadedPost1!.title).to.equals('title#1');
				const loadedPost2 = loadedPosts.find((p) => p.id === 2);
				expect(loadedPost2).to.exist;
				expect(loadedPost2!.deletedAt).to.equals(null);
				expect(loadedPost2!.title).to.equals('title#2');
				const loadedPost3 = loadedPosts.find((p) => p.id === 3);
				expect(loadedPost3).to.exist;
				expect(loadedPost3!.deletedAt).to.equals(null);
				expect(loadedPost3!.title).to.equals('title#3');

				const loadedPost = await connection.getRepository(PostWithRelation).findOne({
					where: {
						id: 1,
					},
					withDeleted: true,
				});
				expect(loadedPost).to.exist;
				expect(loadedPost!.title).to.equals('title#1');
			}),
		));
});
