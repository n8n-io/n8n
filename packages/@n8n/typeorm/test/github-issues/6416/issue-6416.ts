import '../../utils/test-setup';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src';

import { assert } from 'chai';

import Post, { PostSchema } from './entity/Post';
import PostTag, { PostTagSchema } from './entity/PostTag';
import PostAttachment, { PostAttachmentSchema } from './entity/PostAttachment';

describe('github issues > #6399 Combining ManyToOne, Cascade, & Composite Primary Key causes Unique Constraint issues', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [PostSchema, PostTagSchema, PostAttachmentSchema],
				enabledDrivers: ['sqlite', 'sqlite-pooled'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('persisting the cascading entities should succeed', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new Post();
				const postTag = new PostTag();
				post.tags = [postTag];

				await connection.manager.save(post, { reload: true });

				try {
					await connection.manager.save(post);
				} catch (e) {
					assert.fail(e.toString(), null, 'Second save had an exception');
				}
			}),
		));

	it('persisting the cascading entities without JoinColumn should succeed', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new Post();
				const postAttachment = new PostAttachment();
				post.attachments = [postAttachment];

				await connection.manager.save(post, { reload: true });

				try {
					await connection.manager.save(post);
				} catch (e) {
					assert.fail(e.toString(), null, 'Second save had an exception');
				}
			}),
		));

	it('persisting the child entity should succeed', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new Post();

				await connection.manager.save<Post>(post);

				const postTag = new PostTag();
				postTag.post = post;

				await connection.manager.save(postTag, { reload: true });

				try {
					await connection.manager.save(postTag);
				} catch (e) {
					assert.fail(e.toString(), null, 'Second save had an exception');
				}
			}),
		));
});
