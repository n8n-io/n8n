import '../../../utils/test-setup';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import {
	DataSource,
	LockNotSupportedOnGivenDriverError,
	NoVersionOrUpdateDateColumnError,
	OptimisticLockCanNotBeUsedError,
	OptimisticLockVersionMismatchError,
	PessimisticLockTransactionRequiredError,
	QueryRunner,
} from '../../../../src';
import { PostWithVersion } from './entity/PostWithVersion';
import { expect } from 'chai';
import { PostWithoutVersionAndUpdateDate } from './entity/PostWithoutVersionAndUpdateDate';
import { PostWithUpdateDate } from './entity/PostWithUpdateDate';
import { PostWithVersionAndUpdatedDate } from './entity/PostWithVersionAndUpdatedDate';
import { Post } from './entity/Post';
import { DriverUtils } from '../../../../src/driver/DriverUtils';

describe('repository > find options > locking', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should throw error if pessimistic lock used without transaction', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (DriverUtils.isSQLiteFamily(connection.driver)) return;

				return Promise.all([
					connection
						.getRepository(PostWithVersion)
						.findOne({
							where: { id: 1 },
							lock: { mode: 'pessimistic_read' },
						})
						.should.be.rejectedWith(PessimisticLockTransactionRequiredError),

					connection
						.getRepository(PostWithVersion)
						.findOne({
							where: { id: 1 },
							lock: { mode: 'pessimistic_write' },
						})
						.should.be.rejectedWith(PessimisticLockTransactionRequiredError),
				]);
			}),
		));

	it('should not throw error if pessimistic lock used with transaction', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (DriverUtils.isSQLiteFamily(connection.driver)) return;

				return connection.manager.transaction((entityManager) => {
					return Promise.all([
						entityManager.getRepository(PostWithVersion).find({
							where: { id: 1 },
							lock: { mode: 'pessimistic_read' },
						}).should.not.be.rejected,

						entityManager.getRepository(PostWithVersion).find({
							where: { id: 1 },
							lock: { mode: 'pessimistic_write' },
						}).should.not.be.rejected,
					]);
				});
			}),
		));

	it('should attach pessimistic read lock statement on query if locking enabled', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (DriverUtils.isSQLiteFamily(connection.driver)) return;

				const executedSql: string[] = [];

				await connection.manager.transaction((entityManager) => {
					const originalQuery = entityManager.queryRunner!.query.bind(entityManager.queryRunner);
					entityManager.queryRunner!.query = (...args: Parameters<QueryRunner['query']>) => {
						executedSql.push(args[0]);
						return originalQuery(...args);
					};

					return entityManager.getRepository(PostWithVersion).find({
						where: { id: 1 },
						lock: { mode: 'pessimistic_read' },
					});
				});

				if (connection.driver.options.type === 'postgres') {
					expect(executedSql[0].indexOf('FOR SHARE') !== -1).to.be.true;
				}
			}),
		));

	it('should attach for no key update lock statement on query if locking enabled', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (!(connection.driver.options.type === 'postgres')) return;

				const executedSql: string[] = [];

				await connection.manager.transaction((entityManager) => {
					const originalQuery = entityManager.queryRunner!.query.bind(entityManager.queryRunner);
					entityManager.queryRunner!.query = (...args: Parameters<QueryRunner['query']>) => {
						executedSql.push(args[0]);
						return originalQuery(...args);
					};

					return entityManager.getRepository(PostWithVersion).findOne({
						where: { id: 1 },
						lock: { mode: 'for_no_key_update' },
					});
				});

				expect(executedSql.join(' ').includes('FOR NO KEY UPDATE')).to.be.true;
			}),
		));

	it('should attach for key share lock statement on query if locking enabled', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (!(connection.driver.options.type === 'postgres')) return;

				const executedSql: string[] = [];

				await connection.manager.transaction((entityManager) => {
					const originalQuery = entityManager.queryRunner!.query.bind(entityManager.queryRunner);
					entityManager.queryRunner!.query = (...args: Parameters<QueryRunner['query']>) => {
						executedSql.push(args[0]);
						return originalQuery(...args);
					};

					return entityManager.getRepository(PostWithVersion).findOne({
						where: { id: 1 },
						lock: { mode: 'for_key_share' },
					});
				});

				expect(executedSql.join(' ').includes('FOR KEY SHARE')).to.be.true;
			}),
		));

	it('should attach SKIP LOCKED for pessimistic_read', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (!(connection.driver.options.type === 'postgres')) return;

				const executedSql: string[] = [];

				await connection.manager.transaction((entityManager) => {
					const originalQuery = entityManager.queryRunner!.query.bind(entityManager.queryRunner);
					entityManager.queryRunner!.query = (...args: Parameters<QueryRunner['query']>) => {
						executedSql.push(args[0]);
						return originalQuery(...args);
					};

					return entityManager.getRepository(PostWithVersion).findOne({
						where: { id: 1 },
						lock: {
							mode: 'pessimistic_read',
							onLocked: 'skip_locked',
						},
					});
				});

				expect(executedSql.join(' ').includes('FOR SHARE SKIP LOCKED')).to.be.true;
			}),
		));

	it('should attach NOWAIT for pessimistic_write', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (!(connection.driver.options.type === 'postgres')) return;

				const executedSql: string[] = [];

				await connection.manager.transaction((entityManager) => {
					const originalQuery = entityManager.queryRunner!.query.bind(entityManager.queryRunner);
					entityManager.queryRunner!.query = (...args: Parameters<QueryRunner['query']>) => {
						executedSql.push(args[0]);
						return originalQuery(...args);
					};

					return entityManager.getRepository(PostWithVersion).findOne({
						where: { id: 1 },
						lock: {
							mode: 'pessimistic_write',
							onLocked: 'nowait',
						},
					});
				});

				expect(executedSql.join(' ').includes('FOR UPDATE NOWAIT')).to.be.true;
			}),
		));

	it('should attach pessimistic write lock statement on query if locking enabled', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (DriverUtils.isSQLiteFamily(connection.driver)) return;

				const executedSql: string[] = [];

				await connection.manager.transaction((entityManager) => {
					const originalQuery = entityManager.queryRunner!.query.bind(entityManager.queryRunner);
					entityManager.queryRunner!.query = (...args: Parameters<QueryRunner['query']>) => {
						executedSql.push(args[0]);
						return originalQuery(...args);
					};

					return entityManager.getRepository(PostWithVersion).find({
						where: { id: 1 },
						lock: { mode: 'pessimistic_write' },
					});
				});

				if (connection.driver.options.type === 'postgres') {
					expect(executedSql[0].indexOf('FOR UPDATE') !== -1).to.be.true;
				}
			}),
		));

	it('should throw error if optimistic lock used with `find` method', () =>
		Promise.all(
			connections.map(async (connection) => {
				return connection
					.getRepository(PostWithVersion)
					.find({ lock: { mode: 'optimistic', version: 1 } })
					.should.be.rejectedWith(OptimisticLockCanNotBeUsedError);
			}),
		));

	it('should not throw error if optimistic lock used with `findOne` method', () =>
		Promise.all(
			connections.map(async (connection) => {
				return connection.getRepository(PostWithVersion).findOne({
					where: { id: 1 },
					lock: { mode: 'optimistic', version: 1 },
				}).should.not.be.rejected;
			}),
		));

	it('should throw error if entity does not have version and update date columns', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new PostWithoutVersionAndUpdateDate();
				post.title = 'New post';
				await connection.manager.save(post);

				return connection
					.getRepository(PostWithoutVersionAndUpdateDate)
					.findOne({
						where: { id: 1 },
						lock: { mode: 'optimistic', version: 1 },
					})
					.should.be.rejectedWith(NoVersionOrUpdateDateColumnError);
			}),
		));

	it('should throw error if actual version does not equal expected version', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new PostWithVersion();
				post.title = 'New post';
				await connection.manager.save(post);

				return connection
					.getRepository(PostWithVersion)
					.findOne({
						where: { id: 1 },
						lock: { mode: 'optimistic', version: 2 },
					})
					.should.be.rejectedWith(OptimisticLockVersionMismatchError);
			}),
		));

	it('should not throw error if actual version and expected versions are equal', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new PostWithVersion();
				post.title = 'New post';
				await connection.manager.save(post);

				return connection.getRepository(PostWithVersion).findOne({
					where: { id: 1 },
					lock: { mode: 'optimistic', version: 1 },
				}).should.not.be.rejected;
			}),
		));

	it('should throw error if actual updated date does not equal expected updated date', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new PostWithUpdateDate();
				post.title = 'New post';
				await connection.manager.save(post);

				return connection
					.getRepository(PostWithUpdateDate)
					.findOne({
						where: { id: 1 },
						lock: {
							mode: 'optimistic',
							version: new Date(2017, 1, 1),
						},
					})
					.should.be.rejectedWith(OptimisticLockVersionMismatchError);
			}),
		));

	it('should not throw error if actual updated date and expected updated date are equal', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new PostWithUpdateDate();
				post.title = 'New post';
				await connection.manager.save(post);

				return connection.getRepository(PostWithUpdateDate).findOne({
					where: { id: 1 },
					lock: { mode: 'optimistic', version: post.updateDate },
				}).should.not.be.rejected;
			}),
		));

	it('should work if both version and update date columns applied', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new PostWithVersionAndUpdatedDate();
				post.title = 'New post';
				await connection.manager.save(post);

				return Promise.all([
					connection.getRepository(PostWithVersionAndUpdatedDate).findOne({
						where: { id: 1 },
						lock: {
							mode: 'optimistic',
							version: post.updateDate,
						},
					}).should.not.be.rejected,
					connection.getRepository(PostWithVersionAndUpdatedDate).findOne({
						where: { id: 1 },
						lock: { mode: 'optimistic', version: 1 },
					}).should.not.be.rejected,
				]);
			}),
		));

	it('should throw error if pessimistic locking not supported by given driver', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (DriverUtils.isSQLiteFamily(connection.driver))
					return connection.manager.transaction((entityManager) => {
						return Promise.all([
							entityManager
								.getRepository(PostWithVersion)
								.findOne({
									where: { id: 1 },
									lock: { mode: 'pessimistic_read' },
								})
								.should.be.rejectedWith(LockNotSupportedOnGivenDriverError),

							entityManager
								.getRepository(PostWithVersion)
								.findOne({
									where: { id: 1 },
									lock: { mode: 'pessimistic_write' },
								})
								.should.be.rejectedWith(LockNotSupportedOnGivenDriverError),
						]);
					});

				return;
			}),
		));

	it('should not allow empty array for lockTables', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (!(connection.driver.options.type === 'postgres')) return;

				return connection.manager.transaction((entityManager) => {
					return Promise.all([
						entityManager
							.getRepository(Post)
							.findOne({
								where: { id: 1 },
								lock: { mode: 'pessimistic_write', tables: [] },
							})
							.should.be.rejectedWith('lockTables cannot be an empty array'),
					]);
				});
			}),
		));

	it('should throw error when specifying a table that is not part of the query', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (!(connection.driver.options.type === 'postgres')) return;

				return connection.manager.transaction((entityManager) => {
					return Promise.all([
						entityManager
							.getRepository(Post)
							.findOne({
								where: { id: 1 },
								relations: { author: true },
								lock: {
									mode: 'pessimistic_write',
									tables: ['img'],
								},
							})
							.should.be.rejectedWith('"img" is not part of this query'),
					]);
				});
			}),
		));

	it('should allow on a left join', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (connection.driver.options.type === 'postgres') {
					return connection.manager.transaction((entityManager) => {
						return Promise.all([
							entityManager.getRepository(Post).findOne({
								where: { id: 1 },
								relations: { author: true },
								lock: {
									mode: 'pessimistic_write',
									tables: ['post'],
								},
							}),
							entityManager
								.getRepository(Post)
								.findOne({
									where: { id: 1 },
									relations: { author: true },
									lock: { mode: 'pessimistic_write' },
								})
								.should.be.rejectedWith(
									'FOR UPDATE cannot be applied to the nullable side of an outer join',
								),
						]);
					});
				}

				return;
			}),
		));

	it('should allow using lockTables on all types of locking', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (!(connection.driver.options.type === 'postgres')) return;

				return connection.manager.transaction((entityManager) => {
					return Promise.all([
						entityManager.getRepository(Post).findOne({
							where: { id: 1 },
							relations: { author: true },
							lock: {
								mode: 'pessimistic_read',
								tables: ['post'],
							},
						}),
						entityManager.getRepository(Post).findOne({
							where: { id: 1 },
							relations: { author: true },
							lock: {
								mode: 'pessimistic_write',
								tables: ['post'],
							},
						}),
						entityManager.getRepository(Post).findOne({
							where: { id: 1 },
							relations: { author: true },
							lock: {
								mode: 'pessimistic_partial_write',
								tables: ['post'],
							},
						}),
						entityManager.getRepository(Post).findOne({
							where: { id: 1 },
							relations: { author: true },
							lock: {
								mode: 'pessimistic_write_or_fail',
								tables: ['post'],
							},
						}),
						entityManager.getRepository(Post).findOne({
							where: { id: 1 },
							relations: { author: true },
							lock: {
								mode: 'for_no_key_update',
								tables: ['post'],
							},
						}),
						entityManager.getRepository(Post).findOne({
							where: { id: 1 },
							relations: { author: true },
							lock: {
								mode: 'for_key_share',
								tables: ['post'],
							},
						}),
					]);
				});
			}),
		));

	it('should allow locking a relation of a relation', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (!(connection.driver.options.type === 'postgres')) return;

				return connection.manager.transaction((entityManager) => {
					return Promise.all([
						entityManager.getRepository(Post).findOne({
							where: { id: 1 },
							join: {
								alias: 'post',
								innerJoinAndSelect: {
									categorys: 'post.categories',
									images: 'categorys.images',
								},
							},
							lock: {
								mode: 'pessimistic_write',
								tables: ['image'],
							},
						}),
					]);
				});
			}),
		));
});
