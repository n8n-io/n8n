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

describe('other issues > using limit in conjunction with order by', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should persist successfully and return persisted entity', () =>
		Promise.all(
			connections.map(async function (connection) {
				// generate bulk array of posts with categories
				for (let i = 1; i <= 100; i++) {
					const post = new Post();
					post.title = 'Hello Post #' + i;
					post.categories = [];

					for (let i = 1; i <= 5; i++) {
						const category = new Category();
						category.name = 'category #' + i;
						post.categories.push(category);
					}
					await connection.manager.save(post);
				}

				// check if ordering by main object works correctly

				const loadedPosts1 = await connection.manager
					.createQueryBuilder(Post, 'post')
					.innerJoinAndSelect('post.categories', 'categories')
					.take(10)
					.orderBy('post.id', 'DESC')
					.getMany();

				expect(loadedPosts1).not.to.be.undefined;
				loadedPosts1.length.should.be.equal(10);
				loadedPosts1[0].id.should.be.equal(100);
				loadedPosts1[1].id.should.be.equal(99);
				loadedPosts1[2].id.should.be.equal(98);
				loadedPosts1[3].id.should.be.equal(97);
				loadedPosts1[4].id.should.be.equal(96);
				loadedPosts1[5].id.should.be.equal(95);
				loadedPosts1[6].id.should.be.equal(94);
				loadedPosts1[7].id.should.be.equal(93);
				loadedPosts1[8].id.should.be.equal(92);
				loadedPosts1[9].id.should.be.equal(91);
			}),
		));
});
