import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src';
import { Post } from './entity/Post';
import { Category } from './entity/Category';
import { assert } from 'chai';

describe('github issues > #5704 Many-to-many gives error ER_DUP_ENTRY everytime I save. This one also related to inverseJoinColumn.', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				subscribers: [__dirname + '/subscriber/*{.js,.ts}'],
				enabledDrivers: ['postgres', 'sqlite-pooled'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should work as expected', () =>
		Promise.all(
			connections.map(async (connection) => {
				const postName = 'post for issue #5704';
				const catName = 'cat for issue #5704';

				let post1 = await connection.manager.findOne(Post, {
					where: { title: postName },
				});

				let category1 = await connection.manager.findOne(Category, {
					where: { name: catName },
				});

				if (!category1) {
					category1 = new Category();
					category1.name = catName;
					await connection.manager.save(category1);
				}

				if (!post1) {
					post1 = new Post();
					post1.title = postName;
					post1.categories = Promise.resolve([category1]);
					await connection.manager.save(post1);
				}

				const categoryTest = await connection.manager.findOne(Category, {
					where: { name: catName },
				});
				assert.isTrue(categoryTest instanceof Category);

				post1.categories = Promise.resolve([categoryTest as Category]);

				// This is the line that causes the error "QueryFailedError: ER_DUP_ENTRY: Duplicate entry '1-1' for key 'PRIMARY'" with previous code
				await connection.manager.save(post1);
			}),
		));
});
