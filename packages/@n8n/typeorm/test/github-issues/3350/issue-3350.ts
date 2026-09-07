import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Category } from './entity/Category';
import { Post } from './entity/Post';
import { expect } from 'chai';

describe('github issues > #3350 ER_DUP_FIELDNAME with simple find', () => {
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

	it('should find without errors', () =>
		Promise.all(
			connections.map(async function (connection) {
				const post = new Post();
				post.category = new Category();
				post.category.name = 'new category';
				await connection.manager.save(post.category);
				await connection.manager.save(post);

				const loadedPost = await connection.getRepository(Post).findOne({
					where: {
						id: 1,
					},
					relations: {
						category: true,
					},
				});
				expect(loadedPost).to.be.not.empty;
				expect(loadedPost!.category).to.be.not.empty;
			}),
		));
});
