import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Post } from './entity/Post';
import { IsNull } from '../../../src';

describe('github issues > #219 FindOptions should be able to resolve null values', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should properly query null values', () =>
		Promise.all(
			connections.map(async (connection) => {
				for (let i = 1; i <= 10; i++) {
					const post1 = new Post();
					post1.title = 'post #' + i;
					post1.text = i > 5 ? 'about post' : null;
					await connection.manager.save(post1);
				}

				const postsWithoutText1 = await connection.manager.find(Post, {
					where: {
						text: IsNull(),
					},
				});
				postsWithoutText1.length.should.be.equal(5);

				const postsWithText1 = await connection.manager.find(Post, {
					where: { text: 'about post' },
				});
				postsWithText1.length.should.be.equal(5);
			}),
		));
});
