import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Post } from './entity/Post';
import { Category } from './entity/Category';
import { PostCategory } from './entity/PostCategory';
import { expect } from 'chai';

describe('github issues > #58 relations with multiple primary keys', () => {
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
			connections.map(async (connection) => {
				// create objects to save
				const category1 = new Category();
				category1.name = 'category #1';

				const category2 = new Category();
				category2.name = 'category #2';

				const post = new Post();
				post.title = 'Hello Post #1';

				const postCategory1 = new PostCategory();
				postCategory1.addedByAdmin = true;
				postCategory1.addedByUser = false;
				postCategory1.category = category1;
				postCategory1.post = post;

				const postCategory2 = new PostCategory();
				postCategory2.addedByAdmin = false;
				postCategory2.addedByUser = true;
				postCategory2.category = category2;
				postCategory2.post = post;

				await connection.manager.save(postCategory1);
				await connection.manager.save(postCategory2);

				// check that all persisted objects exist
				const loadedPost = await connection.manager
					.createQueryBuilder(Post, 'post')
					.innerJoinAndSelect('post.categories', 'postCategory')
					.innerJoinAndSelect('postCategory.category', 'category')
					.addOrderBy('postCategory.categoryId')
					.getOne();

				expect(loadedPost!).not.to.be.null;
				loadedPost!.should.be.eql({
					id: 1,
					title: 'Hello Post #1',
					categories: [
						{
							categoryId: 1,
							postId: 1,
							addedByAdmin: true,
							addedByUser: false,
							category: {
								id: 1,
								name: 'category #1',
							},
						},
						{
							categoryId: 2,
							postId: 1,
							addedByAdmin: false,
							addedByUser: true,
							category: {
								id: 2,
								name: 'category #2',
							},
						},
					],
				});
			}),
		));
});
