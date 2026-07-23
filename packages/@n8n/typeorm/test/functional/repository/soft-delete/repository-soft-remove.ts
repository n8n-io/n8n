import 'reflect-metadata';
import { expect } from 'chai';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { DataSource } from '../../../../src/data-source/DataSource';
import { Post } from './entity/Post';
import { PostWithoutDeleteDate } from './entity/PostWithoutDeleteDate';
import { MissingDeleteDateColumnError } from '../../../../src/error/MissingDeleteDateColumnError';

describe('repository > soft-remove', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should perform soft removal and recovery correctly', () =>
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

				// soft-remove one
				await postRepository.softRemove(newPost1);

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

				// recover one
				await postRepository.recover(loadedPost1!);
				// load to check
				const recoveredPosts = await postRepository.find({
					withDeleted: true,
				});

				// assert
				recoveredPosts.length.should.be.equal(2);

				const recoveredPost1 = recoveredPosts.find((p) => p.id === 1);
				expect(recoveredPost1).to.exist;
				expect(recoveredPost1!.deletedAt).to.equals(null);
				expect(recoveredPost1!.name).to.equals('post#1');
				const recoveredPost2 = recoveredPosts.find((p) => p.id === 2);
				expect(recoveredPost2).to.exist;
				expect(recoveredPost2!.deletedAt).to.equals(null);
				expect(recoveredPost2!.name).to.equals('post#2');
			}),
		));

	it('should throw error when delete date column is missing', () =>
		Promise.all(
			connections.map(async (connection) => {
				const postRepository = connection.getRepository(PostWithoutDeleteDate);

				// save a new posts
				const newPost1 = postRepository.create({
					id: 1,
					name: 'post#1',
				});

				await postRepository.save(newPost1);

				let error1: Error | undefined;
				try {
					// soft-remove one
					await postRepository.softRemove(newPost1);
				} catch (err) {
					error1 = err;
				}
				expect(error1).to.be.an.instanceof(MissingDeleteDateColumnError);

				let error2: Error | undefined;
				try {
					// recover one
					await postRepository.recover(newPost1);
				} catch (err) {
					error2 = err;
				}
				expect(error2).to.be.an.instanceof(MissingDeleteDateColumnError);
			}),
		));
});
