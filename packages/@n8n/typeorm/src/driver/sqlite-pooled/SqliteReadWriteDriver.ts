import { mkdirp } from 'mkdirp';
import path, { isAbsolute } from 'path';

import { DataSource } from '../../data-source/DataSource';
import { AbstractSqliteDriver } from '../sqlite-abstract/AbstractSqliteDriver';
import { ColumnType } from '../types/ColumnTypes';
import { filepathToName } from '../../util/PathUtils';
import { SqlitePooledConnectionOptions } from './SqlitePooledConnectionOptions';
import { SqliteWriteConnection } from './SqliteWriteConnection';
import { SqliteReadonlyConnectionPool } from './SqliteReadonlyConnectionPool';
import { SqliteReadWriteQueryRunner } from './SqliteReadWriteQueryRunner';
import { SqliteLibrary } from './SqliteLibrary';

/**
 * Database driver for sqlite that uses sqlite3 npm package and
 * pooled database connections.
 */
export class SqliteReadWriteDriver extends AbstractSqliteDriver {
	// -------------------------------------------------------------------------
	// Public Properties
	// -------------------------------------------------------------------------

	/**
	 * Connection options.
	 */
	options: SqlitePooledConnectionOptions;

	queryRunner?: never;
	databaseConnection: never;

	/**
	 * SQLite underlying library.
	 */
	sqlite: SqliteLibrary['sqlite'];

	// -------------------------------------------------------------------------
	// Public Implemented Properties
	// -------------------------------------------------------------------------

	/**
	 * Represent transaction support by this driver. We intentionally
	 * do NOT support nested transactions
	 */
	transactionSupport: 'simple' | 'none' = 'simple';

	/**
	 * Pool of read-only connections to the database.
	 */
	private readonly readonlyPool: SqliteReadonlyConnectionPool;

	/**
	 * A single write connection to the database.
	 */
	private readonly writeConnection: SqliteWriteConnection;

	private readonly sqliteLibrary: SqliteLibrary;

	// -------------------------------------------------------------------------
	// Constructor
	// -------------------------------------------------------------------------

	constructor(connection: DataSource) {
		super(connection);

		this.options = connection.options as SqlitePooledConnectionOptions;

		this.sqliteLibrary = new SqliteLibrary(this.options);

		// load sqlite package
		this.sqliteLibrary.loadLibrary();
		this.sqlite = this.sqliteLibrary.sqlite;

		this.readonlyPool = new SqliteReadonlyConnectionPool(this.sqliteLibrary, {
			poolSize: this.options.poolSize ?? 4,
			acquireTimeout: this.options.acquireTimeout ?? 60_000,
			destroyTimeout: this.options.destroyTimeout ?? 5_000,
		});
		this.writeConnection = new SqliteWriteConnection(this.sqliteLibrary, {
			acquireTimeout: this.options.acquireTimeout ?? 60_000,
			destroyTimeout: this.options.destroyTimeout ?? 5_000,
		});
	}

	/**
	 * Performs connection to the database.
	 */
	async connect(): Promise<void> {
		// We need to connect the write connection first, as that creates
		// the main database file.
		await this.writeConnection.connect();
		await this.readonlyPool.connect();
	}

	/**
	 * Closes connection with database.
	 */
	async disconnect(): Promise<void> {
		await Promise.all([this.readonlyPool.close(), this.writeConnection.close()]);
	}

	/**
	 * Returns true if driver supports RETURNING / OUTPUT statement.
	 */
	isReturningSqlSupported(): boolean {
		return false;
	}

	/**
	 * Creates a query runner used to execute database queries.
	 */
	createQueryRunner(): SqliteReadWriteQueryRunner {
		return new SqliteReadWriteQueryRunner(
			this,
			this.connection,
			this.sqliteLibrary,
			this.writeConnection,
			this.readonlyPool,
			this.options,
		);
	}

	normalizeType(column: {
		type?: ColumnType;
		length?: number | string;
		precision?: number | null;
		scale?: number;
	}): string {
		if ((column.type as any) === Buffer) {
			return 'blob';
		}

		return super.normalizeType(column);
	}

	async afterConnect(): Promise<void> {
		return this.attachDatabases();
	}

	/**
	 * For SQLite, the database may be added in the decorator metadata. It will be a filepath to a database file.
	 */
	buildTableName(tableName: string, _schema?: string, database?: string): string {
		if (!database) return tableName;
		if (this.getAttachedDatabaseHandleByRelativePath(database))
			return `${this.getAttachedDatabaseHandleByRelativePath(database)}.${tableName}`;

		if (database === this.options.database) return tableName;

		// we use the decorated name as supplied when deriving attach handle (ideally without non-portable absolute path)
		const identifierHash = filepathToName(database);
		// decorated name will be assumed relative to main database file when non absolute. Paths supplied as absolute won't be portable
		const absFilepath = isAbsolute(database)
			? database
			: path.join(this.getMainDatabasePath(), database);

		this.attachedDatabases[database] = {
			attachFilepathAbsolute: absFilepath,
			attachFilepathRelative: database,
			attachHandle: identifierHash,
		};
		this.sqliteLibrary.attachedDatabases.set(database, {
			attachFilepathAbsolute: absFilepath,
			attachFilepathRelative: database,
			attachHandle: identifierHash,
		});

		return `${identifierHash}.${tableName}`;
	}

	// -------------------------------------------------------------------------
	// Protected Methods
	// -------------------------------------------------------------------------

	/**
	 * Auto creates database directory if it does not exist.
	 */
	protected async createDatabaseDirectory(fullPath: string): Promise<void> {
		await mkdirp(path.dirname(fullPath));
	}

	/**
	 * Performs the attaching of the database files. The attachedDatabase should have been populated during calls to #buildTableName
	 * during EntityMetadata production (see EntityMetadata#buildTablePath)
	 *
	 * https://sqlite.org/lang_attach.html
	 */
	protected async attachDatabases() {
		// @todo - possibly check number of databases (but unqueriable at runtime sadly) - https://www.sqlite.org/limits.html#max_attached
		for await (const { attachHandle, attachFilepathAbsolute } of Object.values(
			this.attachedDatabases,
		)) {
			await this.createDatabaseDirectory(attachFilepathAbsolute);

			const queryRunner = this.createQueryRunner();
			try {
				await this.writeConnection.runExclusive(queryRunner, async (dbLease) => {
					await queryRunner.runQueryWithinConnection(
						dbLease.connection,
						`ATTACH "${attachFilepathAbsolute}" AS "${attachHandle}"`,
					);
				});
			} finally {
				await queryRunner.release();
			}
		}
	}

	protected getMainDatabasePath(): string {
		const optionsDb = this.options.database;
		return path.dirname(isAbsolute(optionsDb) ? optionsDb : path.join(process.cwd(), optionsDb));
	}
}
