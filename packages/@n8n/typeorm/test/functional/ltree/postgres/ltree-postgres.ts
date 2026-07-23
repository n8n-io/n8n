import 'reflect-metadata';
import { expect } from 'chai';
import { DataSource } from '../../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { Post } from './entity/Post';

describe('ltree-postgres', () => {
	let connections: DataSource[];
	before(async () => {
		connections = await createTestingConnections({
			entities: [__dirname + '/entity/*{.js,.ts}'],
			enabledDrivers: ['postgres'],
		});
	});
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it("should create correct schema with Postgres' ltree type", () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();
				const schema = await queryRunner.getTable('post');
				await queryRunner.release();
				expect(schema).not.to.be.undefined;
				const ltreeColumn = schema!.columns.find(
					(tableColumn) =>
						tableColumn.name === 'path' && tableColumn.type === 'ltree' && !tableColumn.isArray,
				);
				expect(ltreeColumn).to.not.be.undefined;
			}),
		));

	it('should persist ltree correctly', () =>
		Promise.all(
			connections.map(async (connection) => {
				const path = 'News.Featured.Opinion';
				const postRepo = connection.getRepository(Post);
				const post = new Post();
				post.path = path;
				const persistedPost = await postRepo.save(post);
				const foundPost = await postRepo.findOneBy({
					id: persistedPost.id,
				});
				expect(foundPost).to.exist;
				expect(foundPost!.path).to.deep.equal(path);
			}),
		));

	it('should update ltree correctly', () =>
		Promise.all(
			connections.map(async (connection) => {
				const path = 'News.Featured.Opinion';
				const path2 = 'News.Featured.Gossip';
				const postRepo = connection.getRepository(Post);
				const post = new Post();
				post.path = path;
				const persistedPost = await postRepo.save(post);

				await postRepo.update({ id: persistedPost.id }, { path: path2 });

				const foundPost = await postRepo.findOneBy({
					id: persistedPost.id,
				});
				expect(foundPost).to.exist;
				expect(foundPost!.path).to.deep.equal(path2);
			}),
		));

	it('should re-save ltree correctly', () =>
		Promise.all(
			connections.map(async (connection) => {
				const path = 'News.Featured.Opinion';
				const path2 = 'News.Featured.Gossip';
				const postRepo = connection.getRepository(Post);
				const post = new Post();
				post.path = path;
				const persistedPost = await postRepo.save(post);

				persistedPost.path = path2;
				await postRepo.save(persistedPost);

				const foundPost = await postRepo.findOneBy({
					id: persistedPost.id,
				});
				expect(foundPost).to.exist;
				expect(foundPost!.path).to.deep.equal(path2);
			}),
		));

	it("should persist ltree correctly with trailing '.'", () =>
		Promise.all(
			connections.map(async (connection) => {
				const path = 'News.Featured.Opinion.';
				const postRepo = connection.getRepository(Post);
				const post = new Post();
				post.path = path;
				const persistedPost = await postRepo.save(post);
				const foundPost = await postRepo.findOneBy({
					id: persistedPost.id,
				});
				expect(foundPost).to.exist;
				expect(foundPost!.path).to.deep.equal('News.Featured.Opinion');
			}),
		));

	it('should persist ltree correctly when containing spaces', () =>
		Promise.all(
			connections.map(async (connection) => {
				const path = 'News.Featured Story.Opinion';
				const postRepo = connection.getRepository(Post);
				const post = new Post();
				post.path = path;
				const persistedPost = await postRepo.save(post);
				const foundPost = await postRepo.findOneBy({
					id: persistedPost.id,
				});
				expect(foundPost).to.exist;
				expect(foundPost!.path).to.deep.equal('News.Featured_Story.Opinion');
			}),
		));

	it('should be able to query ltree correctly', () =>
		Promise.all(
			connections.map(async (connection) => {
				const path = 'News.Featured.Opinion';
				const postRepo = connection.getRepository(Post);
				const post = new Post();
				post.path = path;
				await postRepo.save(post);
				const foundPost = await postRepo.createQueryBuilder().where(`path ~ 'news@.*'`).getOne();
				expect(foundPost).to.exist;
				expect(foundPost!.path).to.deep.equal(path);
			}),
		));
});
