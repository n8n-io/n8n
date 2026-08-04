import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Post } from './entity/Post';
import { expect } from 'chai';
import { Category } from './entity/Category';
import { Tag } from './entity/Tag';

describe('github issues > #234 and #223 lazy loading does not work correctly from one-to-many and many-to-many sides', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				enabledDrivers: ['postgres', 'sqlite-pooled'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should correctly load from one-to-many and many-to-one sides', () =>
		Promise.all(
			connections.map(async (connection) => {
				// pre-populate database first
				for (let i = 1; i <= 10; i++) {
					const post = new Post();
					post.title = 'fake post # ' + i;
					if (i > 5) {
						const category = new Category();
						category.name = 'fake category!';
						post.category = Promise.resolve(category);
					}
					await connection.manager.save(post);
				}

				// create objects to save
				const category1 = new Category();
				category1.name = 'category #1';

				const post1 = new Post();
				post1.title = 'Hello Post #1';
				post1.category = Promise.resolve(category1);

				const category2 = new Category();
				category2.name = 'category #2';

				const post2 = new Post();
				post2.title = 'Hello Post #2';
				post2.category = Promise.resolve(category2);

				// persist
				await connection.manager.save(post1);
				await connection.manager.save(post2);

				// check that all persisted objects exist
				const loadedPosts = await connection.manager
					.createQueryBuilder(Post, 'post')
					.where('post.title = :firstTitle OR post.title = :secondTitle', {
						firstTitle: 'Hello Post #1',
						secondTitle: 'Hello Post #2',
					})
					.getMany();

				const loadedCategory1 = await loadedPosts[0].category;
				expect(loadedCategory1!).not.to.be.null;
				loadedCategory1!.name.should.equal('category #1');

				const loadedCategory2 = await loadedPosts[1].category;
				expect(loadedCategory2!).not.to.be.null;
				loadedCategory2!.name.should.equal('category #2');

				const loadedPosts1 = await loadedCategory1.posts;
				expect(loadedPosts1!).not.to.be.undefined;
				loadedPosts1![0].title.should.equal('Hello Post #1');

				const loadedPosts2 = await loadedCategory2.posts;
				expect(loadedPosts2!).not.to.be.undefined;
				loadedPosts2![0].title.should.equal('Hello Post #2');
			}),
		));

	it('should correctly load from both many-to-many sides', () =>
		Promise.all(
			connections.map(async (connection) => {
				// pre-populate database first
				for (let i = 1; i <= 10; i++) {
					const post = new Post();
					post.title = 'fake post # ' + i;
					for (let j = 1; j <= i; j++) {
						const tag = new Tag();
						tag.name = 'fake tag!';
						post.tags = Promise.resolve((await post.tags).concat([tag]));
					}
					await connection.manager.save(post);
				}

				// create objects to save
				const tag1_1 = new Tag();
				tag1_1.name = 'tag #1_1';

				const tag1_2 = new Tag();
				tag1_2.name = 'tag #1_2';

				const post1 = new Post();
				post1.title = 'Hello Post #1';
				post1.tags = Promise.resolve([tag1_1, tag1_2]);

				const tag2_1 = new Tag();
				tag2_1.name = 'tag #2_1';

				const tag2_2 = new Tag();
				tag2_2.name = 'tag #2_2';

				const tag2_3 = new Tag();
				tag2_3.name = 'tag #2_3';

				const post2 = new Post();
				post2.title = 'Hello Post #2';
				post2.tags = Promise.resolve([tag2_1, tag2_2, tag2_3]);

				// persist
				await connection.manager.save(post1);
				await connection.manager.save(post2);

				// check that all persisted objects exist
				const loadedPosts = await connection.manager
					.createQueryBuilder(Post, 'post')
					.where('post.title = :firstTitle OR post.title = :secondTitle', {
						firstTitle: 'Hello Post #1',
						secondTitle: 'Hello Post #2',
					})
					.getMany();

				// check owner side

				const loadedTags1 = await loadedPosts[0].tags;
				expect(loadedTags1).not.to.be.undefined;
				loadedTags1.length.should.be.equal(2);
				loadedTags1[0].name.should.equal('tag #1_1');
				loadedTags1[1].name.should.equal('tag #1_2');

				const loadedTags2 = await loadedPosts[1].tags;
				expect(loadedTags2).not.to.be.undefined;
				loadedTags2.length.should.be.equal(3);
				loadedTags2[0].name.should.equal('tag #2_1');
				loadedTags2[1].name.should.equal('tag #2_2');
				loadedTags2[2].name.should.equal('tag #2_3');

				// check inverse side

				const loadedPosts1 = await loadedTags1[0].posts;
				expect(loadedPosts1).not.to.be.undefined;
				loadedPosts1.length.should.be.equal(1);
				loadedPosts1[0].title.should.equal('Hello Post #1');

				const loadedPosts2 = await loadedTags2[0].posts;
				expect(loadedPosts2).not.to.be.undefined;
				loadedPosts2.length.should.be.equal(1);
				loadedPosts2[0].title.should.equal('Hello Post #2');
			}),
		));
});
