import type { Database as Sqlite3Database } from 'sqlite3';
import { QueryRunnerAlreadyReleasedError } from '../../error/QueryRunnerAlreadyReleasedError';
import { QueryFailedError } from '../../error/QueryFailedError';
import { AbstractSqliteQueryRunner } from '../sqlite-abstract/AbstractSqliteQueryRunner';
import { SqliteConnectionOptions } from './SqliteConnectionOptions';
import { SqliteDriver } from './SqliteDriver';
import { Broadcaster } from '../../subscriber/Broadcaster';
import { ConnectionIsNotSetError } from '../../error/ConnectionIsNotSetError';
import { QueryResult } from '../../query-runner/QueryResult';
import { BroadcasterResult } from '../../subscriber/BroadcasterResult';

/**
 * Runs queries on a single sqlite database connection.
 *
 * Does not support compose primary keys with autoincrement field.
 * todo: need to throw exception for this case.
 */
export class SqliteQueryRunner extends AbstractSqliteQueryRunner {
	/**
	 * Database driver used by connection.
	 */
	driver: SqliteDriver;

	// -------------------------------------------------------------------------
	// Constructor
	// -------------------------------------------------------------------------

	constructor(driver: SqliteDriver) {
		super();
		this.driver = driver;
		this.connection = driver.connection;
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

	/**
	 * Executes a given SQL query.
	 */
	query(query: string, parameters?: any[], useStructuredResult = false): Promise<any> {
		if (this.isReleased) throw new QueryRunnerAlreadyReleasedError();

		const connection = this.driver.connection;
		const options = connection.options as SqliteConnectionOptions;
		const maxQueryExecutionTime = this.driver.options.maxQueryExecutionTime;
		const broadcasterResult = new BroadcasterResult();
		const broadcaster = this.broadcaster;

		broadcaster.broadcastBeforeQueryEvent(broadcasterResult, query, parameters);

		if (!connection.isInitialized) {
			throw new ConnectionIsNotSetError('sqlite');
		}

		return new Promise(async (ok, fail) => {
			try {
				const databaseConnection = (await this.connect()) as Sqlite3Database;
				this.driver.connection.logger.logQuery(query, parameters, this);
				const queryStartTime = +new Date();
				const isInsertQuery = query.startsWith('INSERT ');
				const isDeleteQuery = query.startsWith('DELETE ');
				const isUpdateQuery = query.startsWith('UPDATE ');

				const execute = async () => {
					if (isInsertQuery || isDeleteQuery || isUpdateQuery) {
						databaseConnection.run(query, parameters, handler);
					} else {
						databaseConnection.all(query, parameters, handler);
					}
				};

				const self = this;
				const handler = function (this: any, err: any, rows: any) {
					if (err && err.toString().indexOf('SQLITE_BUSY:') !== -1) {
						if (typeof options.busyErrorRetry === 'number' && options.busyErrorRetry > 0) {
							setTimeout(execute, options.busyErrorRetry);
							return;
						}
					}

					// log slow queries if maxQueryExecution time is set
					const queryEndTime = +new Date();
					const queryExecutionTime = queryEndTime - queryStartTime;
					if (maxQueryExecutionTime && queryExecutionTime > maxQueryExecutionTime)
						connection.logger.logQuerySlow(queryExecutionTime, query, parameters, self);

					if (err) {
						connection.logger.logQueryError(err, query, parameters, self);
						broadcaster.broadcastAfterQueryEvent(
							broadcasterResult,
							query,
							parameters,
							false,
							undefined,
							undefined,
							err,
						);

						return fail(new QueryFailedError(query, parameters, err));
					} else {
						const result = new QueryResult();

						if (isInsertQuery) {
							result.raw = this['lastID'];
						} else {
							result.raw = rows;
						}

						broadcaster.broadcastAfterQueryEvent(
							broadcasterResult,
							query,
							parameters,
							true,
							queryExecutionTime,
							result.raw,
							undefined,
						);

						if (Array.isArray(rows)) {
							result.records = rows;
						}

						result.affected = this['changes'];

						if (useStructuredResult) {
							ok(result);
						} else {
							ok(result.raw);
						}
					}
				};

				await execute();
			} catch (err) {
				fail(err);
			} finally {
				await broadcasterResult.wait();
			}
		});
	}
}
