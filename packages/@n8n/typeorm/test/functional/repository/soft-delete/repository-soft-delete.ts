import 'reflect-metadata';
import { expect } from 'chai';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { DataSource } from '../../../../src/data-source/DataSource';
import { Post } from './entity/Post';

describe('repository > soft-delete', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should perform soft deletion and restoration correctly', () =>
		Promise.all(
			connections.map(async (connection) => {
				const postRepository = connection.getRepository(Post);

				// save a new posts
				const newPost1 = postRepository.create({
					id: 1,
					name: 'post#1',
				});
				const newPost2 = postRepository.create({
					id: 2,
					name: 'post#2',
				});

				await postRepository.save(newPost1);
				await postRepository.save(newPost2);

				// soft-delete one
				await postRepository.softDelete({ id: 1, name: 'post#1' });

				// load to check
				const loadedPosts = await postRepository.find({
					withDeleted: true,
				});

				// assert
				loadedPosts.length.should.be.equal(2);

				const loadedPost1 = loadedPosts.find((p) => p.id === 1);
				expect(loadedPost1).to.exist;
				expect(loadedPost1!.deletedAt).to.be.instanceof(Date);
				expect(loadedPost1!.name).to.equals('post#1');
				const loadedPost2 = loadedPosts.find((p) => p.id === 2);
				expect(loadedPost2).to.exist;
				expect(loadedPost2!.deletedAt).to.equals(null);
				expect(loadedPost2!.name).to.equals('post#2');

				// restore one
				await postRepository.restore({ id: 1, name: 'post#1' });
				// load to check
				const restoredPosts = await postRepository.find({
					withDeleted: true,
				});

				// assert
				restoredPosts.length.should.be.equal(2);

				const restoredPost1 = restoredPosts.find((p) => p.id === 1);
				expect(restoredPost1).to.exist;
				expect(restoredPost1!.deletedAt).to.equals(null);
				expect(restoredPost1!.name).to.equals('post#1');
				const restoredPost2 = restoredPosts.find((p) => p.id === 2);
				expect(restoredPost2).to.exist;
				expect(restoredPost2!.deletedAt).to.equals(null);
				expect(restoredPost2!.name).to.equals('post#2');
			}),
		));
});
