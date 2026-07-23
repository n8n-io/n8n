import '../../utils/test-setup';
import { Post } from './entity/Post';
import { Category } from './entity/Category';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src';

describe('entity-model', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should save successfully and use static methods successfully', async () => {
		// These must run sequentially as we have the global context of the `Post` ActiveRecord class
		for (const connection of connections) {
			Post.useDataSource(connection); // change connection each time because of AR specifics

			const post = Post.create();
			post.id = 1;
			post.title = 'About ActiveRecord';
			post.text = 'Huge discussion how good or bad ActiveRecord is.';
			await post.save();

			const loadedPost = await Post.findOne({
				where: { id: post.id },
			});

			loadedPost!.should.be.instanceOf(Post);
			loadedPost!.id.should.be.eql(post.id);
			loadedPost!.title.should.be.eql('About ActiveRecord');
			loadedPost!.text.should.be.eql('Huge discussion how good or bad ActiveRecord is.');
		}
	});

	describe('upsert', function () {
		it('should upsert successfully', async () => {
			// These must run sequentially as we have the global context of the `Post` ActiveRecord class
			for (const connection of connections.filter(
				(c) => c.driver.supportedUpsertTypes.length > 0,
			)) {
				Post.useDataSource(connection); // change connection each time because of AR specifics

				const externalId = 'external-entity';

				await Post.upsert({ externalId, id: 1, title: 'External post' }, ['externalId']);
				const upsertInsertedExternalPost = await Post.findOneByOrFail({
					externalId,
				});

				await Post.upsert({ externalId, id: 1, title: 'External post 2' }, ['externalId']);
				const upsertUpdatedExternalPost = await Post.findOneByOrFail({
					externalId,
				});

				upsertInsertedExternalPost.id.should.be.equal(upsertUpdatedExternalPost.id);
				upsertInsertedExternalPost.title.should.not.be.equal(upsertUpdatedExternalPost.title);
			}
		});
	});

	it('should reload given entity successfully', async () => {
		// These must run sequentially as we have the global context of the `Post` ActiveRecord class
		for (const connection of connections) {
			await connection.synchronize(true);
			Post.useDataSource(connection);
			Category.useDataSource(connection);

			const category = Category.create();
			category.id = 1;
			category.name = 'Persistence';
			await category.save();

			const post = Post.create();
			post.id = 1;
			post.title = 'About ActiveRecord';
			post.categories = [category];
			await post.save();

			await post.reload();

			const assertCategory = Object.assign({}, post.categories[0]);
			post!.should.be.instanceOf(Post);
			post!.id.should.be.eql(post.id);
			post!.title.should.be.eql('About ActiveRecord');
			post!.text.should.be.eql('This is default text.');
			assertCategory.should.be.eql({
				id: 1,
				name: 'Persistence',
			});

			category.name = 'Persistence and Entity';
			await category.save();

			await post.reload();

			const assertReloadedCategory = Object.assign({}, post.categories[0]);
			assertReloadedCategory.should.be.eql({
				id: 1,
				name: 'Persistence and Entity',
			});
		}
	});

	it('should reload exactly the same entity', async () => {
		// These must run sequentially as we have the global context of the `Post` ActiveRecord class
		for (const connection of connections) {
			await connection.synchronize(true);
			Post.useDataSource(connection);
			Category.useDataSource(connection);

			const post1 = Post.create();
			post1.id = 1;
			post1.title = 'About ActiveRecord 1';
			post1.externalId = 'some external id 1';
			await post1.save();

			post1.should.be.eql({
				id: 1,
				title: 'About ActiveRecord 1',
				text: 'This is default text.',
				externalId: 'some external id 1',
			});
			await post1.reload();

			post1.should.be.eql({
				id: 1,
				title: 'About ActiveRecord 1',
				text: 'This is default text.',
				externalId: 'some external id 1',
			});

			const post2 = Post.create();
			post2.id = 2;
			post2.title = 'About ActiveRecord 2';
			post2.externalId = 'some external id 2';
			await post2.save();

			post2.should.be.eql({
				id: 2,
				title: 'About ActiveRecord 2',
				text: 'This is default text.',
				externalId: 'some external id 2',
			});
			await post2.reload();

			post2.should.be.eql({
				id: 2,
				title: 'About ActiveRecord 2',
				text: 'This is default text.',
				externalId: 'some external id 2',
			});
		}
	});
});
