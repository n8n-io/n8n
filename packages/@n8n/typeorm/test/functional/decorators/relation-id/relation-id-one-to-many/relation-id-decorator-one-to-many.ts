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

describe('decorators > relation-id > one-to-many', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should load id when RelationId decorator used', () =>
		Promise.all(
			connections.map(async (connection) => {
				const category = new Category();
				category.id = 1;
				category.name = 'cars';
				await connection.manager.save(category);

				const category2 = new Category();
				category2.id = 2;
				category2.name = 'airplanes';
				await connection.manager.save(category2);

				const post1 = new Post();
				post1.id = 1;
				post1.title = 'about BMW';
				post1.category = category;
				await connection.manager.save(post1);

				const post2 = new Post();
				post2.id = 2;
				post2.title = 'about Audi';
				post2.category = category;
				await connection.manager.save(post2);

				const post3 = new Post();
				post3.id = 3;
				post3.title = 'about Boeing';
				post3.category = category2;
				await connection.manager.save(post3);

				let loadedCategories = await connection.manager
					.createQueryBuilder(Category, 'category')
					.orderBy('category.id')
					.getMany();

				expect(loadedCategories![0].postIds.length).to.be.equal(2);
				expect(loadedCategories![0].postIds[0]).to.be.equal(1);
				expect(loadedCategories![0].postIds[1]).to.be.equal(2);
				expect(loadedCategories![1].postIds.length).to.be.equal(1);
				expect(loadedCategories![1].postIds[0]).to.be.equal(3);

				let loadedCategory = await connection.manager
					.createQueryBuilder(Category, 'category')
					.where('category.id = :id', { id: 1 })
					.getOne();

				expect(loadedCategory!.postIds.length).to.be.equal(2);
				expect(loadedCategory!.postIds[0]).to.be.equal(1);
				expect(loadedCategory!.postIds[1]).to.be.equal(2);
			}),
		));

	it('should load id when RelationId decorator used with additional condition', () =>
		Promise.all(
			connections.map(async (connection) => {
				const category = new Category();
				category.id = 1;
				category.name = 'cars';
				await connection.manager.save(category);

				const category2 = new Category();
				category2.id = 2;
				category2.name = 'airplanes';
				await connection.manager.save(category2);

				const post1 = new Post();
				post1.id = 1;
				post1.title = 'about BMW';
				post1.category = category;
				await connection.manager.save(post1);

				const post2 = new Post();
				post2.id = 2;
				post2.title = 'about Audi';
				post2.category = category;
				post2.isRemoved = true;
				await connection.manager.save(post2);

				const post3 = new Post();
				post3.id = 3;
				post3.title = 'about Boeing';
				post3.category = category2;
				post3.isRemoved = true;
				await connection.manager.save(post3);

				let loadedCategories = await connection.manager
					.createQueryBuilder(Category, 'category')
					.orderBy('category.id')
					.getMany();

				expect(loadedCategories![0].removedPostIds).to.not.be.eql([]);
				expect(loadedCategories![0].removedPostIds.length).to.be.equal(1);
				expect(loadedCategories![0].removedPostIds[0]).to.be.equal(2);
				expect(loadedCategories![1].removedPostIds[0]).to.be.equal(3);

				let loadedCategory = await connection.manager
					.createQueryBuilder(Category, 'category')
					.where('category.id = :id', { id: 1 })
					.getOne();

				expect(loadedCategory!.removedPostIds).to.not.be.eql([]);
				expect(loadedCategory!.removedPostIds.length).to.be.equal(1);
				expect(loadedCategory!.removedPostIds[0]).to.be.equal(2);
			}),
		));
});
