import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Post } from './entity/Post';
import { expect } from 'chai';

describe('other issues > column with getter / setter should work', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('getters and setters should work correctly', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new Post();
				post.title = 'Super title';
				post.text = 'About this post';
				await connection.manager.save(post);

				const loadedPost = await connection.manager
					.createQueryBuilder(Post, 'post')
					.where('post.id = :id', { id: 1 })
					.getOne();

				expect(loadedPost).not.to.be.null;
				expect(loadedPost!.title).not.to.be.undefined;
				expect(loadedPost!.text).not.to.be.undefined;
				loadedPost!.title.should.be.equal('Super title');
				loadedPost!.text.should.be.equal('About this post');
			}),
		));
});
