import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Post } from './entity/Post';
import { expect } from 'chai';
import { PostCategory } from './entity/PostCategory';

describe('other issues > entity change in subscribers should affect persistence', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				subscribers: [__dirname + '/subscriber/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('if entity was changed, subscriber should be take updated columns', () =>
		Promise.all(
			connections.map(async function (connection) {
				const category1 = new PostCategory();
				category1.name = 'category #1';

				const post = new Post();
				post.title = 'hello world';
				post.category = category1;
				await connection.manager.save(post);

				// check if it was inserted correctly
				const loadedPost = await connection.manager.findOneBy(Post, {
					id: post.id,
				});
				expect(loadedPost).not.to.be.null;
				loadedPost!.active.should.be.equal(false);

				// now update some property and let update subscriber trigger
				const category2 = new PostCategory();
				category2.name = 'category #2';
				loadedPost!.category = category2;
				loadedPost!.active = true;
				loadedPost!.title += '!';
				await connection.manager.save(loadedPost!);

				// check if subscriber was triggered and entity was really taken changed columns in the subscriber
				const loadedUpdatedPost = await connection.manager.findOneBy(Post, {
					id: post.id,
				});

				expect(loadedUpdatedPost).not.to.be.null;
				expect(loadedUpdatedPost!.updatedColumns).to.equals(2);
				expect(loadedUpdatedPost!.updatedRelations).to.equals(1);

				await connection.manager.save(loadedPost!);
			}),
		));
});
