import 'reflect-metadata';
import { expect } from 'chai';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { DataSource } from '../../../../src';
import { PostEntity } from './entity/PostEntity';
import { CategoryEntity } from './entity/CategoryEntity';

describe('entity schemas > basic functionality', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [PostEntity, CategoryEntity],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should perform basic operations with entity using repository', () =>
		Promise.all(
			connections.map(async (connection) => {
				const postRepository = connection.getRepository(PostEntity);
				const post = postRepository.create({
					id: 1,
					title: 'First Post',
					text: 'About first post',
				});
				await postRepository.save(post);

				const loadedPost = await postRepository.findOneBy({
					title: 'First Post',
				});
				loadedPost!.id.should.be.equal(post.id);
				loadedPost!.title.should.be.equal('First Post');
				loadedPost!.text.should.be.equal('About first post');

				await postRepository.remove(loadedPost!);

				const loadedPostAfterRemove = await postRepository.findOneBy({
					title: 'First Post',
				});
				expect(loadedPostAfterRemove).to.be.null;
			}),
		));

	it('should perform basic operations with entity using manager', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = connection.manager.create(PostEntity, {
					id: 1,
					title: 'First Post',
					text: 'About first post',
				});
				await connection.manager.save(PostEntity, post);

				const loadedPost = await connection.manager.findOneBy(PostEntity, { title: 'First Post' });
				loadedPost!.id.should.be.equal(post.id);
				loadedPost!.title.should.be.equal('First Post');
				loadedPost!.text.should.be.equal('About first post');

				await connection.manager.remove(PostEntity, loadedPost!);

				const loadedPostAfterRemove = await connection.manager.findOneBy(PostEntity, {
					title: 'First Post',
				});
				expect(loadedPostAfterRemove).to.be.null;
			}),
		));
});
