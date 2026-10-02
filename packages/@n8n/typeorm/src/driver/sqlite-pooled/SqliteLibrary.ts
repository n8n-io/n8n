import { mkdirp } from 'mkdirp';
import path from 'path';
import type { sqlite3, Database as Sqlite3Database } from 'sqlite3';
import { DriverPackageNotInstalledError } from '../../error/DriverPackageNotInstalledError';
import { QueryResult } from '../../query-runner/QueryResult';
import { QueryFailedError } from '../../error/QueryFailedError';
import { SqlitePooledConnectionOptions } from './SqlitePooledConnectionOptions';

export type DatabasesMap = Map<
	string,
	{
		attachFilepathAbsolute: string;
		attachFilepathRelative: string;
		attachHandle: string;
	}
>;

/**
 * An adapter to the underlying SQLite library.
 */
export class SqliteLibrary {
	/**
	 * SQLite underlying library.
	 */
	public sqlite: sqlite3;

	/**
	 * Any attached databases (excepting default 'main')
	 */
	public attachedDatabases: DatabasesMap = new Map();

	constructor(private readonly options: SqlitePooledConnectionOptions) {}

	/**
	 * If driver dependency is not given explicitly, then try to load it via "require".
	 */
	public loadLibrary(): void {
		try {
			const sqlite = this.options.driver || require('sqlite3');
			this.sqlite = sqlite.verbose();
		} catch (e) {
			throw new DriverPackageNotInstalledError('SQLite', 'sqlite3');
		}
	}

	/**
	 * Creates connection with the database.
	 *
	 * @param {number} flags Flags, such as SQLITE_OPEN_READONLY, to pass to the sqlite3 database connection
	 */
	public async createDatabaseConnection(flags?: number): Promise<Sqlite3Database> {
		if (this.options.flags === undefined || !(this.options.flags & this.sqlite.OPEN_URI)) {
			await this.createDatabaseDirectory(this.options.database);
		}

		const databaseConnection: Sqlite3Database = await new Promise((ok, fail) => {
			if (this.options.flags === undefined && flags === undefined) {
				const connection = new this.sqlite.Database(this.options.database, (err: any) => {
					if (err) return fail(err);
					ok(connection);
				});
			} else {
				const connectionFlags = (this.options.flags ?? 0) | (flags ?? 0);
				const connection = new this.sqlite.Database(
					this.options.database,
					connectionFlags,
					(err: any) => {
						if (err) return fail(err);
						ok(connection);
					},
				);
			}
		});

		// Internal function to run a command on the connection and fail if an error occured.
		function run(line: string): Promise<void> {
			return new Promise((ok, fail) => {
				databaseConnection.run(line, (err: any) => {
					if (err) return fail(err);
					ok();
				});
			});
		}
		// in the options, if encryption key for SQLCipher is setted.
		// Must invoke key pragma before trying to do any other interaction with the database.
		if (this.options.key) {
			await run(`PRAGMA key = ${JSON.stringify(this.options.key)}`);
		}

		if (this.options.enableWAL) {
			await run(`PRAGMA journal_mode = WAL`);
		}

		if (
			this.options.busyTimeout &&
			typeof this.options.busyTimeout === 'number' &&
			this.options.busyTimeout > 0
		) {
			await run(`PRAGMA busy_timeout = ${this.options.busyTimeout}`);
		}

		// we need to enable foreign keys in sqlite to make sure all foreign key related features
		// working properly. this also makes onDelete to work with sqlite.
		await run(`PRAGMA foreign_keys = ON`);

		await this.attachDatabases(databaseConnection);

		return databaseConnection;
	}

	public async destroyDatabaseConnection(dbConnection: Sqlite3Database): Promise<void> {
		return new Promise((resolve, reject) => {
			dbConnection.close((err: unknown) => (err ? reject(err) : resolve()));
		});
	}

	public async runQuery(
		databaseConnection: Sqlite3Database,
		query: string,
		parameters?: any[],
		useStructuredResult = false,
	): Promise<QueryResult | any> {
		return await new Promise((resolve, reject) => {
			try {
				const isInsertQuery = query.startsWith('INSERT ');
				const isDeleteQuery = query.startsWith('DELETE ');
				const isUpdateQuery = query.startsWith('UPDATE ');

				const handler = function (this: any, err: any, rows: any) {
					if (err) {
						return reject(new QueryFailedError(query, parameters, err));
					} else {
						const result = new QueryResult();

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
							resolve(result);
						} else {
							resolve(result.raw);
						}
					}
				};

				if (isInsertQuery || isDeleteQuery || isUpdateQuery) {
					databaseConnection.run(query, parameters, handler);
				} else {
					databaseConnection.all(query, parameters, handler);
				}
			} catch (err) {
				reject(err);
			}
		});
	}

	/**
	 * Performs the attaching of the database files. The attachedDatabase should have been populated during calls to #buildTableName
	 * during EntityMetadata production (see EntityMetadata#buildTablePath)
	 *
	 * https://sqlite.org/lang_attach.html
	 */
	public async attachDatabases(connection: Sqlite3Database) {
		// @todo - possibly check number of databases (but unqueriable at runtime sadly) - https://www.sqlite.org/limits.html#max_attached
		for (const { attachHandle, attachFilepathAbsolute } of this.attachedDatabases.values()) {
			await this.createDatabaseDirectory(attachFilepathAbsolute);
			await this.runQuery(connection, `ATTACH "${attachFilepathAbsolute}" AS "${attachHandle}"`);
		}
	}

	/**
	 * Auto creates database directory if it does not exist.
	 */
	private async createDatabaseDirectory(fullPath: string): Promise<void> {
		await mkdirp(path.dirname(fullPath));
	}
}
