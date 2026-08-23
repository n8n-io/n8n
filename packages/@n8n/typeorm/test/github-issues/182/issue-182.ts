import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Post } from './entity/Post';
import { expect } from 'chai';
import { PostStatus } from './model/PostStatus';

describe('github issues > #182 enums are not saved properly', () => {
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

	it('should persist successfully with enum values', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post1 = new Post();
				post1.status = PostStatus.NEW;
				post1.title = 'Hello Post #1';

				// persist
				await connection.manager.save(post1);

				const loadedPosts1 = await connection.manager.findOne(Post, {
					where: { title: 'Hello Post #1' },
				});
				expect(loadedPosts1!).not.to.be.null;
				loadedPosts1!.should.be.eql({
					id: 1,
					title: 'Hello Post #1',
					status: PostStatus.NEW,
				});

				// remove persisted
				await connection.manager.remove(post1);

				const post2 = new Post();
				post2.status = PostStatus.ACTIVE;
				post2.title = 'Hello Post #1';

				// persist
				await connection.manager.save(post2);

				const loadedPosts2 = await connection.manager.findOne(Post, {
					where: { title: 'Hello Post #1' },
				});
				expect(loadedPosts2!).not.to.be.null;
				loadedPosts2!.should.be.eql({
					id: 2,
					title: 'Hello Post #1',
					status: PostStatus.ACTIVE,
				});

				// remove persisted
				await connection.manager.remove(post2);

				const post3 = new Post();
				post3.status = PostStatus.ACHIEVED;
				post3.title = 'Hello Post #1';

				// persist
				await connection.manager.save(post3);

				const loadedPosts3 = await connection.manager.findOne(Post, {
					where: { title: 'Hello Post #1' },
				});
				expect(loadedPosts3!).not.to.be.null;
				loadedPosts3!.should.be.eql({
					id: 3,
					title: 'Hello Post #1',
					status: PostStatus.ACHIEVED,
				});

				// remove persisted
				await connection.manager.remove(post3);
			}),
		));
});
