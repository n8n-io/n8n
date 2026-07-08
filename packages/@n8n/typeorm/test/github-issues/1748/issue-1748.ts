import 'reflect-metadata';
import { expect } from 'chai';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource, Equal } from '../../../src';
import { Post, Uuid } from './entity/Post';

describe('github issues > #1748 PrimaryColumn combined with transformer leads to error on save', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [Post],
				dropSchema: true,
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should work as expected', () =>
		Promise.all(
			connections.map(async (connection) => {
				const postRepository = connection.getRepository(Post);
				const id = new Uuid('6f715828-d2c6-4e96-a749-aecb9598fd69');

				// create and save a post first
				const post = new Post(id);
				post.title = 'About columns';
				await postRepository.save(post);

				// then update all its properties and save again
				post.title = 'About columns1';
				await postRepository.save(post);

				// check if all columns are updated except for readonly columns
				const loadedPost = await postRepository.findOneBy({
					id: Equal(id),
				});
				expect(loadedPost!.id).to.deep.eq(id);
				expect(loadedPost!.title).to.be.equal('About columns1');
			}),
		));
});
