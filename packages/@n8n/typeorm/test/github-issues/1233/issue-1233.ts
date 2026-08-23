import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Post } from './entity/Post';

describe('github issues > #1233 column updatedDate must appear in the GROUP BY clause or be used in an aggregate function', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				enabledDrivers: ['postgres'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should filter correctly using findByIds', () =>
		Promise.all(
			connections.map(async (connection) => {
				let post1 = new Post();
				post1.name = 'post #1';
				await connection.manager.save(post1);

				let post2 = new Post();
				post2.name = 'post #1';
				await connection.manager.save(post2);

				const [loadedPosts, count] = await connection.manager.findAndCount(Post, {
					skip: 1,
					take: 1,
				});
				loadedPosts.length.should.be.equal(1);
				loadedPosts[0].id.should.be.equal(1);
				count.should.be.equal(2);
			}),
		));
});
