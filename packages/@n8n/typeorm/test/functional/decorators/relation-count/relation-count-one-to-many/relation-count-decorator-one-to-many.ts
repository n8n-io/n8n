import 'reflect-metadata';
import { expect } from 'chai';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../../utils/test-utils';
import { DataSource } from '../../../../../src/data-source/DataSource';
import { Category } from './entity/Category';
import { Post } from './entity/Post';
import { Image } from './entity/Image';

describe('decorators > relation-count-decorator > one-to-many', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should load relation count', () =>
		Promise.all(
			connections.map(async (connection) => {
				const image1 = new Image();
				image1.id = 1;
				image1.isRemoved = true;
				image1.name = 'image #1';
				await connection.manager.save(image1);

				const image2 = new Image();
				image2.id = 2;
				image2.name = 'image #2';
				await connection.manager.save(image2);

				const image3 = new Image();
				image3.id = 3;
				image3.name = 'image #3';
				await connection.manager.save(image3);

				const category1 = new Category();
				category1.id = 1;
				category1.name = 'cars';
				category1.isRemoved = true;
				category1.images = [image1, image2];
				await connection.manager.save(category1);

				const category2 = new Category();
				category2.id = 2;
				category2.name = 'BMW';
				await connection.manager.save(category2);

				const category3 = new Category();
				category3.id = 3;
				category3.name = 'airplanes';
				category3.images = [image3];
				await connection.manager.save(category3);

				const post1 = new Post();
				post1.id = 1;
				post1.title = 'about BMW';
				post1.categories = [category1, category2];
				await connection.manager.save(post1);

				const post2 = new Post();
				post2.id = 2;
				post2.title = 'about Boeing';
				post2.categories = [category3];
				await connection.manager.save(post2);

				let loadedPosts = await connection.manager
					.createQueryBuilder(Post, 'post')
					.leftJoinAndSelect('post.categories', 'categories')
					.addOrderBy('post.id, categories.id')
					.getMany();

				expect(loadedPosts![0].categoryCount).to.be.equal(2);
				expect(loadedPosts![0].removedCategoryCount).to.be.equal(1);
				expect(loadedPosts![0].categories[0].imageCount).to.be.equal(2);
				expect(loadedPosts![0].categories[0].removedImageCount).to.be.equal(1);
				expect(loadedPosts![0].categories[1].imageCount).to.be.equal(0);
				expect(loadedPosts![1].categoryCount).to.be.equal(1);
				expect(loadedPosts![1].categories[0].imageCount).to.be.equal(1);

				let loadedPost = await connection.manager
					.createQueryBuilder(Post, 'post')
					.leftJoinAndSelect('post.categories', 'categories')
					.where('post.id = :id', { id: 1 })
					.addOrderBy('post.id, categories.id')
					.getOne();

				expect(loadedPost!.categoryCount).to.be.equal(2);
				expect(loadedPost!.categories[0].imageCount).to.be.equal(2);
				expect(loadedPost!.removedCategoryCount).to.be.equal(1);
				expect(loadedPosts![0].categories[1].imageCount).to.be.equal(0);
				expect(loadedPost!.categories[0].removedImageCount).to.be.equal(1);
			}),
		));
});
