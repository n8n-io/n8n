import { PostgresConnectionOptions } from '../driver/postgres/PostgresConnectionOptions';
import { Query } from '../driver/Query';
import { SqlInMemory } from '../driver/SqlInMemory';
import { TableIndex } from '../schema-builder/table/TableIndex';
import { View } from '../schema-builder/view/View';
import { DataSource } from '../data-source/DataSource';
import { Table } from '../schema-builder/table/Table';
import { EntityManager } from '../entity-manager/EntityManager';
import { TableColumn } from '../schema-builder/table/TableColumn';
import { Broadcaster } from '../subscriber/Broadcaster';
import { ReplicationMode } from '../driver/types/ReplicationMode';
import { TypeORMError } from '../error/TypeORMError';
import { EntityMetadata } from '../metadata/EntityMetadata';
import { TableForeignKey } from '../schema-builder/table/TableForeignKey';
import { OrmUtils } from '../util/OrmUtils';
import { MetadataTableType } from '../driver/types/MetadataTableType';
import { InstanceChecker } from '../util/InstanceChecker';

export abstract class BaseQueryRunner {
	// -------------------------------------------------------------------------
	// Public Properties
	// -------------------------------------------------------------------------

	/**
	 * Connection used by this query runner.
	 */
	connection: DataSource;

	/**
	 * Entity manager working only with current query runner.
	 */
	manager: EntityManager;

	/**
	 * Indicates if connection for this query runner is released.
	 * Once its released, query runner cannot run queries anymore.
	 */
	isReleased = false;

	/**
	 * Indicates if transaction is in progress.
	 */
	isTransactionActive = false;

	/**
	 * Stores temporarily user data.
	 * Useful for sharing data with subscribers.
	 */
	data = {};

	/**
	 * All synchronized tables in the database.
	 */
	loadedTables: Table[] = [];

	/**
	 * All synchronized views in the database.
	 */
	loadedViews: View[] = [];

	/**
	 * Broadcaster used on this query runner to broadcast entity events.
	 */
	broadcaster: Broadcaster;

	// -------------------------------------------------------------------------
	// Protected Properties
	// -------------------------------------------------------------------------

	/**
	 * Real database connection from a connection pool used to perform queries.
	 */
	protected databaseConnection: any;

	/**
	 * Indicates if special query runner mode in which sql queries won't be executed is enabled.
	 */
	protected sqlMemoryMode: boolean = false;

	/**
	 * Sql-s stored if "sql in memory" mode is enabled.
	 */
	protected sqlInMemory: SqlInMemory = new SqlInMemory();

	/**
	 * Mode in which query runner executes.
	 * Used for replication.
	 * If replication is not setup its value is ignored.
	 */
	protected mode: ReplicationMode;

	/**
	 * current depth of transaction.
	 * for transactionDepth > 0 will use SAVEPOINT to start and commit/rollback transaction blocks
	 */
	protected transactionDepth = 0;

	private cachedTablePaths: Record<string, string> = {};

	// -------------------------------------------------------------------------
	// Public Abstract Methods
	// -------------------------------------------------------------------------

	/**
	 * Executes a given SQL query.
	 */
	abstract query(query: string, parameters?: any[], useStructuredResult?: boolean): Promise<any>;

	// -------------------------------------------------------------------------
	// Protected Abstract Methods
	// -------------------------------------------------------------------------

	protected abstract loadTables(tablePaths?: string[]): Promise<Table[]>;

	protected abstract loadViews(tablePaths?: string[]): Promise<View[]>;

	// -------------------------------------------------------------------------
	// Public Methods
	// -------------------------------------------------------------------------

	/**
	 * Called before migrations are run.
	 */
	async beforeMigration(): Promise<void> {
		// Do nothing
	}

	/**
	 * Called after migrations are run.
	 */
	async afterMigration(): Promise<void> {
		// Do nothing
	}

	/**
	 * Loads given table's data from the database.
	 */
	async getTable(tablePath: string): Promise<Table | undefined> {
		this.loadedTables = await this.loadTables([tablePath]);
		return this.loadedTables.length > 0 ? this.loadedTables[0] : undefined;
	}

	/**
	 * Loads all tables (with given names) from the database.
	 */
	async getTables(tableNames?: string[]): Promise<Table[]> {
		if (!tableNames) {
			// Don't cache in this case.
			// This is the new case & isn't used anywhere else anyway.
			return await this.loadTables(tableNames);
		}

		this.loadedTables = await this.loadTables(tableNames);
		return this.loadedTables;
	}

	/**
	 * Loads given view's data from the database.
	 */
	async getView(viewPath: string): Promise<View | undefined> {
		this.loadedViews = await this.loadViews([viewPath]);
		return this.loadedViews.length > 0 ? this.loadedViews[0] : undefined;
	}

