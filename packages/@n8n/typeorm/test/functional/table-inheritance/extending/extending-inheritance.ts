import 'reflect-metadata';
import { expect } from 'chai';
import { DataSource } from '../../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { Post } from './entity/Post';

describe('table inheritance > regular inheritance using extends keyword', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should work correctly', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new Post();
				post.name = 'Super title';
				post.text = 'About this post';
				await connection.manager.save(post);

				const loadedPost = await connection.manager
					.createQueryBuilder(Post, 'post')
					.where('post.id = :id', { id: 1 })
					.getOne();

				expect(loadedPost).not.to.be.null;
				expect(loadedPost!.name).not.to.be.undefined;
				expect(loadedPost!.text).not.to.be.undefined;
				loadedPost!.name.should.be.equal('Super title');
				loadedPost!.text.should.be.equal('About this post');
			}),
		));
});
