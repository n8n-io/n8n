import '../../../utils/test-setup';
import { DataSource, EntityManager } from '../../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { Post, PostStatus } from './entity/Post';
import { ArrayOverlap } from '../../../../src/find-options/operator/ArrayOverlap';

describe('find options > find operators > ArrayOverlap', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				__dirname,
				enabledDrivers: ['postgres'],
				// logging: true,
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	async function prepareData(manager: EntityManager) {
		const post1 = new Post();
		post1.title = 'Post #1';
		post1.authors = ['dmitry', 'olimjon'];
		post1.statuses = [PostStatus.draft, PostStatus.published];
		await manager.save(post1);

		const post2 = new Post();
		post2.title = 'Post #2';
		post2.authors = ['olimjon'];
		post2.statuses = [PostStatus.published];
		await manager.save(post2);

		const post3 = new Post();
		post3.title = 'Post #3';
		post3.authors = [];
		post3.statuses = [];
		await manager.save(post3);
	}

	it('should find entries in regular arrays', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepareData(connection.manager);

				const loadedPost1 = await connection.manager.find(Post, {
					where: {
						authors: ArrayOverlap(['dmitry', 'umed']),
					},
					order: {
						id: 'asc',
					},
				});
				loadedPost1.should.be.eql([
					{
						id: 1,
						title: 'Post #1',
						authors: ['dmitry', 'olimjon'],
						statuses: [PostStatus.draft, PostStatus.published],
					},
				]);

				const loadedPost2 = await connection.manager.find(Post, {
					where: {
						authors: ArrayOverlap(['olimjon', 'umed']),
					},
					order: {
						id: 'asc',
					},
				});
				loadedPost2.should.be.eql([
					{
						id: 1,
						title: 'Post #1',
						authors: ['dmitry', 'olimjon'],
						statuses: [PostStatus.draft, PostStatus.published],
					},
					{
						id: 2,
						title: 'Post #2',
						authors: ['olimjon'],
						statuses: [PostStatus.published],
					},
				]);
			}),
		));

	it('should find entries in enum arrays', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepareData(connection.manager);

				const loadedPost1 = await connection.manager.find(Post, {
					where: {
						statuses: ArrayOverlap([PostStatus.draft, PostStatus.unknown]),
					},
					order: {
						id: 'asc',
					},
				});
				loadedPost1.should.be.eql([
					{
						id: 1,
						title: 'Post #1',
						authors: ['dmitry', 'olimjon'],
						statuses: [PostStatus.draft, PostStatus.published],
					},
				]);

				const loadedPost2 = await connection.manager.find(Post, {
					where: {
						statuses: ArrayOverlap([PostStatus.published, PostStatus.unknown]),
					},
					order: {
						id: 'asc',
					},
				});
				loadedPost2.should.be.eql([
					{
						id: 1,
						title: 'Post #1',
						authors: ['dmitry', 'olimjon'],
						statuses: [PostStatus.draft, PostStatus.published],
					},
					{
						id: 2,
						title: 'Post #2',
						authors: ['olimjon'],
						statuses: [PostStatus.published],
					},
				]);
			}),
		));
});
