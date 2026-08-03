import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Post } from './entity/Post';
import { Category } from './entity/Category';
import { expect } from 'chai';

describe('github issues > #996 already loaded via query builder relations should not be loaded again when they are lazily loaded', () => {
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

	it('should be able to find by object reference', () =>
		Promise.all(
			connections.map(async (connection) => {
				const category1 = new Category();
				category1.name = 'Category #1';
				await connection.manager.save(category1);

				const category2 = new Category();
				category2.name = 'Category #2';
				await connection.manager.save(category2);

				const post = new Post();
				post.title = 'Post #1';
				post.categories = Promise.resolve([category1, category2]);
				await connection.manager.save(post);

				const loadedPost = await connection.manager
					.createQueryBuilder(Post, 'post')
					.leftJoinAndSelect('post.categories', 'categories')
					.getOne();

				expect(loadedPost).to.not.be.undefined;
				const categories = await loadedPost!.categories;
				categories.should.be.eql([
					{
						id: 1,
						name: 'Category #1',
					},
					{
						id: 2,
						name: 'Category #2',
					},
				]);
			}),
		));
});
