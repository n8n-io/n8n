import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Post } from './entity/Post';
import { Category } from './entity/Category';
import { expect } from 'chai';

describe('github issues > #2632 createQueryBuilder relation remove works only if using ID', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				schemaCreate: true,
				dropSchema: true,
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should add and remove relations of an entity if given a mix of ids and objects', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post1 = new Post();
				post1.title = 'post #1';
				await connection.manager.save(post1);

				const post2 = new Post();
				post2.title = 'post #2';
				await connection.manager.save(post2);

				const category1 = new Category();
				category1.title = 'category #1';
				await connection.manager.save(category1);

				const category2 = new Category();
				category2.title = 'category #2';
				await connection.manager.save(category2);

				await connection.createQueryBuilder().relation(Post, 'categories').of(post1).add(1);

				let loadedPost1 = await connection.manager.findOne(Post, {
					where: { id: 1 },
					relations: { categories: true },
				});
				expect(loadedPost1!.categories).to.deep.include({
					id: 1,
					title: 'category #1',
				});

				await connection.createQueryBuilder().relation(Post, 'categories').of(post1).remove(1);

				loadedPost1 = await connection.manager.findOne(Post, {
					where: { id: 1 },
					relations: { categories: true },
				});
				expect(loadedPost1!.categories).to.be.eql([]);

				await connection.createQueryBuilder().relation(Post, 'categories').of(2).add(category2);

				let loadedPost2 = await connection.manager.findOne(Post, {
					where: { id: 2 },
					relations: { categories: true },
				});
				expect(loadedPost2!.categories).to.deep.include({
					id: 2,
					title: 'category #2',
				});

				await connection.createQueryBuilder().relation(Post, 'categories').of(2).remove(category2);

				loadedPost1 = await connection.manager.findOne(Post, {
					where: { id: 2 },
					relations: { categories: true },
				});
				expect(loadedPost1!.categories).to.be.eql([]);
			}),
		));
});
