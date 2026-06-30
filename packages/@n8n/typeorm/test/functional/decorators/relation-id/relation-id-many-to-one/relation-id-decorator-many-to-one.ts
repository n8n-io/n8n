import 'reflect-metadata';
import { expect } from 'chai';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../../utils/test-utils';
import { DataSource } from '../../../../../src/data-source/DataSource';
import { Post } from './entity/Post';
import { Category } from './entity/Category';

describe('decorators > relation-id-decorator > many-to-one', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should load ids when RelationId decorator used', () =>
		Promise.all(
			connections.map(async (connection) => {
				const category1 = new Category();
				category1.id = 1;
				category1.name = 'cars';
				await connection.manager.save(category1);

				const category2 = new Category();
				category2.id = 2;
				category2.name = 'airplanes';
				await connection.manager.save(category2);

				const categoryByName1 = new Category();
				categoryByName1.id = 3;
				categoryByName1.name = 'BMW';
				await connection.manager.save(categoryByName1);

				const categoryByName2 = new Category();
				categoryByName2.id = 4;
				categoryByName2.name = 'Boeing';
				await connection.manager.save(categoryByName2);

				const post1 = new Post();
				post1.id = 1;
				post1.title = 'about BWM';
				post1.category = category1;
				post1.categoryByName = categoryByName1;
				await connection.manager.save(post1);

				const post2 = new Post();
				post2.id = 2;
				post2.title = 'about Boeing';
				post2.category = category2;
				post2.categoryByName = categoryByName2;
				await connection.manager.save(post2);

				let loadedPosts = await connection.manager
					.createQueryBuilder(Post, 'post')
					.orderBy('post.id')
					.getMany();

				expect(loadedPosts![0].categoryId).to.not.be.undefined;
				expect(loadedPosts![0].categoryId).to.be.equal(1);
				expect(loadedPosts![0].categoryName).to.not.be.undefined;
				expect(loadedPosts![0].categoryName).to.be.equal('BMW');
				expect(loadedPosts![1].categoryId).to.not.be.undefined;
				expect(loadedPosts![1].categoryId).to.be.equal(2);
				expect(loadedPosts![1].categoryName).to.not.be.undefined;
				expect(loadedPosts![1].categoryName).to.be.equal('Boeing');

				let loadedPost = await connection.manager
					.createQueryBuilder(Post, 'post')
					.where('post.id = :id', { id: 1 })
					.getOne();

				expect(loadedPost!.categoryId).to.not.be.undefined;
				expect(loadedPost!.categoryId).to.be.equal(1);
				expect(loadedPost!.categoryName).to.not.be.undefined;
				expect(loadedPost!.categoryName).to.be.equal('BMW');
			}),
		));
});
