import 'reflect-metadata';
import { expect } from 'chai';
import { DataSource } from '../../src/data-source/DataSource';
import { Post } from '../../sample/sample1-simple-entity/entity/Post';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../utils/test-utils';

describe('insertion', function () {
	// -------------------------------------------------------------------------
	// Setup
	// -------------------------------------------------------------------------

	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [Post],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	// -------------------------------------------------------------------------
	// Specifications: persist
	// -------------------------------------------------------------------------

	it('basic insert functionality', () =>
		Promise.all(
			connections.map(async (connection) => {
				const postRepository = connection.getRepository(Post);

				let newPost = new Post();
				newPost.text = 'Hello post';
				newPost.title = 'this is post title';
				newPost.likesCount = 0;
				const savedPost = await postRepository.save(newPost);

				savedPost.should.be.equal(newPost);
				expect(savedPost.id).not.to.be.undefined;

				const insertedPost = await postRepository.findOneBy({
					id: savedPost.id,
				});
				insertedPost!.should.be.eql({
					id: savedPost.id,
					text: 'Hello post',
					title: 'this is post title',
					likesCount: 0,
				});
			}),
		));
});
