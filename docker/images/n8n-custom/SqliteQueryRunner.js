'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.SqliteQueryRunner = void 0;
const QueryRunnerAlreadyReleasedError_1 = require('../../error/QueryRunnerAlreadyReleasedError');
const QueryFailedError_1 = require('../../error/QueryFailedError');
const AbstractSqliteQueryRunner_1 = require('../sqlite-abstract/AbstractSqliteQueryRunner');
const Broadcaster_1 = require('../../subscriber/Broadcaster');
const ConnectionIsNotSetError_1 = require('../../error/ConnectionIsNotSetError');
const QueryResult_1 = require('../../query-runner/QueryResult');

// Array of last 50 queries
class LastQueries {
	constructor() {
		this.lastQueries = [];
	}

	add(query) {
		this.lastQueries.push(query);
		if (this.lastQueries.length > 50) {
			this.lastQueries.shift();
		}
	}

	get() {
		return this.lastQueries;
	}

	print() {
		console.log('Last queries:');
		this.lastQueries.forEach((query, index) => {
			console.log(index + ': ' + query);
		});
	}
}

class TrxState {
	constructor() {
		this.trxLevel = 0;
		this.trxStartTime = 0;
		this.first10AfterBegin = [];
		this.lastQueries = new LastQueries();
		this.slowLogged = false;
	}

	onQuery(query) {
		if (query.includes('BEGIN')) {
			this.trxLevel++;
			this.log('QUERY:', this.trxLevel, query);
			this.trxStartTime = Date.now();
			this.first10AfterBegin = [];
			this.slowLogged = false;
		} else if (query.includes('COMMIT')) {
			this.trxLevel--;
			this.log('QUERY:', this.trxLevel, query);
			this.trxStartTime = 0;
			this.first10AfterBegin = [];
		} else if (query.includes('ROLLBACK')) {
			this.trxLevel--;
			this.log('QUERY:', this.trxLevel, query);
			this.trxStartTime = 0;
			this.first10AfterBegin = [];
		} else if (query.includes('SAVEPOINT')) {
			this.trxLevel++;
			this.log('QUERY:', this.trxLevel, query);
		} else if (query.includes('RELEASE SAVEPOINT')) {
			this.trxLevel--;
			this.log('QUERY:', this.trxLevel, query);
		}

		if (this.trxLevel > 0 && this.first10AfterBegin.length < 20) {
			this.first10AfterBegin.push(query);
		}

		if (this.trxStartTime > 0 && Date.now() - this.trxStartTime > 5000) {
			this.log('Transaction is open for more than 5 seconds');
			if (!this.slowLogged) {
				this.log('First 10 queries after BEGIN:');
				this.first10AfterBegin.forEach((query, index) => {
					this.log(index + ': ' + query);
				});

				lastQueries.print();
			}

			// process.exit(0)
			this.slowLogged = true;
			process.exit(1);
		}
	}

	log(...args) {
		console.log(new Date().toISOString(), '[BEFORE]', ...args);
	}
}

const trxState = new TrxState();

/**
 * Runs queries on a single sqlite database connection.
 *
 * Does not support compose primary keys with autoincrement field.
 * todo: need to throw exception for this case.
 */
class SqliteQueryRunner extends AbstractSqliteQueryRunner_1.AbstractSqliteQueryRunner {
	// -------------------------------------------------------------------------
	// Constructor
	// -------------------------------------------------------------------------
	constructor(driver) {
		super();
		this.driver = driver;
		this.connection = driver.connection;
		this.broadcaster = new Broadcaster_1.Broadcaster(this);
	}
	/**
	 * Called before migrations are run.
	 */
	async beforeMigration() {
		await this.query(`PRAGMA foreign_keys = OFF`);
	}
	/**
	 * Called after migrations are run.
	 */
	async afterMigration() {
		await this.query(`PRAGMA foreign_keys = ON`);
	}
	/**
	 * Executes a given SQL query.
	 */
	query(query, parameters, useStructuredResult = false) {
		if (this.isReleased)
			throw new QueryRunnerAlreadyReleasedError_1.QueryRunnerAlreadyReleasedError();
		const connection = this.driver.connection;
		const options = connection.options;
		const maxQueryExecutionTime = this.driver.options.maxQueryExecutionTime;
		if (!connection.isInitialized) {
			throw new ConnectionIsNotSetError_1.ConnectionIsNotSetError('sqlite');
		}
		return new Promise(async (ok, fail) => {
			const databaseConnection = await this.connect();
			this.driver.connection.logger.logQuery(query, parameters, this);
			const queryStartTime = +new Date();
			const isInsertQuery = query.startsWith('INSERT ');
			const isDeleteQuery = query.startsWith('DELETE ');
			const isUpdateQuery = query.startsWith('UPDATE ');
			const execute = async () => {
				trxState.onQuery(query);
				if (isInsertQuery || isDeleteQuery || isUpdateQuery) {
					await databaseConnection.run(query, parameters, handler);
				} else {
					await databaseConnection.all(query, parameters, handler);
				}
			};
			const handler = function (err, rows) {
				if (err && err.toString().indexOf('SQLITE_BUSY:') !== -1) {
					console.warn(
						'SQLITE_BUSY. Retry:',
						typeof options.busyErrorRetry === 'number' && options.busyErrorRetry > 0,
					);
					if (typeof options.busyErrorRetry === 'number' && options.busyErrorRetry > 0) {
						setTimeout(execute, options.busyErrorRetry);
						return;
					}
				}
				// log slow queries if maxQueryExecution time is set
				const queryEndTime = +new Date();
				const queryExecutionTime = queryEndTime - queryStartTime;
				// if (queryExecutionTime > 1000) {
				// 	console.log('SLOW QUERY:', queryExecutionTime, query, parameters);
				// }
				if (err) {
					console.error('QUERY ERROR:', err, query, parameters);
				}
				if (maxQueryExecutionTime && queryExecutionTime > maxQueryExecutionTime)
					connection.logger.logQuerySlow(queryExecutionTime, query, parameters, this);
				if (err) {
					connection.logger.logQueryError(err, query, parameters, this);
					fail(new QueryFailedError_1.QueryFailedError(query, parameters, err));
				} else {
					const result = new QueryResult_1.QueryResult();
					if (isInsertQuery) {
						result.raw = this['lastID'];
					} else {
						result.raw = rows;
					}
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
		});
	}
}
exports.SqliteQueryRunner = SqliteQueryRunner;

//# sourceMappingURL=SqliteQueryRunner.js.map
