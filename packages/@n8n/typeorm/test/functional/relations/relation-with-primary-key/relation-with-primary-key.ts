import 'reflect-metadata';
import '../../../utils/test-setup';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { DataSource } from '../../../../src/data-source/DataSource';
import { Post } from './entity/Post';
import { Category } from './entity/Category';

describe('relations > relation with primary key', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	describe('many-to-one with primary key in relation', function () {
		it('should work perfectly', () =>
			Promise.all(
				connections.map(async (connection) => {
					// create first category and post and save them
					const category1 = new Category();
					category1.name = 'Category saved by cascades #1';

					const post1 = new Post();
					post1.title = 'Hello Post #1';
					post1.category = category1;

					await connection.manager.save(post1);

					// create second category and post and save them
					const category2 = new Category();
					category2.name = 'Category saved by cascades #2';

					const post2 = new Post();
					post2.title = 'Hello Post #2';
					post2.category = category2;

					await connection.manager.save(post2);

					// now check
					const posts = await connection.manager.find(Post, {
						join: {
							alias: 'post',
							innerJoinAndSelect: {
								category: 'post.category',
							},
						},
						order: {
							categoryId: 'ASC',
						},
					});

					posts.should.be.eql([
						{
							title: 'Hello Post #1',
							categoryId: 1,
							category: {
								id: 1,
								name: 'Category saved by cascades #1',
							},
						},
						{
							title: 'Hello Post #2',
							categoryId: 2,
							category: {
								id: 2,
								name: 'Category saved by cascades #2',
							},
						},
					]);
				}),
			));
	});
});
