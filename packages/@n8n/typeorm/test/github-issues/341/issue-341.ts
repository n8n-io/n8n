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

describe('github issues > #341 OneToOne relation with referencedColumnName does not work', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('custom join column name and referencedColumnName', () =>
		Promise.all(
			connections.map(async (connection) => {
				const category = new Category();
				category.name = 'category #1';
				await connection.manager.save(category);

				const post = new Post();
				post.title = 'post #1';
				post.category = category;
				await connection.manager.save(post);

				const loadedPost = await connection.manager
					.createQueryBuilder(Post, 'post')
					.leftJoinAndSelect('post.category', 'category')
					.getOne();

				expect(loadedPost).not.to.be.null;
				expect(loadedPost!.category).not.to.be.undefined;
			}),
		));
});
