import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { DataSource } from '../../../../src/data-source/DataSource';
import { Post } from './entity/Post';
import { Category } from './entity/Category';
import { expect } from 'chai';
import { Counters } from './entity/Counters';

describe('persistence > partial persist', () => {
	// -------------------------------------------------------------------------
	// Configuration
	// -------------------------------------------------------------------------

	let connections: DataSource[];
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

	it('should persist partial entities without data loss', () =>
		Promise.all(
			connections.map(async (connection) => {
				const postRepository = connection.getRepository(Post);
				const categoryRepository = connection.getRepository(Category);

				// save a new category
				const newCategory = new Category();
				newCategory.id = 1;
				newCategory.name = 'Animals';
				newCategory.position = 999;
				await categoryRepository.save(newCategory);

				// save a new post
				const newPost = new Post();
				newPost.id = 1;
				newPost.title = 'All about animals';
				newPost.description = 'Description of the post about animals';
				newPost.categories = [newCategory];
				newPost.counters = new Counters();
				newPost.counters.stars = 5;
				newPost.counters.commentCount = 2;
				newPost.counters.metadata = 'Animals Metadata';
				await postRepository.save(newPost);

				// load a post
				const loadedPost = await postRepository.findOne({
					where: {
						id: newPost.id,
					},
					join: {
						alias: 'post',
						leftJoinAndSelect: {
							categories: 'post.categories',
						},
					},
				});

				expect(loadedPost!).not.to.be.null;
				expect(loadedPost!.categories).not.to.be.undefined;
				loadedPost!.title.should.be.equal('All about animals');
				loadedPost!.description.should.be.equal('Description of the post about animals');
				loadedPost!.categories[0].name.should.be.equal('Animals');
				loadedPost!.categories[0].position.should.be.equal(999);
				loadedPost!.counters.metadata.should.be.equal('Animals Metadata');
				loadedPost!.counters.stars.should.be.equal(5);
				loadedPost!.counters.commentCount.should.be.equal(2);

				// now update partially
				await postRepository.update({ title: 'All about animals' }, { title: 'All about bears' });

				// now check if update worked as expected, title is updated and all other columns are not touched
				const loadedPostAfterTitleUpdate = await postRepository.findOne({
					where: {
						id: 1,
					},
					join: {
						alias: 'post',
						leftJoinAndSelect: {
							categories: 'post.categories',
						},
					},
				});

				expect(loadedPostAfterTitleUpdate!).not.to.be.undefined;
				expect(loadedPostAfterTitleUpdate!.categories).not.to.be.undefined;
				loadedPostAfterTitleUpdate!.title.should.be.equal('All about bears');
				loadedPostAfterTitleUpdate!.description.should.be.equal(
					'Description of the post about animals',
				);
				loadedPostAfterTitleUpdate!.categories[0].name.should.be.equal('Animals');
				loadedPostAfterTitleUpdate!.categories[0].position.should.be.equal(999);
				loadedPostAfterTitleUpdate!.counters.metadata.should.be.equal('Animals Metadata');
				loadedPostAfterTitleUpdate!.counters.stars.should.be.equal(5);
				loadedPostAfterTitleUpdate!.counters.commentCount.should.be.equal(2);

				// now update in partial embeddable column
				await postRepository.update({ id: 1 }, { counters: { stars: 10 } });

				// now check if update worked as expected, stars counter is updated and all other columns are not touched
				const loadedPostAfterStarsUpdate = await postRepository.findOne({
					where: {
						id: 1,
					},
					join: {
						alias: 'post',
						leftJoinAndSelect: {
							categories: 'post.categories',
						},
					},
				});

				expect(loadedPostAfterStarsUpdate!).not.to.be.undefined;
				expect(loadedPostAfterStarsUpdate!.categories).not.to.be.undefined;
				loadedPostAfterStarsUpdate!.title.should.be.equal('All about bears');
				loadedPostAfterStarsUpdate!.description.should.be.equal(
					'Description of the post about animals',
				);
				loadedPostAfterStarsUpdate!.categories[0].name.should.be.equal('Animals');
				loadedPostAfterStarsUpdate!.categories[0].position.should.be.equal(999);
				loadedPostAfterStarsUpdate!.counters.metadata.should.be.equal('Animals Metadata');
				loadedPostAfterStarsUpdate!.counters.stars.should.be.equal(10);
				loadedPostAfterStarsUpdate!.counters.commentCount.should.be.equal(2);

				// now update in relational column
				await postRepository.save({
					id: 1,
					categories: [{ id: 1, name: 'Bears' }],
				});

				// now check if update worked as expected, name of category is updated and all other columns are not touched
				const loadedPostAfterCategoryUpdate = await postRepository.findOne({
					where: {
						id: 1,
					},
					join: {
						alias: 'post',
						leftJoinAndSelect: {
							categories: 'post.categories',
						},
					},
				});

				expect(loadedPostAfterCategoryUpdate!).not.to.be.undefined;
				expect(loadedPostAfterCategoryUpdate!.categories).not.to.be.undefined;
				loadedPostAfterCategoryUpdate!.title.should.be.equal('All about bears');
				loadedPostAfterCategoryUpdate!.description.should.be.equal(
					'Description of the post about animals',
				);
				loadedPostAfterCategoryUpdate!.categories[0].name.should.be.equal('Bears');
				loadedPostAfterCategoryUpdate!.categories[0].position.should.be.equal(999);
				loadedPostAfterCategoryUpdate!.counters.metadata.should.be.equal('Animals Metadata');
				loadedPostAfterCategoryUpdate!.counters.stars.should.be.equal(10);
				loadedPostAfterCategoryUpdate!.counters.commentCount.should.be.equal(2);
			}),
		));
});
