import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { DataSource } from '../../../../src/data-source/DataSource';
import { PostWithVersion } from './entity/PostWithVersion';
import { Post } from './entity/Post';
import { expect } from 'chai';
import { PostWithoutVersionAndUpdateDate } from './entity/PostWithoutVersionAndUpdateDate';
import { PostWithUpdateDate } from './entity/PostWithUpdateDate';
import { PostWithVersionAndUpdatedDate } from './entity/PostWithVersionAndUpdatedDate';
import { OptimisticLockVersionMismatchError } from '../../../../src/error/OptimisticLockVersionMismatchError';
import { OptimisticLockCanNotBeUsedError } from '../../../../src/error/OptimisticLockCanNotBeUsedError';
import { NoVersionOrUpdateDateColumnError } from '../../../../src/error/NoVersionOrUpdateDateColumnError';
import { PessimisticLockTransactionRequiredError } from '../../../../src/error/PessimisticLockTransactionRequiredError';
import { LockNotSupportedOnGivenDriverError } from '../../../../src/error/LockNotSupportedOnGivenDriverError';
import { DriverUtils } from '../../../../src/driver/DriverUtils';

describe('query builder > locking', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should not attach pessimistic read lock statement on query if locking is not used', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (DriverUtils.isSQLiteFamily(connection.driver)) return;

				const sql = connection
					.createQueryBuilder(PostWithVersion, 'post')
					.where('post.id = :id', { id: 1 })
					.getSql();

				expect(sql.indexOf('LOCK IN SHARE MODE') === -1).to.be.true;
				expect(sql.indexOf('FOR SHARE') === -1).to.be.true;
				expect(sql.indexOf('WITH (HOLDLOCK, ROWLOCK)') === -1).to.be.true;
			}),
		));

	it('should throw error if pessimistic lock used without transaction', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (DriverUtils.isSQLiteFamily(connection.driver)) return;

				return Promise.all([
					connection
						.createQueryBuilder(PostWithVersion, 'post')
						.setLock('pessimistic_read')
						.where('post.id = :id', { id: 1 })
						.getOne()
						.should.be.rejectedWith(PessimisticLockTransactionRequiredError),

					connection
						.createQueryBuilder(PostWithVersion, 'post')
						.setLock('pessimistic_write')
						.where('post.id = :id', { id: 1 })
						.getOne()
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
						entityManager
							.createQueryBuilder(PostWithVersion, 'post')
							.setLock('pessimistic_read')
							.where('post.id = :id', { id: 1 })
							.getOne().should.not.be.rejected,

						entityManager
							.createQueryBuilder(PostWithVersion, 'post')
							.setLock('pessimistic_write')
							.where('post.id = :id', { id: 1 })
							.getOne().should.not.be.rejected,
					]);
				});
			}),
		));

	it('should throw error if for no key update lock used without transaction', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (connection.driver.options.type === 'postgres') {
					return connection
						.createQueryBuilder(PostWithVersion, 'post')
						.setLock('for_no_key_update')
						.where('post.id = :id', { id: 1 })
						.getOne()
						.should.be.rejectedWith(PessimisticLockTransactionRequiredError);
				}
				return;
			}),
		));

	it('should not throw error if for no key update lock used with transaction', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (connection.driver.options.type === 'postgres') {
					return connection.manager.transaction((entityManager) => {
						return Promise.all([
							entityManager
								.createQueryBuilder(PostWithVersion, 'post')
								.setLock('for_no_key_update')
								.where('post.id = :id', { id: 1 })
								.getOne().should.not.be.rejected,
						]);
					});
				}
				return;
			}),
		));

	it('should throw error if for key share lock used without transaction', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (connection.driver.options.type === 'postgres') {
					return connection
						.createQueryBuilder(PostWithVersion, 'post')
						.setLock('for_key_share')
						.where('post.id = :id', { id: 1 })
						.getOne()
						.should.be.rejectedWith(PessimisticLockTransactionRequiredError);
				}
				return;
			}),
		));

	it('should not throw error if for key share lock used with transaction', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (connection.driver.options.type === 'postgres') {
					return connection.manager.transaction((entityManager) => {
						return Promise.all([
							entityManager
								.createQueryBuilder(PostWithVersion, 'post')
								.setLock('for_key_share')
								.where('post.id = :id', { id: 1 })
								.getOne().should.not.be.rejected,
						]);
					});
				}
				return;
			}),
		));

	it('should throw error if pessimistic_partial_write lock used without transaction', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (connection.driver.options.type === 'postgres') {
					return connection
						.createQueryBuilder(PostWithVersion, 'post')
						.setLock('pessimistic_partial_write')
						.where('post.id = :id', { id: 1 })
						.getOne()
						.should.be.rejectedWith(PessimisticLockTransactionRequiredError);
				}

				return;
			}),
		));

	it('should not throw error if pessimistic_partial_write lock used with transaction', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (connection.driver.options.type === 'postgres') {
					return connection.manager.transaction((entityManager) => {
						return Promise.all([
							entityManager
								.createQueryBuilder(PostWithVersion, 'post')
								.setLock('pessimistic_partial_write')
								.where('post.id = :id', { id: 1 })
								.getOne().should.not.be.rejected,
						]);
					});
				}

				return;
			}),
		));

	it('should throw error if pessimistic_write_or_fail lock used without transaction', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (connection.driver.options.type === 'postgres') {
					return connection
						.createQueryBuilder(PostWithVersion, 'post')
						.setLock('pessimistic_write_or_fail')
						.where('post.id = :id', { id: 1 })
						.getOne()
						.should.be.rejectedWith(PessimisticLockTransactionRequiredError);
				}

				return;
			}),
		));

	it('should not throw error if pessimistic_write_or_fail lock used with transaction', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (connection.driver.options.type === 'postgres') {
					return connection.manager.transaction((entityManager) => {
						return Promise.all([
							entityManager
								.createQueryBuilder(PostWithVersion, 'post')
								.setLock('pessimistic_write_or_fail')
								.where('post.id = :id', { id: 1 })
								.getOne().should.not.be.rejected,
						]);
					});
				}

				return;
			}),
		));

	it('should attach pessimistic read lock statement on query if locking enabled', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (DriverUtils.isSQLiteFamily(connection.driver)) return;

				const sql = connection
					.createQueryBuilder(PostWithVersion, 'post')
					.setLock('pessimistic_read')
					.where('post.id = :id', { id: 1 })
					.getSql();

				if (connection.driver.options.type === 'postgres') {
					expect(sql.indexOf('FOR SHARE') !== -1).to.be.true;
				}
			}),
		));

	it('should not attach pessimistic write lock statement on query if locking is not used', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (DriverUtils.isSQLiteFamily(connection.driver)) return;

				const sql = connection
					.createQueryBuilder(PostWithVersion, 'post')
					.where('post.id = :id', { id: 1 })
					.getSql();

				expect(sql.indexOf('FOR UPDATE') === -1).to.be.true;
				expect(sql.indexOf('WITH (UPDLOCK, ROWLOCK)') === -1).to.be.true;
			}),
		));

	it('should attach pessimistic write lock statement on query if locking enabled', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (DriverUtils.isSQLiteFamily(connection.driver)) return;

				const sql = connection
					.createQueryBuilder(PostWithVersion, 'post')
					.setLock('pessimistic_write')
					.where('post.id = :id', { id: 1 })
					.getSql();

				if (connection.driver.options.type === 'postgres') {
					expect(sql.indexOf('FOR UPDATE') !== -1).to.be.true;
				}
			}),
		));

	it('should not attach for no key update lock statement on query if locking is not used', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (connection.driver.options.type === 'postgres') {
					const sql = connection
						.createQueryBuilder(PostWithVersion, 'post')
						.where('post.id = :id', { id: 1 })
						.getSql();

					expect(sql.indexOf('FOR NO KEY UPDATE') === -1).to.be.true;
				}
				return;
			}),
		));

	it('should attach for no key update lock statement on query if locking enabled', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (connection.driver.options.type === 'postgres') {
					const sql = connection
						.createQueryBuilder(PostWithVersion, 'post')
						.setLock('for_no_key_update')
						.where('post.id = :id', { id: 1 })
						.getSql();

					expect(sql.indexOf('FOR NO KEY UPDATE') !== -1).to.be.true;
				}
				return;
			}),
		));

	it('should not attach for key share lock statement on query if locking is not used', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (connection.driver.options.type === 'postgres') {
					const sql = connection
						.createQueryBuilder(PostWithVersion, 'post')
						.where('post.id = :id', { id: 1 })
						.getSql();

					expect(sql.indexOf('FOR KEY SHARE') === -1).to.be.true;
				}
				return;
			}),
		));

	it('should attach for key share lock statement on query if locking enabled', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (connection.driver.options.type === 'postgres') {
					const sql = connection
						.createQueryBuilder(PostWithVersion, 'post')
						.setLock('for_key_share')
						.where('post.id = :id', { id: 1 })
						.getSql();

					expect(sql.indexOf('FOR KEY SHARE') !== -1).to.be.true;
				}
				return;
			}),
		));

	it('should not attach pessimistic_partial_write lock statement on query if locking is not used', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (connection.driver.options.type === 'postgres') {
					const sql = connection
						.createQueryBuilder(PostWithVersion, 'post')
						.where('post.id = :id', { id: 1 })
						.getSql();

					expect(sql.indexOf('FOR UPDATE SKIP LOCKED') === -1).to.be.true;
				}
				return;
			}),
		));

	it('should attach pessimistic_partial_write lock statement on query if locking enabled', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (connection.driver.options.type === 'postgres') {
					const sql = connection
						.createQueryBuilder(PostWithVersion, 'post')
						.setLock('pessimistic_partial_write')
						.where('post.id = :id', { id: 1 })
						.getSql();

					expect(sql.indexOf('FOR UPDATE SKIP LOCKED') !== -1).to.be.true;
				}
				return;
			}),
		));

	it('should not attach pessimistic_write_or_fail lock statement on query if locking is not used', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (connection.driver.options.type === 'postgres') {
					const sql = connection
						.createQueryBuilder(PostWithVersion, 'post')
						.where('post.id = :id', { id: 1 })
						.getSql();

					expect(sql.indexOf('FOR UPDATE NOWAIT') === -1).to.be.true;
				}
				return;
			}),
		));

	it('should attach pessimistic_write_or_fail lock statement on query if locking enabled', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (connection.driver.options.type === 'postgres') {
					const sql = connection
						.createQueryBuilder(PostWithVersion, 'post')
						.setLock('pessimistic_write_or_fail')
						.where('post.id = :id', { id: 1 })
						.getSql();

					expect(sql.indexOf('FOR UPDATE NOWAIT') !== -1).to.be.true;
				}
				return;
			}),
		));

	it('should throw error if optimistic lock used with getMany method', () =>
		Promise.all(
			connections.map(async (connection) => {
				return connection
					.createQueryBuilder(PostWithVersion, 'post')
					.setLock('optimistic', 1)
					.getMany()
					.should.be.rejectedWith(OptimisticLockCanNotBeUsedError);
			}),
		));

	it('should throw error if optimistic lock used with getCount method', () =>
		Promise.all(
			connections.map(async (connection) => {
				return connection
					.createQueryBuilder(PostWithVersion, 'post')
					.setLock('optimistic', 1)
					.getCount()
					.should.be.rejectedWith(OptimisticLockCanNotBeUsedError);
			}),
		));

	it('should throw error if optimistic lock used with getManyAndCount method', () =>
		Promise.all(
			connections.map(async (connection) => {
				return connection
					.createQueryBuilder(PostWithVersion, 'post')
					.setLock('optimistic', 1)
					.getManyAndCount()
					.should.be.rejectedWith(OptimisticLockCanNotBeUsedError);
			}),
		));

	it('should throw error if optimistic lock used with getRawMany method', () =>
		Promise.all(
			connections.map(async (connection) => {
				return connection
					.createQueryBuilder(PostWithVersion, 'post')
					.setLock('optimistic', 1)
					.getRawMany()
					.should.be.rejectedWith(OptimisticLockCanNotBeUsedError);
			}),
		));

	it('should throw error if optimistic lock used with getRawOne method', () =>
		Promise.all(
			connections.map(async (connection) => {
				return connection
					.createQueryBuilder(PostWithVersion, 'post')
					.setLock('optimistic', 1)
					.where('post.id = :id', { id: 1 })
					.getRawOne()
					.should.be.rejectedWith(OptimisticLockCanNotBeUsedError);
			}),
		));

	it('should not throw error if optimistic lock used with getOne method', () =>
		Promise.all(
			connections.map(async (connection) => {
				return connection
					.createQueryBuilder(PostWithVersion, 'post')
					.setLock('optimistic', 1)
					.where('post.id = :id', { id: 1 })
					.getOne().should.not.be.rejected;
			}),
		));

	it.skip('should throw error if entity does not have version and update date columns', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new PostWithoutVersionAndUpdateDate();
				post.title = 'New post';
				await connection.manager.save(post);

				return connection
					.createQueryBuilder(PostWithoutVersionAndUpdateDate, 'post')
					.setLock('optimistic', 1)
					.where('post.id = :id', { id: 1 })
					.getOne()
					.should.be.rejectedWith(NoVersionOrUpdateDateColumnError);
			}),
		));

	// skipped because inserted milliseconds are not always equal to what we say it to insert, unskip when needed
	it.skip('should throw error if actual version does not equal expected version', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new PostWithVersion();
				post.title = 'New post';
				await connection.manager.save(post);

				return connection
					.createQueryBuilder(PostWithVersion, 'post')
					.setLock('optimistic', 2)
					.where('post.id = :id', { id: 1 })
					.getOne()
					.should.be.rejectedWith(OptimisticLockVersionMismatchError);
			}),
		));

	// skipped because inserted milliseconds are not always equal to what we say it to insert, unskip when needed
	it.skip('should not throw error if actual version and expected versions are equal', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new PostWithVersion();
				post.title = 'New post';
				await connection.manager.save(post);

				return connection
					.createQueryBuilder(PostWithVersion, 'post')
					.setLock('optimistic', 1)
					.where('post.id = :id', { id: 1 })
					.getOne().should.not.be.rejected;
			}),
		));

	// skipped because inserted milliseconds are not always equal to what we say it to insert, unskip when needed
	it.skip('should throw error if actual updated date does not equal expected updated date', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new PostWithUpdateDate();
				post.title = 'New post';
				await connection.manager.save(post);

				return connection
					.createQueryBuilder(PostWithUpdateDate, 'post')
					.setLock('optimistic', new Date(2017, 1, 1))
					.where('post.id = :id', { id: 1 })
					.getOne()
					.should.be.rejectedWith(OptimisticLockVersionMismatchError);
			}),
		));

	// skipped because inserted milliseconds are not always equal to what we say it to insert, unskip when needed
	it.skip('should not throw error if actual updated date and expected updated date are equal', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new PostWithUpdateDate();
				post.title = 'New post';
				await connection.manager.save(post);

				return connection
					.createQueryBuilder(PostWithUpdateDate, 'post')
					.setLock('optimistic', post.updateDate)
					.where('post.id = :id', { id: 1 })
					.getOne().should.not.be.rejected;
			}),
		));

	// skipped because inserted milliseconds are not always equal to what we say it to insert, unskip when needed
	it.skip('should work if both version and update date columns applied', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new PostWithVersionAndUpdatedDate();
				post.title = 'New post';
				await connection.manager.save(post);

				return Promise.all([
					connection
						.createQueryBuilder(PostWithVersionAndUpdatedDate, 'post')
						.setLock('optimistic', post.updateDate)
						.where('post.id = :id', { id: 1 })
						.getOne().should.not.be.rejected,

					connection
						.createQueryBuilder(PostWithVersionAndUpdatedDate, 'post')
						.setLock('optimistic', 1)
						.where('post.id = :id', { id: 1 })
						.getOne().should.not.be.rejected,
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
								.createQueryBuilder(PostWithVersion, 'post')
								.setLock('pessimistic_read')
								.where('post.id = :id', { id: 1 })
								.getOne()
								.should.be.rejectedWith(LockNotSupportedOnGivenDriverError),

							entityManager
								.createQueryBuilder(PostWithVersion, 'post')
								.setLock('pessimistic_write')
								.where('post.id = :id', { id: 1 })
								.getOne()
								.should.be.rejectedWith(LockNotSupportedOnGivenDriverError),
						]);
					});

				return;
			}),
		));

	it('should throw error if for no key update locking not supported by given driver', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (!(connection.driver.options.type === 'postgres')) {
					return connection.manager.transaction((entityManager) => {
						return Promise.all([
							entityManager
								.createQueryBuilder(PostWithVersion, 'post')
								.setLock('for_no_key_update')
								.where('post.id = :id', { id: 1 })
								.getOne()
								.should.be.rejectedWith(LockNotSupportedOnGivenDriverError),
						]);
					});
				}

				return;
			}),
		));

	it('should throw error if for key share locking not supported by given driver', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (!DriverUtils.isPostgresFamily(connection.driver)) {
					return connection.manager.transaction((entityManager) => {
						return Promise.all([
							entityManager
								.createQueryBuilder(PostWithVersion, 'post')
								.setLock('for_key_share')
								.where('post.id = :id', { id: 1 })
								.getOne()
								.should.be.rejectedWith(LockNotSupportedOnGivenDriverError),
						]);
					});
				}

				return;
			}),
		));

	it('should only specify locked tables in FOR UPDATE OF clause if argument is given', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (!(connection.driver.options.type === 'postgres')) return;

				const sql = connection
					.createQueryBuilder(Post, 'post')
					.innerJoin('post.author', 'user')
					.setLock('pessimistic_write', undefined, ['user'])
					.getSql();

				expect(sql).to.match(/FOR UPDATE OF user$/);

				const sql2 = connection
					.createQueryBuilder(Post, 'post')
					.innerJoin('post.author', 'user')
					.setLock('pessimistic_write', undefined, ['post', 'user'])
					.getSql();

				expect(sql2).to.match(/FOR UPDATE OF post, user$/);
			}),
		));

	it('should not allow empty array for lockTables', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (!(connection.driver.options.type === 'postgres')) return;

				return connection.manager.transaction((entityManager) => {
					return Promise.all([
						entityManager
							.createQueryBuilder(Post, 'post')
							.innerJoin('post.author', 'user')
							.setLock('pessimistic_write', undefined, [])
							.getOne()
							.should.be.rejectedWith('lockTables cannot be an empty array'),
					]);
				});
			}),
		));

	it('should throw error when specifying a table that is not part of the query', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (!(connection.driver.options.type === 'postgres')) return;

				return connection.manager
					.transaction((entityManager) => {
						return Promise.all([
							entityManager
								.createQueryBuilder(Post, 'post')
								.innerJoin('post.author', 'user')
								.setLock('pessimistic_write', undefined, ['img'])
								.getOne(),
						]);
						// With the exception being thrown the transaction is not closed. if ".should.be.rejectedWith" is added to the inner promise
					})
					.should.be.rejectedWith('relation "img" in FOR UPDATE clause not found in FROM clause');
			}),
		));

	it('should allow on a left join', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (connection.driver.options.type === 'postgres') {
					return connection.manager.transaction((entityManager) => {
						return Promise.all([
							entityManager
								.createQueryBuilder(Post, 'post')
								.leftJoin('post.author', 'user')
								.setLock('pessimistic_write', undefined, ['post'])
								.getOne(),
							entityManager
								.createQueryBuilder(Post, 'post')
								.leftJoin('post.author', 'user')
								.setLock('pessimistic_write')
								.getOne()
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
						entityManager
							.createQueryBuilder(Post, 'post')
							.leftJoin('post.author', 'user')
							.setLock('pessimistic_read', undefined, ['post'])
							.getOne(),
						entityManager
							.createQueryBuilder(Post, 'post')
							.leftJoin('post.author', 'user')
							.setLock('pessimistic_write', undefined, ['post'])
							.getOne(),
						entityManager
							.createQueryBuilder(Post, 'post')
							.leftJoin('post.author', 'user')
							.setLock('pessimistic_partial_write', undefined, ['post'])
							.getOne(),
						entityManager
							.createQueryBuilder(Post, 'post')
							.leftJoin('post.author', 'user')
							.setLock('pessimistic_write_or_fail', undefined, ['post'])
							.getOne(),
						entityManager
							.createQueryBuilder(Post, 'post')
							.leftJoin('post.author', 'user')
							.setLock('for_no_key_update', undefined, ['post'])
							.getOne(),
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
						entityManager
							.createQueryBuilder(Post, 'post')
							.innerJoin('post.categories', 'cat')
							.innerJoin('cat.images', 'img')
							.setLock('pessimistic_write', undefined, ['img'])
							.getOne(),
					]);
				});
			}),
		));

	it('pessimistic_partial_write and skip_locked works', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (connection.driver.options.type === 'postgres') {
					const sql = connection
						.createQueryBuilder(PostWithVersion, 'post')
						.setLock('pessimistic_partial_write')
						.setOnLocked('skip_locked')
						.where('post.id = :id', { id: 1 })
						.getSql();

					expect(sql.endsWith('FOR UPDATE SKIP LOCKED')).to.be.true;
				}
			}),
		));

	it('pessimistic_write_or_fail and skip_locked ignores skip_locked', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (connection.driver.options.type === 'postgres') {
					const sql = connection
						.createQueryBuilder(PostWithVersion, 'post')
						.setLock('pessimistic_write_or_fail')
						.setOnLocked('skip_locked')
						.where('post.id = :id', { id: 1 })
						.getSql();

					expect(sql.endsWith('FOR UPDATE NOWAIT')).to.be.true;
				}
			}),
		));

	it('skip_locked with "pessimistic_read"', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (connection.driver.options.type === 'postgres') {
					const sql = connection
						.createQueryBuilder(PostWithVersion, 'post')
						.setLock('pessimistic_read')
						.setOnLocked('skip_locked')
						.where('post.id = :id', { id: 1 })
						.getSql();

					expect(sql.endsWith('FOR SHARE SKIP LOCKED')).to.be.true;
				}
			}),
		));

	it('nowait with "pessimistic_read"', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (connection.driver.options.type === 'postgres') {
					const sql = connection
						.createQueryBuilder(PostWithVersion, 'post')
						.setLock('pessimistic_read')
						.setOnLocked('nowait')
						.where('post.id = :id', { id: 1 })
						.getSql();

					expect(sql.endsWith('FOR SHARE NOWAIT')).to.be.true;
				}
			}),
		));

	it('skip_locked with "pessimistic_read" check getOne', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (connection.driver.options.type === 'postgres') {
					return connection.manager.transaction((entityManager) => {
						return Promise.resolve(
							entityManager
								.createQueryBuilder(PostWithVersion, 'post')
								.setLock('pessimistic_read')
								.setOnLocked('skip_locked')
								.where('post.id = :id', { id: 1 })
								.getOne().should.not.be.rejected,
						);
					});
				}
			}),
		));

	it('skip_locked with "for_key_share" check getOne', () =>
		Promise.all(
			connections.map(async (connection) => {
				if (connection.driver.options.type === 'postgres') {
					return connection.manager.transaction((entityManager) => {
						return Promise.resolve(
							entityManager
								.createQueryBuilder(PostWithVersion, 'post')
								.setLock('for_key_share')
								.setOnLocked('skip_locked')
								.where('post.id = :id', { id: 1 })
								.getOne().should.not.be.rejected,
						);
					});
				}
			}),
		));
});
