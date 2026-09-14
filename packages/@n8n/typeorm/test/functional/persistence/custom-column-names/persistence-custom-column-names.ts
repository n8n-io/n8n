import { expect } from 'chai';
import 'reflect-metadata';
import { DataSource } from '../../../../src/data-source/DataSource';
import { Repository } from '../../../../src/repository/Repository';
import { setupSingleTestingConnection } from '../../../utils/test-utils';
import { Category } from './entity/Category';
import { CategoryMetadata } from './entity/CategoryMetadata';
import { Post } from './entity/Post';

describe('persistence > custom-column-names', function () {
	// -------------------------------------------------------------------------
	// Configuration
	// -------------------------------------------------------------------------

	// connect to db
	let dataSource: DataSource;
	before(async () => {
		const options = setupSingleTestingConnection('postgres', {
			entities: [Post, Category, CategoryMetadata],
		});
		if (!options) return;

		dataSource = new DataSource(options);
	});
	after(() => dataSource.close());

	// clean up database before each test
	function reloadDatabase() {
		if (!dataSource) return;
		return dataSource.synchronize(true).catch((e) => {
			throw e;
		});
	}

	let postRepository: Repository<Post>;
	let categoryRepository: Repository<Category>;
	let metadataRepository: Repository<CategoryMetadata>;
	before(function () {
		if (!dataSource) return;
		postRepository = dataSource.getRepository(Post);
		categoryRepository = dataSource.getRepository(Category);
		metadataRepository = dataSource.getRepository(CategoryMetadata);
	});

	// -------------------------------------------------------------------------
	// Specifications
	// -------------------------------------------------------------------------

	describe('attach exist entity to exist entity with many-to-one relation', function () {
		if (!dataSource) return;
		let newPost: Post, newCategory: Category, loadedPost: Post;

		before(reloadDatabase);

		// save a new category
		before(function () {
			newCategory = categoryRepository.create();
			newCategory.name = 'Animals';
			return categoryRepository.save(newCategory);
		});

		// save a new post
		before(function () {
			newPost = postRepository.create();
			newPost.title = 'All about animals';
			return postRepository.save(newPost);
		});

		// attach category to post and save it
		before(function () {
			newPost.category = newCategory;
			return postRepository.save(newPost);
		});

		// load a post
		before(function () {
			return postRepository
				.findOne({
					where: {
						id: 1,
					},
					join: {
						alias: 'post',
						leftJoinAndSelect: { category: 'post.category' },
					},
				})
				.then((post) => (loadedPost = post!));
		});

		it('should contain attached category', function () {
			expect(loadedPost).not.to.be.undefined;
			expect(loadedPost.category).not.to.be.undefined;
			expect(loadedPost.categoryId).not.to.be.undefined;
		});
	});

	describe('attach new entity to exist entity with many-to-one relation', function () {
		if (!dataSource) return;
		let newPost: Post, newCategory: Category, loadedPost: Post;

		before(reloadDatabase);

		// save a new category
		before(function () {
			newCategory = categoryRepository.create();
			newCategory.name = 'Animals';
			return categoryRepository.save(newCategory);
		});

		// save a new post and attach category
		before(function () {
			newPost = postRepository.create();
			newPost.title = 'All about animals';
			newPost.category = newCategory;
			return postRepository.save(newPost);
		});

		// load a post
		before(function () {
			return postRepository
				.findOne({
					where: {
						id: 1,
					},
					join: {
						alias: 'post',
						leftJoinAndSelect: { category: 'post.category' },
					},
				})
				.then((post) => (loadedPost = post!));
		});

		it('should contain attached category', function () {
			expect(loadedPost).not.to.be.undefined;
			expect(loadedPost.category).not.to.be.undefined;
			expect(loadedPost.categoryId).not.to.be.undefined;
		});
	});

	describe('attach new entity to new entity with many-to-one relation', function () {
		if (!dataSource) return;
		let newPost: Post, newCategory: Category, loadedPost: Post;

		before(reloadDatabase);

		// save a new category, post and attach category to post
		before(function () {
			newCategory = categoryRepository.create();
			newCategory.name = 'Animals';
			newPost = postRepository.create();
			newPost.title = 'All about animals';
			newPost.category = newCategory;
			return postRepository.save(newPost);
		});

		// load a post
		before(function () {
			return postRepository
				.findOne({
					where: {
						id: 1,
					},
					join: {
						alias: 'post',
						leftJoinAndSelect: { category: 'post.category' },
					},
				})
				.then((post) => (loadedPost = post!));
		});

		it('should contain attached category', function () {
			expect(loadedPost).not.to.be.undefined;
			expect(loadedPost.category).not.to.be.undefined;
			expect(loadedPost.categoryId).not.to.be.undefined;
		});
	});

	describe('attach exist entity to exist entity with one-to-one relation', function () {
		if (!dataSource) return;
		let newPost: Post, newCategory: Category, newMetadata: CategoryMetadata, loadedPost: Post;

		before(reloadDatabase);

		// save a new post
		before(function () {
			newPost = postRepository.create();
			newPost.title = 'All about animals';
			return postRepository.save(newPost);
		});

		// save a new category
		before(function () {
			newCategory = categoryRepository.create();
			newCategory.name = 'Animals';
			return categoryRepository.save(newCategory);
		});

		// save a new metadata
		before(function () {
			newMetadata = metadataRepository.create();
			newMetadata.keyword = 'animals';
			return metadataRepository.save(newMetadata);
		});

		// attach metadata to category and category to post and save it
		before(function () {
			newCategory.metadata = newMetadata;
			newPost.category = newCategory;
			return postRepository.save(newPost);
		});

		// load a post
		before(function () {
			return postRepository
				.findOne({
					where: {
						id: 1,
					},
					join: {
						alias: 'post',
						leftJoinAndSelect: {
							category: 'post.category',
							metadata: 'category.metadata',
						},
					},
				})
				.then((post) => (loadedPost = post!));
		});

		it('should contain attached category and metadata in the category', function () {
			expect(loadedPost).not.to.be.undefined;
			expect(loadedPost.category).not.to.be.undefined;
			expect(loadedPost.categoryId).not.to.be.undefined;
			expect(loadedPost.category.metadata).not.to.be.undefined;
			expect(loadedPost.category.metadataId).not.to.be.undefined;
		});
	});

	describe('attach new entity to exist entity with one-to-one relation', function () {
		if (!dataSource) return;
		let newPost: Post, newCategory: Category, newMetadata: CategoryMetadata, loadedPost: Post;

		before(reloadDatabase);

		// save a new post
		before(function () {
			newPost = postRepository.create();
			newPost.title = 'All about animals';
			return postRepository.save(newPost);
		});

		// save a new category and new metadata
		before(function () {
			newMetadata = metadataRepository.create();
			newMetadata.keyword = 'animals';
			newCategory = categoryRepository.create();
			newCategory.name = 'Animals';
			newCategory.metadata = newMetadata;
			return categoryRepository.save(newCategory);
		});

		// attach metadata to category and category to post and save it
		before(function () {
			newPost.category = newCategory;
			return postRepository.save(newPost);
		});

		// load a post
		before(function () {
			return postRepository
				.findOne({
					where: {
						id: 1,
					},
					join: {
						alias: 'post',
						leftJoinAndSelect: {
							category: 'post.category',
							metadata: 'category.metadata',
						},
					},
				})
				.then((post) => (loadedPost = post!));
		});

		it('should contain attached category and metadata in the category', function () {
			expect(loadedPost).not.to.be.undefined;
			expect(loadedPost.category).not.to.be.undefined;
			expect(loadedPost.categoryId).not.to.be.undefined;
			expect(loadedPost.category.metadata).not.to.be.undefined;
			expect(loadedPost.category.metadataId).not.to.be.undefined;
		});
	});
});
