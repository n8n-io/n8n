import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Post } from './entity/Post';
import { expect } from 'chai';

describe('other issues > double inheritance produces multiple duplicated columns', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should not produce duplicate columns', () =>
		Promise.all(
			connections.map(async function (connection) {
				// insert a post
				const post = new Post();
				post.title = 'hello';
				await connection.manager.save(post);

				// check if it was inserted correctly
				const loadedPost = await connection.manager.findOneBy(Post, {
					id: post.id,
				});
				expect(loadedPost).not.to.be.null;
				loadedPost!.title.should.be.equal('hello');
			}),
		));
});
