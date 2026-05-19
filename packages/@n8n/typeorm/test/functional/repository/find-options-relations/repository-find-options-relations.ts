import 'reflect-metadata';
import '../../../utils/test-setup';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { DataSource } from '../../../../src/data-source/DataSource';
import { User } from './entity/User';
import { Category } from './entity/Category';
import { Post } from './entity/Post';
import { Photo } from './entity/Photo';
import { Counters } from './entity/Counters';
import { EntityPropertyNotFoundError } from '../../../../src/error/EntityPropertyNotFoundError';

describe('repository > find options > relations', () => {
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
	// Setup
	// -------------------------------------------------------------------------

	beforeEach(() =>
		Promise.all(
			connections.map(async (connection) => {
				const postUser = new User();
				postUser.name = 'Timber';
				await connection.manager.save(postUser);
				const postCountersUser = new User();
				postCountersUser.name = 'Post Counters Timber';
				await connection.manager.save(postCountersUser);
				const photoCountersUser = new User();
				photoCountersUser.name = 'Photo Counters Timber';
				await connection.manager.save(photoCountersUser);
				const photoUser = new User();
				photoUser.name = 'Photo Timber';
				await connection.manager.save(photoUser);

				const category1 = new Category();
				category1.name = 'category1';
				await connection.manager.save(category1);
				const category2 = new Category();
				category2.name = 'category2';
				await connection.manager.save(category2);

				const photo1 = new Photo();
				photo1.filename = 'photo1.jpg';
				photo1.counters = new Counters();
				photo1.counters.stars = 2;
				photo1.counters.commentCount = 19;
				photo1.counters.author = photoCountersUser;
				photo1.user = photoUser;
				await connection.manager.save(photo1);
				const photo2 = new Photo();
				photo2.filename = 'photo2.jpg';
				photo2.counters = new Counters();
				photo2.counters.stars = 3;
				photo2.counters.commentCount = 20;
				await connection.manager.save(photo2);
				const photo3 = new Photo();
				photo3.filename = 'photo3.jpg';
				photo3.counters = new Counters();
				photo3.counters.stars = 4;
				photo3.counters.commentCount = 21;
				await connection.manager.save(photo3);

				const postCounters = new Counters();
				postCounters.commentCount = 1;
				postCounters.author = postCountersUser;
				postCounters.stars = 101;

				const post = new Post();
				post.title = 'About Timber';
				post.counters = postCounters;
				post.user = postUser;
				post.categories = [category1, category2];
				post.photos = [photo1, photo2, photo3];
				await connection.manager.save(post);
			}),
		),
	);

	// -------------------------------------------------------------------------
	// Specifications
	// -------------------------------------------------------------------------

	it('should not any relations if they are not specified', () =>
		Promise.all(
			connections.map(async (connection) => {
				const loadedPost = await connection.getRepository(Post).findOne({
					where: {
						id: 1,
					},
				});
				loadedPost!.should.be.eql({
					id: 1,
					title: 'About Timber',
					counters: {
						commentCount: 1,
						stars: 101,
					},
				});
			}),
		));

	it('should load specified relations case 1', () =>
		Promise.all(
			connections.map(async (connection) => {
				const loadedPost = await connection.getRepository(Post).findOne({
					where: {
						id: 1,
					},
					relations: {
						photos: true,
					},
				});
				loadedPost!.id.should.be.equal(1);
				loadedPost!.title.should.be.equal('About Timber');
				loadedPost!.counters.commentCount.should.be.equal(1);
				loadedPost!.counters.stars.should.be.equal(101);
				loadedPost!.photos.should.deep.include({
					id: 1,
					filename: 'photo1.jpg',
					counters: {
						stars: 2,
						commentCount: 19,
					},
				});
				loadedPost!.photos.should.deep.include({
					id: 2,
					filename: 'photo2.jpg',
					counters: {
						stars: 3,
						commentCount: 20,
					},
				});
				loadedPost!.photos.should.deep.include({
					id: 3,
					filename: 'photo3.jpg',
					counters: {
						stars: 4,
						commentCount: 21,
					},
				});
			}),
		));

	it('should load specified relations case 2', () =>
		Promise.all(
			connections.map(async (connection) => {
				const loadedPost = await connection.getRepository(Post).findOne({
					where: {
						id: 1,
					},
					relations: {
						photos: true,
						user: true,
						categories: true,
					},
				});
				loadedPost!.id.should.be.equal(1);
				loadedPost!.title.should.be.equal('About Timber');
				loadedPost!.counters.commentCount.should.be.equal(1);
				loadedPost!.counters.stars.should.be.equal(101);
				loadedPost!.photos.should.deep.include({
					id: 1,
					filename: 'photo1.jpg',
					counters: {
						stars: 2,
						commentCount: 19,
					},
				});
				loadedPost!.photos.should.deep.include({
					id: 2,
					filename: 'photo2.jpg',
					counters: {
						stars: 3,
						commentCount: 20,
					},
				});
				loadedPost!.photos.should.deep.include({
					id: 3,
					filename: 'photo3.jpg',
					counters: {
						stars: 4,
						commentCount: 21,
					},
				});
				loadedPost!.user.should.be.eql({
					id: 1,
					name: 'Timber',
				});
				loadedPost!.categories.should.deep.include({
					id: 1,
					name: 'category1',
				});
				loadedPost!.categories.should.deep.include({
					id: 2,
					name: 'category2',
				});
			}),
		));

	it('should load specified relations and their sub-relations case 1', () =>
		Promise.all(
			connections.map(async (connection) => {
				const loadedPost = await connection.getRepository(Post).findOne({
					where: {
						id: 1,
					},
					relations: {
						photos: {
							user: true,
						},
						user: true,
						categories: true,
					},
				});
				loadedPost!.id.should.be.equal(1);
				loadedPost!.title.should.be.equal('About Timber');
				loadedPost!.counters.commentCount.should.be.equal(1);
				loadedPost!.counters.stars.should.be.equal(101);
				loadedPost!.photos.should.deep.include({
					id: 1,
					filename: 'photo1.jpg',
					counters: {
						stars: 2,
						commentCount: 19,
					},
					user: {
						id: 4,
						name: 'Photo Timber',
					},
				});
				loadedPost!.photos.should.deep.include({
					id: 2,
					filename: 'photo2.jpg',
					counters: {
						stars: 3,
						commentCount: 20,
					},
					user: null,
				});
				loadedPost!.photos.should.deep.include({
					id: 3,
					filename: 'photo3.jpg',
					counters: {
						stars: 4,
						commentCount: 21,
					},
					user: null,
				});
				loadedPost!.user.should.be.eql({
					id: 1,
					name: 'Timber',
				});
				loadedPost!.categories.should.deep.include({
					id: 1,
					name: 'category1',
				});
				loadedPost!.categories.should.deep.include({
					id: 2,
					name: 'category2',
				});
			}),
		));

	it('should load specified relations and their sub-relations case 2', () =>
		Promise.all(
			connections.map(async (connection) => {
				const loadedPost = await connection.getRepository(Post).findOne({
					where: {
						id: 1,
					},
					relations: {
						photos: {
							user: true,
						},
						user: true,
						counters: {
							author: true,
						},
					},
				});
				loadedPost!.id.should.be.equal(1);
				loadedPost!.title.should.be.equal('About Timber');
				loadedPost!.counters.commentCount.should.be.equal(1);
				loadedPost!.counters.stars.should.be.equal(101);
				loadedPost!.photos.should.deep.include({
					id: 1,
					filename: 'photo1.jpg',
					counters: {
						stars: 2,
						commentCount: 19,
					},
					user: {
						id: 4,
						name: 'Photo Timber',
					},
				});
				loadedPost!.photos.should.deep.include({
					id: 2,
					filename: 'photo2.jpg',
					counters: {
						stars: 3,
						commentCount: 20,
					},
					user: null,
				});
				loadedPost!.photos.should.deep.include({
					id: 3,
					filename: 'photo3.jpg',
					counters: {
						stars: 4,
						commentCount: 21,
					},
					user: null,
				});
				loadedPost!.user.should.be.eql({
					id: 1,
					name: 'Timber',
				});
				loadedPost!.counters.author.should.be.eql({
					id: 2,
					name: 'Post Counters Timber',
				});
			}),
		));

	it('should load specified relations and their sub-relations case 3', () =>
		Promise.all(
			connections.map(async (connection) => {
				const loadedPost = await connection.getRepository(Post).findOne({
					where: {
						id: 1,
					},
					relations: {
						photos: {
							user: true,
							counters: {
								author: true,
							},
						},
						user: true,
						counters: {
							author: true,
						},
					},
				});
				loadedPost!.id.should.be.equal(1);
				loadedPost!.title.should.be.equal('About Timber');
				loadedPost!.counters.commentCount.should.be.equal(1);
				loadedPost!.counters.stars.should.be.equal(101);
				loadedPost!.photos.should.deep.include({
					id: 1,
					filename: 'photo1.jpg',
					counters: {
						stars: 2,
						commentCount: 19,
						author: {
							id: 3,
							name: 'Photo Counters Timber',
						},
					},
					user: {
						id: 4,
						name: 'Photo Timber',
					},
				});
				loadedPost!.photos.should.deep.include({
					id: 2,
					filename: 'photo2.jpg',
					counters: {
						stars: 3,
						commentCount: 20,
						author: null,
					},
					user: null,
				});
				loadedPost!.photos.should.deep.include({
					id: 3,
					filename: 'photo3.jpg',
					counters: {
						stars: 4,
						commentCount: 21,
						author: null,
					},
					user: null,
				});
				loadedPost!.user.should.be.eql({
					id: 1,
					name: 'Timber',
				});
				loadedPost!.counters.author.should.be.eql({
					id: 2,
					name: 'Post Counters Timber',
				});
			}),
		));

	it('should throw error if specified relations were not found case 1', () =>
		Promise.all(
			connections.map(async (connection) => {
				await connection
					.getRepository(Post)
					.findOne({
						where: {
							id: 1,
						},
						relations: {
							// @ts-expect-error
							photos2: true,
						},
					})
					.should.eventually.be.rejectedWith(EntityPropertyNotFoundError);
			}),
		));

	it('should throw error if specified relations were not found case 2', () =>
		Promise.all(
			connections.map(async (connection) => {
				await connection
					.getRepository(Post)
					.findOne({
						where: {
							id: 1,
						},
						relations: {
							photos: true,
							counters: {
								// @ts-expect-error
								author2: true,
							},
						},
					})
					.should.eventually.be.rejectedWith(EntityPropertyNotFoundError);
			}),
		));

	it('should throw error if specified relations were not found case 3', () =>
		Promise.all(
			connections.map(async (connection) => {
				await connection
					.getRepository(Post)
					.findOne({
						where: {
							id: 1,
						},
						relations: {
							photos: true,
							// @ts-expect-error
							counters2: {
								author: true,
							},
						},
					})
					.should.eventually.be.rejectedWith(EntityPropertyNotFoundError);
			}),
		));

	it('should throw error if specified relations were not found case 4', () =>
		Promise.all(
			connections.map(async (connection) => {
				await connection
					.getRepository(Post)
					.findOne({
						where: {
							id: 1,
						},
						relations: {
							photos: {
								user: {
									// @ts-expect-error
									haha: true,
								},
							},
						},
					})
					.should.eventually.be.rejectedWith(EntityPropertyNotFoundError);
			}),
		));

	it('should throw error if specified relations were not found case 5', () =>
		Promise.all(
			connections.map(async (connection) => {
				await connection
					.getRepository(Post)
					.findOne({
						where: {
							id: 1,
						},
						relations: {
							// @ts-expect-error
							questions: true,
						},
					})
					.should.eventually.be.rejectedWith(EntityPropertyNotFoundError);
			}),
		));

	it('should throw error if specified relations were not found case 6', () =>
		Promise.all(
			connections.map(async (connection) => {
				await connection
					.getRepository(Post)
					.findOne({
						where: {
							id: 1,
						},
						relations: {
							// @ts-expect-error
							questions: {
								haha: true,
							},
						},
					})
					.should.eventually.be.rejectedWith(EntityPropertyNotFoundError);
			}),
		));
});
