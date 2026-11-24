import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { DataSource } from '../../../../src/data-source/DataSource';
import { Post } from './entity/Post';
import { PostDetails } from './entity/PostDetails';

describe('cascades > should insert by cascades from both sides (#57)', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should insert by cascades from owner side', () =>
		Promise.all(
			connections.map(async (connection) => {
				// first create details but don't save them because they will be saved by cascades
				const details = new PostDetails();
				details.keyword = 'post-1';

				// then create and save a post with details
				const post1 = new Post();
				post1.title = 'Hello Post #1';
				post1.details = details;
				await connection.manager.save(post1);

				// now check
				const posts = await connection.manager.find(Post, {
					join: {
						alias: 'post',
						innerJoinAndSelect: {
							details: 'post.details',
						},
					},
				});

				posts.should.be.eql([
					{
						key: post1.key,
						title: post1.title,
						details: {
							keyword: 'post-1',
						},
					},
				]);
			}),
		));
});
