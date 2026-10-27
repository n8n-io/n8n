import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { EntitySchema } from '../../../src';
import { Author, AuthorSchema } from './entity/Author';
import { Post, PostSchema } from './entity/Post';

describe('github issues > #1123 load relation eagerly by setting isEager property', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [new EntitySchema<Author>(AuthorSchema), new EntitySchema<Post>(PostSchema)],
				dropSchema: true,
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	async function prepareData(connection: DataSource) {
		const author = new Author();
		author.id = 1;
		author.name = 'Jane Doe';
		await connection.manager.save(author);

		const post = new Post();
		post.id = 1;
		post.title = 'Post 1';
		post.author = author;
		await connection.manager.save(post);
	}

	it('should load all eager relations when object is loaded', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepareData(connection);

				const loadedPost = await connection.manager.findOneBy(Post, {
					id: 1,
				});
				loadedPost!.should.be.eql({
					id: 1,
					title: 'Post 1',
					author: {
						id: 1,
						name: 'Jane Doe',
					},
				});
			}),
		));

	it('should not load eager relations when query builder is used', () =>
		Promise.all(
			connections.map(async (connection) => {
				await prepareData(connection);

				const loadedPost = (await connection.manager
					.createQueryBuilder('Post', 'post')
					.where('post.id = :id', { id: 1 })
					.getOne()) as Post;

				loadedPost!.should.be.eql({
					id: 1,
					title: 'Post 1',
				});
			}),
		));
});
