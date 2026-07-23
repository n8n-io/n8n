import { Post } from './entity/Post';
import { Category } from './entity/Category';
import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../../utils/test-utils';
import { DataSource } from '../../../../../src/data-source/DataSource';
import { expect } from 'chai';

describe('lazy-relations-loading-via-base-entity-finders', () => {
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

	it('works', async () => {
		for (let connection of connections) {
			Category.useDataSource(connection);
			Post.useDataSource(connection);
			const category = new Category();
			category.name = 'hello';
			await category.save();
			const post = new Post();
			post.title = 'hello post';
			post.category = Promise.resolve(category);
			await post.save();
			expect(
				(
					await Post.findOneByOrFail({
						category: { id: category.id, name: category.name },
					})
				).id,
			).equal(post.id);
			expect((await Post.findOneByOrFail({ category: { id: category.id } })).id).equal(post.id);
		}
	});
});
