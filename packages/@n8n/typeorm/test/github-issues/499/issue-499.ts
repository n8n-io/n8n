import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Post } from './entity/Post';
import { expect } from 'chai';

describe('github issues > #499 postgres DATE hydrated as DATETIME object', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should return date in a string format', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new Post();
				post.title = 'Hello Post #1';
				post.date = '2017-01-25';
				await connection.manager.save(post);

				const loadedPost = await connection.manager.findOne(Post, {
					where: { title: 'Hello Post #1' },
				});
				expect(loadedPost!).not.to.be.null;
				loadedPost!.date.should.be.equal('2017-01-25');
			}),
		));
});