	/**
	 * Loads given view's data from the database.
	 */
	async getViews(viewPaths?: string[]): Promise<View[]> {
		this.loadedViews = await this.loadViews(viewPaths);
		return this.loadedViews;
	}

	/**
	 * Enables special query runner mode in which sql queries won't be executed,
	 * instead they will be memorized into a special variable inside query runner.
	 * You can get memorized sql using getMemorySql() method.
	 */
	enableSqlMemory(): void {
		this.sqlInMemory = new SqlInMemory();
		this.sqlMemoryMode = true;
	}

	/**
	 * Disables special query runner mode in which sql queries won't be executed
	 * started by calling enableSqlMemory() method.
	 *
	 * Previously memorized sql will be flushed.
	 */
	disableSqlMemory(): void {
		this.sqlInMemory = new SqlInMemory();
		this.sqlMemoryMode = false;
	}

	/**
	 * Flushes all memorized sqls.
	 */
	clearSqlMemory(): void {
		this.sqlInMemory = new SqlInMemory();
	}

	/**
	 * Gets sql stored in the memory. Parameters in the sql are already replaced.
	 */
	getMemorySql(): SqlInMemory {
		return this.sqlInMemory;
	}

	/**
	 * Executes up sql queries.
	 */
	async executeMemoryUpSql(): Promise<void> {
		for (const { query, parameters } of this.sqlInMemory.upQueries) {
			await this.query(query, parameters);
		}
	}

	/**
	 * Executes down sql queries.
	 */
	async executeMemoryDownSql(): Promise<void> {
		for (const { query, parameters } of this.sqlInMemory.downQueries.reverse()) {
			await this.query(query, parameters);
		}
	}

	getReplicationMode(): ReplicationMode {
		return this.mode;
	}

	// -------------------------------------------------------------------------
	// Protected Methods
	// -------------------------------------------------------------------------

	/**
	 * Gets view from previously loaded views, otherwise loads it from database.
	 */
	protected async getCachedView(viewName: string): Promise<View> {
		const view = this.loadedViews.find((view) => view.name === viewName);
		if (view) return view;

		const foundViews = await this.loadViews([viewName]);
		if (foundViews.length > 0) {
			this.loadedViews.push(foundViews[0]);
			return foundViews[0];
		} else {
			throw new TypeORMError(`View "${viewName}" does not exist.`);
		}
	}

	/**
	 * Gets table from previously loaded tables, otherwise loads it from database.
	 */
	protected async getCachedTable(tableName: string): Promise<Table> {
		if (tableName in this.cachedTablePaths) {
			const tablePath = this.cachedTablePaths[tableName];
			const table = this.loadedTables.find((table) => this.getTablePath(table) === tablePath);

			if (table) {
				return table;
			}
		}

		const foundTables = await this.loadTables([tableName]);

		if (foundTables.length > 0) {
			const foundTablePath = this.getTablePath(foundTables[0]);

			const cachedTable = this.loadedTables.find(
				(table) => this.getTablePath(table) === foundTablePath,
			);

			if (!cachedTable) {
				this.cachedTablePaths[tableName] = this.getTablePath(foundTables[0]);
				this.loadedTables.push(foundTables[0]);
				return foundTables[0];
			} else {
				return cachedTable;
			}
		} else {
			throw new TypeORMError(`Table "${tableName}" does not exist.`);
		}
	}

	/**
	 * Replaces loaded table with given changed table.
	 */
	protected replaceCachedTable(table: Table, changedTable: Table): void {
		const oldTablePath = this.getTablePath(table);
		const foundTable = this.loadedTables.find(
			(loadedTable) => this.getTablePath(loadedTable) === oldTablePath,
		);

		// Clean up the lookup cache..
		for (const [key, cachedPath] of Object.entries(this.cachedTablePaths)) {
			if (cachedPath === oldTablePath) {
				this.cachedTablePaths[key] = this.getTablePath(changedTable);
			}
		}

		if (foundTable) {
			foundTable.database = changedTable.database;
			foundTable.schema = changedTable.schema;
			foundTable.name = changedTable.name;
			foundTable.columns = changedTable.columns;
			foundTable.indices = changedTable.indices;
			foundTable.foreignKeys = changedTable.foreignKeys;
			foundTable.uniques = changedTable.uniques;
			foundTable.checks = changedTable.checks;
			foundTable.justCreated = changedTable.justCreated;
			foundTable.engine = changedTable.engine;
			foundTable.comment = changedTable.comment;
		}
	}

	protected getTablePath(target: EntityMetadata | Table | View | TableForeignKey | string): string {
		const parsed = this.connection.driver.parseTableName(target);

		return this.connection.driver.buildTableName(parsed.tableName, parsed.schema, parsed.database);
	}

