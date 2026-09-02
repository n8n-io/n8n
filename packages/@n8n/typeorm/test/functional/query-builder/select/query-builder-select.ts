import '../../../utils/test-setup';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { expect } from 'chai';
import { DataSource, In, IsNull, Raw } from '../../../../src';
import { Category } from './entity/Category';
import { Post } from './entity/Post';
import { Tag } from './entity/Tag';
import { HeroImage } from './entity/HeroImage';
import { ExternalPost } from './entity/ExternalPost';

describe('query builder > select', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [Category, Post, Tag, HeroImage, ExternalPost],
				enabledDrivers: ['sqlite', 'sqlite-pooled'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should append all entity mapped columns from main selection to select statement', () =>
		Promise.all(
			connections.map(async (connection) => {
				const sql = connection.manager.createQueryBuilder(Post, 'post').disableEscaping().getSql();

				expect(sql).to.equal(
					'SELECT post.id AS post_id, ' +
						'post.title AS post_title, ' +
						'post.description AS post_description, ' +
						'post.rating AS post_rating, ' +
						'post.version AS post_version, ' +
						'post.heroImageId AS post_heroImageId, ' +
						'post.categoryId AS post_categoryId ' +
						'FROM post post',
				);
			}),
		));

	it('should append all entity mapped columns from main selection to SELECT DISTINCT statement', () =>
		Promise.all(
			connections.map(async (connection) => {
				const sql = connection.manager
					.createQueryBuilder(Post, 'post')
					.distinct()
					.disableEscaping()
					.getSql();

				expect(sql).to.equal(
					'SELECT DISTINCT post.id AS post_id, ' +
						'post.title AS post_title, ' +
						'post.description AS post_description, ' +
						'post.rating AS post_rating, ' +
						'post.version AS post_version, ' +
						'post.heroImageId AS post_heroImageId, ' +
						'post.categoryId AS post_categoryId ' +
						'FROM post post',
				);
			}),
		));

	it('should append all entity mapped columns from both main selection and join selections to select statement', () =>
		Promise.all(
			connections.map(async (connection) => {
				const sql = connection
					.createQueryBuilder(Post, 'post')
					.leftJoinAndSelect('category', 'category')
					.disableEscaping()
					.getSql();

				expect(sql).to.equal(
					'SELECT post.id AS post_id, ' +
						'post.title AS post_title, ' +
						'post.description AS post_description, ' +
						'post.rating AS post_rating, ' +
						'post.version AS post_version, ' +
						'post.heroImageId AS post_heroImageId, ' +
						'post.categoryId AS post_categoryId, ' +
						'category.id AS category_id, ' +
						'category.name AS category_name, ' +
						'category.description AS category_description, ' +
						'category.version AS category_version ' +
						'FROM post post LEFT JOIN category category',
				);
			}),
		));

	it('should append entity mapped columns from both main alias and join aliases to select statement', () =>
		Promise.all(
			connections.map(async (connection) => {
				const sql = connection
					.createQueryBuilder(Post, 'post')
					.select('post.id')
					.addSelect('category.name')
					.leftJoin('category', 'category')
					.disableEscaping()
					.getSql();

				expect(sql).to.equal(
					'SELECT post.id AS post_id, ' +
						'category.name AS category_name ' +
						'FROM post post LEFT JOIN category category',
				);
			}),
		));

	it('should append entity mapped columns to select statement, if they passed as array', () =>
		Promise.all(
			connections.map(async (connection) => {
				const sql = connection
					.createQueryBuilder(Post, 'post')
					.select(['post.id', 'post.title'])
					.disableEscaping()
					.getSql();

				expect(sql).to.equal('SELECT post.id AS post_id, post.title AS post_title FROM post post');
			}),
		));

	it('should append raw sql to select statement', () =>
		Promise.all(
			connections.map(async (connection) => {
				const sql = connection
					.createQueryBuilder(Post, 'post')
					.select('COUNT(*) as cnt')
					.disableEscaping()
					.getSql();

				expect(sql).to.equal('SELECT COUNT(*) as cnt FROM post post');
			}),
		));

	it('should append raw sql and entity mapped column to select statement', () =>
		Promise.all(
			connections.map(async (connection) => {
				const sql = connection
					.createQueryBuilder(Post, 'post')
					.select(['COUNT(*) as cnt', 'post.title'])
					.disableEscaping()
					.getSql();

				expect(sql).to.equal('SELECT post.title AS post_title, COUNT(*) as cnt FROM post post');
			}),
		));

	it('should not create alias for selection, which is not entity mapped column', () =>
		Promise.all(
			connections.map(async (connection) => {
				const sql = connection
					.createQueryBuilder(Post, 'post')
					.select('post.name')
					.disableEscaping()
					.getSql();

				expect(sql).to.equal('SELECT post.name FROM post post');
			}),
		));

	describe('with relations and where clause', () => {
		describe('many-to-one', () => {
			it('should craft query with exact value', () =>
				Promise.all(
					connections.map(async (connection) => {
						// For github issues #2707

						const [sql, params] = connection
							.createQueryBuilder(Post, 'post')
							.select('post.id')
							.leftJoin('post.category', 'category_join')
							.where({
								category: {
									name: 'Foo',
								},
							})
							.getQueryAndParameters();

						expect(sql).to.equal(
							'SELECT "post"."id" AS "post_id" FROM "post" "post" ' +
								'LEFT JOIN "category" "category_join" ON "category_join"."id"="post"."categoryId" ' +
								'WHERE "category_join"."name" = ?',
						);

						expect(params).to.eql(['Foo']);
					}),
				));

			it('should craft query with FindOperator', () =>
				Promise.all(
					connections.map(async (connection) => {
						const [sql, params] = connection
							.createQueryBuilder(Post, 'post')
							.select('post.id')
							.leftJoin('post.category', 'category_join')
							.where({
								category: {
									name: IsNull(),
								},
							})
							.getQueryAndParameters();

						expect(sql).to.equal(
							'SELECT "post"."id" AS "post_id" FROM "post" "post" ' +
								'LEFT JOIN "category" "category_join" ON "category_join"."id"="post"."categoryId" ' +
								'WHERE "category_join"."name" IS NULL',
						);

						expect(params).to.eql([]);
					}),
				));

			it('should craft query with Raw', () =>
				Promise.all(
					connections.map(async (connection) => {
						// For github issue #6264
						const [sql, params] = connection
							.createQueryBuilder(Post, 'post')
							.select('post.id')
							.leftJoin('post.category', 'category_join')
							.where({
								category: {
									name: Raw((path) => `SOME_FUNCTION(${path})`),
								},
							})
							.getQueryAndParameters();

						expect(sql).to.equal(
							'SELECT "post"."id" AS "post_id" FROM "post" "post" ' +
								'LEFT JOIN "category" "category_join" ON "category_join"."id"="post"."categoryId" ' +
								'WHERE SOME_FUNCTION("category_join"."name")',
						);

						expect(params).to.eql([]);
					}),
				));
		});

		describe('one-to-many', () => {
			it('should craft query with exact value', () =>
				Promise.all(
					connections.map(async (connection) => {
						expect(() => {
							connection
								.createQueryBuilder(Category, 'category')
								.select('category.id')
								.leftJoin('category.posts', 'posts')
								.where({
									posts: {
										id: 10,
									},
								})
								.getQueryAndParameters();
						}).to.throw();
					}),
				));

			it('should craft query with FindOperator', () =>
				Promise.all(
					connections.map(async (connection) => {
						// For github issue #6647

						expect(() => {
							connection
								.createQueryBuilder(Category, 'category')
								.select('category.id')
								.leftJoin('category.posts', 'posts')
								.where({
									posts: {
										id: IsNull(),
									},
								})
								.getQueryAndParameters();
						}).to.throw();
					}),
				));
		});

		describe('many-to-many', () => {
			it('should craft query with exact value', () =>
				Promise.all(
					connections.map(async (connection) => {
						expect(() => {
							connection
								.createQueryBuilder(Post, 'post')
								.select('post.id')
								.leftJoin('post.tags', 'tags_join')
								.where({
									tags: {
										name: 'Foo',
									},
								})
								.getQueryAndParameters();
						}).to.throw();
					}),
				));

			it('should craft query with FindOperator', () =>
				Promise.all(
					connections.map(async (connection) => {
						expect(() => {
							connection
								.createQueryBuilder(Post, 'post')
								.select('post.id')
								.leftJoin('post.tags', 'tags_join')
								.where({
									tags: {
										name: IsNull(),
									},
								})
								.getQueryAndParameters();
						}).to.throw();
					}),
				));
		});

		describe('one-to-one', () => {
			it('should craft query with exact value', () =>
				Promise.all(
					connections.map(async (connection) => {
						const [sql, params] = connection
							.createQueryBuilder(Post, 'post')
							.select('post.id')
							.leftJoin('post.heroImage', 'hero_join')
							.where({
								heroImage: {
									url: 'Foo',
								},
							})
							.getQueryAndParameters();

						expect(sql).to.equal(
							'SELECT "post"."id" AS "post_id" FROM "post" "post" ' +
								'LEFT JOIN "hero_image" "hero_join" ON "hero_join"."id"="post"."heroImageId" ' +
								'WHERE "hero_join"."url" = ?',
						);

						expect(params).to.eql(['Foo']);
					}),
				));

			it('should craft query with FindOperator', () =>
				Promise.all(
					connections.map(async (connection) => {
						const [sql, params] = connection
							.createQueryBuilder(Post, 'post')
							.select('post.id')
							.leftJoin('post.heroImage', 'hero_join')
							.where({
								heroImage: {
									url: IsNull(),
								},
							})
							.getQueryAndParameters();

						expect(sql).to.equal(
							'SELECT "post"."id" AS "post_id" FROM "post" "post" ' +
								'LEFT JOIN "hero_image" "hero_join" ON "hero_join"."id"="post"."heroImageId" ' +
								'WHERE "hero_join"."url" IS NULL',
						);

						expect(params).to.eql([]);
					}),
				));
		});

		describe('deeply nested relations', () => {
			it('should craft query with exact value', () =>
				Promise.all(
					connections.map(async (connection) => {
						// For github issue #7251

						const [sql, params] = connection
							.createQueryBuilder(HeroImage, 'hero')
							.leftJoin('hero.post', 'posts')
							.leftJoin('posts.category', 'category')
							.where({
								post: {
									category: {
										name: 'Foo',
									},
								},
							})
							.getQueryAndParameters();

						expect(sql).to.equal(
							'SELECT "hero"."id" AS "hero_id", "hero"."url" AS "hero_url" ' +
								'FROM "hero_image" "hero" ' +
								'LEFT JOIN "post" "posts" ON "posts"."heroImageId"="hero"."id"  ' +
								'LEFT JOIN "category" "category" ON "category"."id"="posts"."categoryId" ' +
								'WHERE "category"."name" = ?',
						);

						expect(params).to.eql(['Foo']);
					}),
				));

			it('should craft query with FindOperator', () =>
				Promise.all(
					connections.map(async (connection) => {
						// For github issue #4906

						const [sql, params] = connection
							.createQueryBuilder(HeroImage, 'hero')
							.leftJoin('hero.post', 'posts')
							.leftJoin('posts.category', 'category')
							.where({
								post: {
									category: {
										name: In(['Foo', 'Bar', 'Baz']),
									},
								},
							})
							.getQueryAndParameters();

						expect(sql).to.equal(
							'SELECT "hero"."id" AS "hero_id", "hero"."url" AS "hero_url" ' +
								'FROM "hero_image" "hero" ' +
								'LEFT JOIN "post" "posts" ON "posts"."heroImageId"="hero"."id"  ' +
								'LEFT JOIN "category" "category" ON "category"."id"="posts"."categoryId" ' +
								'WHERE "category"."name" IN (?, ?, ?)',
						);

						expect(params).to.eql(['Foo', 'Bar', 'Baz']);
					}),
				));
		});
	});

	describe('query execution and retrieval', () => {
		it('should return a single entity for getOne when found', () =>
			Promise.all(
				connections.map(async (connection) => {
					await connection.getRepository(Post).save({
						id: '1',
						title: 'Hello',
						description: 'World',
						rating: 0,
					});

					const entity = await connection
						.createQueryBuilder(Post, 'post')
						.where('post.id = :id', { id: '1' })
						.getOne();

					expect(entity).not.to.be.null;
					expect(entity!.id).to.equal('1');
					expect(entity!.title).to.equal('Hello');
				}),
			));

		it('should return undefined for getOne when not found', () =>
			Promise.all(
				connections.map(async (connection) => {
					await connection.getRepository(Post).save({
						id: '1',
						title: 'Hello',
						description: 'World',
						rating: 0,
					});

					const entity = await connection
						.createQueryBuilder(Post, 'post')
						.where('post.id = :id', { id: '2' })
						.getOne();

					expect(entity).to.be.null;
				}),
			));

		it('should return a single entity for getOneOrFail when found', () =>
			Promise.all(
				connections.map(async (connection) => {
					await connection.getRepository(Post).save({
						id: '1',
						title: 'Hello',
						description: 'World',
						rating: 0,
					});

					const entity = await connection
						.createQueryBuilder(Post, 'post')
						.where('post.id = :id', { id: '1' })
						.getOneOrFail();

					expect(entity.id).to.equal('1');
					expect(entity.title).to.equal('Hello');
				}),
			));

		it('should throw an Error for getOneOrFail when not found', () =>
			Promise.all(
				connections.map(async (connection) => {
					await connection.getRepository(Post).save({
						id: '1',
						title: 'Hello',
						description: 'World',
						rating: 0,
					});

					await expect(
						connection
							.createQueryBuilder(Post, 'post')
							.where('post.id = :id', { id: '2' })
							.getOneOrFail(),
					).to.be.rejectedWith('');
				}),
			));
	});

	describe('where-in-ids', () => {
		it('should create expected query with simple primary keys', () =>
			Promise.all(
				connections.map(async (connection) => {
					const [sql, params] = connection
						.createQueryBuilder(Post, 'post')
						.select('post.id')
						.whereInIds(['1', '2', '5', '9'])
						.disableEscaping()
						.getQueryAndParameters();

					expect(sql).to.equal(
						'SELECT post.id AS post_id FROM post post WHERE post.id IN (?, ?, ?, ?)',
					);
					expect(params).to.eql(['1', '2', '5', '9']);
				}),
			));

		it('should create expected query with composite primary keys', () =>
			Promise.all(
				connections.map(async (connection) => {
					const [sql, params] = connection
						.createQueryBuilder(ExternalPost, 'post')
						.select('post.id')
						.whereInIds([
							{ outlet: 'foo', id: '1' },
							{ outlet: 'bar', id: '2' },
							{ outlet: 'baz', id: '5' },
						])
						.disableEscaping()
						.getQueryAndParameters();

					expect(sql).to.equal(
						'SELECT post.id AS post_id FROM external_post post WHERE ' +
							'(((post.outlet = ? AND post.id = ?)) OR ' +
							'((post.outlet = ? AND post.id = ?)) OR ' +
							'((post.outlet = ? AND post.id = ?)))',
					);
					expect(params).to.eql(['foo', '1', 'bar', '2', 'baz', '5']);
				}),
			));

		it('should create expected query with composite primary keys with missing value', () =>
			Promise.all(
				connections.map(async (connection) => {
					const [sql, params] = connection
						.createQueryBuilder(ExternalPost, 'post')
						.select('post.id')
						.whereInIds([{ outlet: 'foo', id: '1' }, { outlet: 'bar', id: '2' }, { id: '5' }])
						.disableEscaping()
						.getQueryAndParameters();

					expect(sql).to.equal(
						'SELECT post.id AS post_id FROM external_post post WHERE ' +
							'(((post.outlet = ? AND post.id = ?)) OR ' +
							'((post.outlet = ? AND post.id = ?)) OR ' +
							'(post.id = ?))',
					);
					expect(params).to.eql(['foo', '1', 'bar', '2', '5']);
				}),
			));
	});
});
