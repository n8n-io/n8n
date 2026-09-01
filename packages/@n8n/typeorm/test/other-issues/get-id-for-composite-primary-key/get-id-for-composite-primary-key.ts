import { expect } from 'chai';
import 'reflect-metadata';
import { DataSource } from '../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { Category } from './entity/Category';
import { Post } from './entity/Post';
import { PostCategory } from './entity/PostCategory';

describe('other issues > getId should not return undefined for composite primary keys with lazy relations', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('getId should not return undefined', () =>
		Promise.all(
			connections.map(async ({ manager }) => {
				const post = manager.create(Post, {
					content: 'Sample Post',
				});
				await manager.save(post);

				const category = manager.create(Category, {
					name: 'javascript',
				});
				await manager.save(category);

				const postCategory = manager.create(PostCategory, {});
				postCategory.post = Promise.resolve(post);
				postCategory.category = Promise.resolve(category);
				await manager.save(postCategory);

				expect(manager.getId(post)).not.to.be.undefined;
				expect(manager.getId(category)).not.to.be.undefined;
				expect(manager.getId(postCategory)).not.to.be.undefined;
			}),
		));
});