	protected getTypeormMetadataTableName(): string {
		const options = <PostgresConnectionOptions>this.connection.driver.options;
		return this.connection.driver.buildTableName(
			this.connection.metadataTableName,
			options.schema,
			options.database,
		);
	}

	/**
	 * Generates SQL query to select record from typeorm metadata table.
	 */
	protected selectTypeormMetadataSql({
		database,
		schema,
		table,
		type,
		name,
	}: {
		database?: string;
		schema?: string;
		table?: string;
		type: MetadataTableType;
		name: string;
	}): Query {
		const qb = this.connection.createQueryBuilder();
		const selectQb = qb
			.select()
			.from(this.getTypeormMetadataTableName(), 't')
			.where(`${qb.escape('type')} = :type`, { type })
			.andWhere(`${qb.escape('name')} = :name`, { name });

		if (database) {
			selectQb.andWhere(`${qb.escape('database')} = :database`, {
				database,
			});
		}

		if (schema) {
			selectQb.andWhere(`${qb.escape('schema')} = :schema`, { schema });
		}

		if (table) {
			selectQb.andWhere(`${qb.escape('table')} = :table`, { table });
		}

		const [query, parameters] = selectQb.getQueryAndParameters();
		return new Query(query, parameters);
	}

	/**
	 * Generates SQL query to insert a record into typeorm metadata table.
	 */
	protected insertTypeormMetadataSql({
		database,
		schema,
		table,
		type,
		name,
		value,
	}: {
		database?: string;
		schema?: string;
		table?: string;
		type: MetadataTableType;
		name: string;
		value?: string;
	}): Query {
		const [query, parameters] = this.connection
			.createQueryBuilder()
			.insert()
			.into(this.getTypeormMetadataTableName())
			.values({
				database: database,
				schema: schema,
				table: table,
				type: type,
				name: name,
				value: value,
			})
			.getQueryAndParameters();

		return new Query(query, parameters);
	}

	/**
	 * Generates SQL query to delete a record from typeorm metadata table.
	 */
	protected deleteTypeormMetadataSql({
		database,
		schema,
		table,
		type,
		name,
	}: {
		database?: string;
		schema?: string;
		table?: string;
		type: MetadataTableType;
		name: string;
	}): Query {
		const qb = this.connection.createQueryBuilder();
		const deleteQb = qb
			.delete()
			.from(this.getTypeormMetadataTableName())
			.where(`${qb.escape('type')} = :type`, { type })
			.andWhere(`${qb.escape('name')} = :name`, { name });

		if (database) {
			deleteQb.andWhere(`${qb.escape('database')} = :database`, {
				database,
			});
		}

		if (schema) {
			deleteQb.andWhere(`${qb.escape('schema')} = :schema`, { schema });
		}

		if (table) {
			deleteQb.andWhere(`${qb.escape('table')} = :table`, { table });
		}

		const [query, parameters] = deleteQb.getQueryAndParameters();
		return new Query(query, parameters);
	}

	/**
	 * Checks if at least one of column properties was changed.
	 * Does not checks column type, length and autoincrement, because these properties changes separately.
	 */
	protected isColumnChanged(
		oldColumn: TableColumn,
		newColumn: TableColumn,
		checkDefault?: boolean,
		checkComment?: boolean,
		checkEnum = true,
	): boolean {
		// this logs need to debug issues in column change detection. Do not delete it!

		// console.log("charset ---------------");
		// console.log(oldColumn.charset !== newColumn.charset);
		// console.log(oldColumn.charset, newColumn.charset);
		// console.log("collation ---------------");
		// console.log(oldColumn.collation !== newColumn.collation);
		// console.log(oldColumn.collation, newColumn.collation);
		// console.log("precision ---------------");
		// console.log(oldColumn.precision !== newColumn.precision);
		// console.log(oldColumn.precision, newColumn.precision);
		// console.log("scale ---------------");
		// console.log(oldColumn.scale !== newColumn.scale);
		// console.log(oldColumn.scale, newColumn.scale);
		// console.log("default ---------------");
		// console.log((checkDefault && oldColumn.default !== newColumn.default));
		// console.log(oldColumn.default, newColumn.default);
		// console.log("isNullable ---------------");
		// console.log(oldColumn.isNullable !== newColumn.isNullable);
		// console.log(oldColumn.isNullable, newColumn.isNullable);
		// console.log("comment ---------------");
		// console.log((checkComment && oldColumn.comment !== newColumn.comment));
		// console.log(oldColumn.comment, newColumn.comment);
		// console.log("enum ---------------");
		// console.log(!OrmUtils.isArraysEqual(oldColumn.enum || [], newColumn.enum || []));
		// console.log(oldColumn.enum, newColumn.enum);

		return (
			oldColumn.charset !== newColumn.charset ||
			oldColumn.collation !== newColumn.collation ||
			oldColumn.precision !== newColumn.precision ||
			oldColumn.scale !== newColumn.scale ||
			oldColumn.width !== newColumn.width || // MySQL only
			oldColumn.zerofill !== newColumn.zerofill || // MySQL only
			oldColumn.unsigned !== newColumn.unsigned || // MySQL only
			oldColumn.asExpression !== newColumn.asExpression ||
			(checkDefault && oldColumn.default !== newColumn.default) ||
			oldColumn.onUpdate !== newColumn.onUpdate || // MySQL only
			oldColumn.isNullable !== newColumn.isNullable ||
			(checkComment && oldColumn.comment !== newColumn.comment) ||
			(checkEnum && this.isEnumChanged(oldColumn, newColumn))
		);
	}

