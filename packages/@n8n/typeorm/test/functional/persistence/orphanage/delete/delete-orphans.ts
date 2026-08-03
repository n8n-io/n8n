import 'reflect-metadata';
import { DataSource, Repository } from '../../../../../src/index';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../../utils/test-utils';
import { expect } from 'chai';
import { Category } from './entity/Category';
import { Post } from './entity/Post';

describe('persistence > orphanage > delete', () => {
	// -------------------------------------------------------------------------
	// Configuration
	// -------------------------------------------------------------------------

	// connect to db
	let connections: DataSource[] = [];

	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	// -------------------------------------------------------------------------
	// Specifications
	// -------------------------------------------------------------------------

	describe('when a Post is removed from a Category', () => {
		let categoryRepository: Repository<Category>;
		let postRepository: Repository<Post>;
		let categoryId: number;

		beforeEach(async function () {
			if (connections.length === 0) {
				this.skip();
			}

			await Promise.all(
				connections.map(async (connection) => {
					categoryRepository = connection.getRepository(Category);
					postRepository = connection.getRepository(Post);
				}),
			);

			const categoryToInsert = await categoryRepository.save(new Category());
			categoryToInsert.posts = [new Post(), new Post()];

			await categoryRepository.save(categoryToInsert);
			categoryId = categoryToInsert.id;

			const categoryToUpdate = (await categoryRepository.findOneBy({
				id: categoryId,
			}))!;
			categoryToUpdate.posts = categoryToInsert.posts.filter((p) => p.id === 1); // Keep the first post

			await categoryRepository.save(categoryToUpdate);
		});

		it('should retain a Post on the Category', async () => {
			const category = await categoryRepository.findOneBy({
				id: categoryId,
			});
			expect(category).not.to.be.undefined;
			expect(category!.posts).to.have.lengthOf(1);
			expect(category!.posts[0].id).to.equal(1);
		});

		it('should delete the orphaned Post from the database', async () => {
			const postCount = await postRepository.count();
			expect(postCount).to.equal(1);
		});

		it('should retain foreign keys on remaining Posts', async () => {
			const postsWithoutForeignKeys = (await postRepository.find()).filter((p) => !p.categoryId);
			expect(postsWithoutForeignKeys).to.have.lengthOf(0);
		});
	});
});
