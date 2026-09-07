import type { Database as Sqlite3Database } from 'sqlite3';
import {
	ConnectionIsNotSetError,
	TransactionAlreadyStartedError,
	TransactionNotStartedError,
} from '../../error';
import { QueryRunner } from '../../query-runner/QueryRunner';
import { Broadcaster } from '../../subscriber/Broadcaster';
import { DbLease, DbLeaseHolder, SqliteConnectionPool } from './SqlitePooledTypes';
import { DataSource } from '../../data-source/DataSource';
import { SqlitePooledConnectionOptions } from './SqlitePooledConnectionOptions';
import { AbstractSqliteQueryRunner } from '../sqlite-abstract/AbstractSqliteQueryRunner';
import { SqliteLibrary } from './SqliteLibrary';
import { QueryResult } from '../../query-runner/QueryResult';
import { BroadcasterResult } from '../../subscriber/BroadcasterResult';
import { TransactionCommitFailedError } from '../../error/TransactionCommitFailedError';
import { TransactionRollbackFailedError } from '../../error/TransactionRollbackFailedError';
import { AbstractSqliteDriver } from '../sqlite-abstract/AbstractSqliteDriver';

export class SqliteReadWriteQueryRunner
	extends AbstractSqliteQueryRunner
	implements QueryRunner, DbLeaseHolder
{
	//#region Properties

	private trxDbLease: DbLease | undefined;

	//#endregion Properties

	private get logger() {
		return this.connection.logger;
	}

	constructor(
		driver: AbstractSqliteDriver,
		connection: DataSource,
		private readonly sqliteLibrary: SqliteLibrary,
		private readonly writePool: SqliteConnectionPool,
		private readonly readPool: SqliteConnectionPool,
		private readonly options: SqlitePooledConnectionOptions,
	) {
		super();

		this.driver = driver;
		this.connection = connection;
		this.broadcaster = new Broadcaster(this);
	}

	/**
	 * Called before migrations are run.
	 */
	async beforeMigration(): Promise<void> {
		await this.query(`PRAGMA foreign_keys = OFF`);
	}

	/**
	 * Called after migrations are run.
	 */
	async afterMigration(): Promise<void> {
		await this.query(`PRAGMA foreign_keys = ON`);
	}

	connect() {
		// We do nothing here, as we acquire connections on demand
		return Promise.resolve();
	}

	requestRelease() {
		this.releaseTrxDbLease();
	}

	async release() {
		if (this.isReleased) {
			return;
		}

		// If transaction is active, abort it
		this.releaseTrxDbLease();

		this.isReleased = true;
	}

	/**
	 * Starts transaction.
	 */
	async startTransaction(): Promise<void> {
		if (this.isTransactionActive) {
			throw new TransactionAlreadyStartedError();
		}

		try {
			await this.broadcaster.broadcast('BeforeTransactionStart');

			this.trxDbLease = await this.writePool.leaseConnection(this);

			await this.runQueryWithinConnection(
				this.trxDbLease.connection,
				'BEGIN IMMEDIATE TRANSACTION',
			);

			await this.broadcaster.broadcast('AfterTransactionStart');
		} catch (error) {
			this.releaseTrxDbLease();

			throw error;
		}

		this.isTransactionActive = true;
	}

	/**
	 * Commits transaction.
	 * Error will be thrown if transaction was not started.
	 */
	async commitTransaction(): Promise<void> {
		if (!this.isTransactionActive) throw new TransactionNotStartedError();
		if (!this.trxDbLease) throw new TransactionNotStartedError();

		try {
			await this.broadcaster.broadcast('BeforeTransactionCommit');

			await this.runQueryWithinConnection(this.trxDbLease.connection, 'COMMIT');

			await this.broadcaster.broadcast('AfterTransactionCommit');
		} catch (commitError) {
			this.trxDbLease.markAsInvalid();
			throw new TransactionCommitFailedError(commitError);
		} finally {
			this.releaseTrxDbLease();
		}
	}

	/**
	 * Rollbacks transaction.
	 * Error will be thrown if transaction was not started.
	 */
	async rollbackTransaction(): Promise<void> {
		if (!this.isTransactionActive) throw new TransactionNotStartedError();
		if (!this.trxDbLease) throw new TransactionNotStartedError();

		try {
			await this.broadcaster.broadcast('BeforeTransactionRollback');

			await this.runQueryWithinConnection(this.trxDbLease.connection, 'ROLLBACK');

			await this.broadcaster.broadcast('AfterTransactionRollback');
		} catch (rollbackError) {
			this.trxDbLease.markAsInvalid();
			throw new TransactionRollbackFailedError(rollbackError);
		} finally {
			this.releaseTrxDbLease();
		}
	}

	/**
	 * Executes a given SQL query.
	 */
	async query(query: string, parameters?: unknown[], useStructuredResult = false): Promise<any> {
		if (!this.connection.isInitialized) {
			throw new ConnectionIsNotSetError('sqlite');
		}

		if (this.trxDbLease) {
			return await this.runQueryWithinConnection(
				this.trxDbLease.connection,
				query,
				parameters,
				useStructuredResult,
			);
		}

		const isSelectQuery = this.isReadQuery(query);

		const connectionPool = isSelectQuery ? this.readPool : this.writePool;
		return connectionPool.runExclusive(
			this,
			async (leasedDbConnection) =>
				await this.runQueryWithinConnection(
					leasedDbConnection.connection,
					query,
					parameters,
					useStructuredResult,
				),
		);
	}

	public async runQueryWithinConnection(
		connection: Sqlite3Database,
		query: string,
		parameters?: unknown[],
		useStructuredResult = false,
	): Promise<QueryResult | any> {
		const broadcasterResult = new BroadcasterResult();
		const broadcaster = this.broadcaster;

		broadcaster.broadcastBeforeQueryEvent(broadcasterResult, query, parameters);

		const maxQueryExecutionTime = this.options.maxQueryExecutionTime;

		try {
			this.logger.logQuery(query, parameters);
			const queryStartTime = +new Date();

			const result = await this.sqliteLibrary.runQuery(
				connection,
				query,
				parameters,
				useStructuredResult,
			);

			// log slow queries if maxQueryExecution time is set
			const queryEndTime = +new Date();
			const queryExecutionTime = queryEndTime - queryStartTime;
			if (maxQueryExecutionTime && queryExecutionTime > maxQueryExecutionTime)
				this.logger.logQuerySlow(queryExecutionTime, query, parameters);

			broadcaster.broadcastAfterQueryEvent(
				broadcasterResult,
				query,
				parameters,
				true,
				queryExecutionTime,
				useStructuredResult ? result.raw : result,
				undefined,
			);

			return result;
		} catch (err) {
			this.logger.logQueryError(err, query, parameters);
			broadcaster.broadcastAfterQueryEvent(
				broadcasterResult,
				query,
				parameters,
				false,
				undefined,
				undefined,
				err,
			);
			throw err;
		} finally {
			await broadcasterResult.wait();
		}
	}

	private isReadQuery(query: string) {
		return /^\s*SELECT/i.test(query);
	}

	private releaseTrxDbLease() {
		if (this.trxDbLease) {
			this.trxDbLease.release();
			this.trxDbLease = undefined;
			this.isTransactionActive = false;
		}
	}
}