	protected isEnumChanged(oldColumn: TableColumn, newColumn: TableColumn) {
		return !OrmUtils.isArraysEqual(oldColumn.enum || [], newColumn.enum || []);
	}

	/**
	 * Checks if column length is by default.
	 */
	protected isDefaultColumnLength(table: Table, column: TableColumn, length: string): boolean {
		// if table have metadata, we check if length is specified in column metadata
		if (this.connection.hasMetadata(table.name)) {
			const metadata = this.connection.getMetadata(table.name);
			const columnMetadata = metadata.findColumnWithDatabaseName(column.name);

			if (columnMetadata) {
				const columnMetadataLength = this.connection.driver.getColumnLength(columnMetadata);
				if (columnMetadataLength) return false;
			}
		}

		if (
			this.connection.driver.dataTypeDefaults &&
			this.connection.driver.dataTypeDefaults[column.type] &&
			this.connection.driver.dataTypeDefaults[column.type].length
		) {
			return (
				this.connection.driver.dataTypeDefaults[column.type].length!.toString() ===
				length.toString()
			);
		}

		return false;
	}

	/**
	 * Checks if column precision is by default.
	 */
	protected isDefaultColumnPrecision(
		table: Table,
		column: TableColumn,
		precision: number,
	): boolean {
		// if table have metadata, we check if length is specified in column metadata
		if (this.connection.hasMetadata(table.name)) {
			const metadata = this.connection.getMetadata(table.name);
			const columnMetadata = metadata.findColumnWithDatabaseName(column.name);
			if (
				columnMetadata &&
				columnMetadata.precision !== null &&
				columnMetadata.precision !== undefined
			)
				return false;
		}

		if (
			this.connection.driver.dataTypeDefaults &&
			this.connection.driver.dataTypeDefaults[column.type] &&
			this.connection.driver.dataTypeDefaults[column.type].precision !== null &&
			this.connection.driver.dataTypeDefaults[column.type].precision !== undefined
		)
			return this.connection.driver.dataTypeDefaults[column.type].precision === precision;

		return false;
	}

	/**
	 * Checks if column scale is by default.
	 */
	protected isDefaultColumnScale(table: Table, column: TableColumn, scale: number): boolean {
		// if table have metadata, we check if length is specified in column metadata
		if (this.connection.hasMetadata(table.name)) {
			const metadata = this.connection.getMetadata(table.name);
			const columnMetadata = metadata.findColumnWithDatabaseName(column.name);
			if (columnMetadata && columnMetadata.scale !== null && columnMetadata.scale !== undefined)
				return false;
		}

		if (
			this.connection.driver.dataTypeDefaults &&
			this.connection.driver.dataTypeDefaults[column.type] &&
			this.connection.driver.dataTypeDefaults[column.type].scale !== null &&
			this.connection.driver.dataTypeDefaults[column.type].scale !== undefined
		)
			return this.connection.driver.dataTypeDefaults[column.type].scale === scale;

		return false;
	}

	/**
	 * Executes sql used special for schema build.
	 */
	protected async executeQueries(
		upQueries: Query | Query[],
		downQueries: Query | Query[],
	): Promise<void> {
		if (InstanceChecker.isQuery(upQueries)) upQueries = [upQueries];
		if (InstanceChecker.isQuery(downQueries)) downQueries = [downQueries];

		this.sqlInMemory.upQueries.push(...upQueries);
		this.sqlInMemory.downQueries.push(...downQueries);

		// if sql-in-memory mode is enabled then simply store sql in memory and return
		if (this.sqlMemoryMode === true) return Promise.resolve() as Promise<any>;

		for (const { query, parameters } of upQueries) {
			await this.query(query, parameters);
		}
	}

	/**
	 * Generated an index name for a table and index
	 */
	protected generateIndexName(table: Table | View, index: TableIndex): string {
		// new index may be passed without name. In this case we generate index name manually.
		return this.connection.namingStrategy.indexName(table, index.columnNames, index.where);
	}
}
