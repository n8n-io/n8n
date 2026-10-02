import { QueryRunner } from '../../query-runner/QueryRunner';
import { ObjectLiteral } from '../../common/ObjectLiteral';
import { TransactionNotStartedError } from '../../error/TransactionNotStartedError';
import { TableColumn } from '../../schema-builder/table/TableColumn';
import { Table } from '../../schema-builder/table/Table';
import { TableIndex } from '../../schema-builder/table/TableIndex';
import { TableForeignKey } from '../../schema-builder/table/TableForeignKey';
import { View } from '../../schema-builder/view/View';
import { Query } from '../Query';
import { AbstractSqliteDriver } from './AbstractSqliteDriver';
import { ReadStream } from '../../platform/PlatformTools';
import { TableIndexOptions } from '../../schema-builder/options/TableIndexOptions';
import { TableUnique } from '../../schema-builder/table/TableUnique';
import { BaseQueryRunner } from '../../query-runner/BaseQueryRunner';
import { OrmUtils } from '../../util/OrmUtils';
import { TableCheck } from '../../schema-builder/table/TableCheck';
import { IsolationLevel } from '../types/IsolationLevel';
import { TableExclusion } from '../../schema-builder/table/TableExclusion';
import { TransactionAlreadyStartedError, TypeORMError } from '../../error';
import { MetadataTableType } from '../types/MetadataTableType';
import { InstanceChecker } from '../../util/InstanceChecker';
import { TransactionRollbackFailedError } from '../../error/TransactionRollbackFailedError';

/**
 * Runs queries on a single sqlite database connection.
 */
export abstract class AbstractSqliteQueryRunner extends BaseQueryRunner implements QueryRunner {
	// -------------------------------------------------------------------------
	// Public Implemented Properties
	// -------------------------------------------------------------------------

	/**
	 * Database driver used by connection.
	 */
	driver: AbstractSqliteDriver;

	protected transactionPromise: Promise<any> | null = null;

	// -------------------------------------------------------------------------
	// Constructor
	// -------------------------------------------------------------------------

	constructor() {
		super();
	}

	// -------------------------------------------------------------------------
	// Public Methods
	// -------------------------------------------------------------------------

	/**
	 * Creates/uses database connection from the connection pool to perform further operations.
	 * Returns obtained database connection.
	 */
	connect(): Promise<any> {
		return Promise.resolve(this.driver.databaseConnection);
	}

	/**
	 * Releases used database connection.
	 * We just clear loaded tables and sql in memory, because sqlite do not support multiple connections thus query runners.
	 */
	release(): Promise<void> {
		this.loadedTables = [];
		this.clearSqlMemory();
		return Promise.resolve();
	}

	/**
	 * Starts transaction.
	 */
	async startTransaction(isolationLevel?: IsolationLevel): Promise<void> {
		if (this.driver.transactionSupport === 'none')
			throw new TypeORMError(
				`Transactions aren't supported by ${this.connection.driver.options.type}.`,
			);

		if (this.isTransactionActive && this.driver.transactionSupport === 'simple')
			throw new TransactionAlreadyStartedError();

		if (
			isolationLevel &&
			isolationLevel !== 'READ UNCOMMITTED' &&
			isolationLevel !== 'SERIALIZABLE'
		)
			throw new TypeORMError(`SQLite only supports SERIALIZABLE and READ UNCOMMITTED isolation`);

		this.isTransactionActive = true;
		try {
			await this.broadcaster.broadcast('BeforeTransactionStart');
		} catch (err) {
			this.isTransactionActive = false;
			throw err;
		}

		if (this.transactionDepth === 0) {
			this.transactionDepth += 1;
			if (isolationLevel) {
				if (isolationLevel === 'READ UNCOMMITTED') {
					await this.query('PRAGMA read_uncommitted = true');
				} else {
					await this.query('PRAGMA read_uncommitted = false');
				}
			}
			await this.query('BEGIN TRANSACTION');
		} else {
			this.transactionDepth += 1;
			await this.query(`SAVEPOINT typeorm_${this.transactionDepth - 1}`);
		}

		await this.broadcaster.broadcast('AfterTransactionStart');
	}

	/**
	 * Commits transaction.
	 * Error will be thrown if transaction was not started.
	 */
	async commitTransaction(): Promise<void> {
		if (!this.isTransactionActive) throw new TransactionNotStartedError();

		await this.broadcaster.broadcast('BeforeTransactionCommit');

		if (this.transactionDepth > 1) {
			this.transactionDepth -= 1;
			await this.query(`RELEASE SAVEPOINT typeorm_${this.transactionDepth}`);
		} else {
			this.transactionDepth -= 1;
			await this.query('COMMIT');
			this.isTransactionActive = false;
		}

		await this.broadcaster.broadcast('AfterTransactionCommit');
	}

	/**
	 * Rollbacks transaction.
	 * Error will be thrown if transaction was not started.
	 */
	async rollbackTransaction(): Promise<void> {
		try {
			if (!this.isTransactionActive) throw new TransactionNotStartedError();

			await this.broadcaster.broadcast('BeforeTransactionRollback');

			if (this.transactionDepth > 1) {
				this.transactionDepth -= 1;
				await this.query(`ROLLBACK TO SAVEPOINT typeorm_${this.transactionDepth}`);
			} else {
				this.transactionDepth -= 1;
				await this.query('ROLLBACK');
				this.isTransactionActive = false;
			}

			await this.broadcaster.broadcast('AfterTransactionRollback');
		} catch (rollbackError) {
			throw new TransactionRollbackFailedError(rollbackError);
		}
	}

	/**
	 * Returns raw data stream.
	 */
	stream(
		query: string,
		parameters?: any[],
		onEnd?: Function,
		onError?: Function,
	): Promise<ReadStream> {
		throw new TypeORMError(`Stream is not supported by sqlite driver.`);
	}

	/**
	 * Returns all available database names including system databases.
	 */
	async getDatabases(): Promise<string[]> {
		return Promise.resolve([]);
	}

	/**
	 * Returns all available schema names including system schemas.
	 * If database parameter specified, returns schemas of that database.
	 */
	async getSchemas(database?: string): Promise<string[]> {
		return Promise.resolve([]);
	}

	/**
	 * Checks if database with the given name exist.
	 */
	async hasDatabase(database: string): Promise<boolean> {
		return Promise.resolve(false);
	}

	/**
	 * Loads currently using database
	 */
	async getCurrentDatabase(): Promise<undefined> {
		return Promise.resolve(undefined);
	}

	/**
	 * Checks if schema with the given name exist.
	 */
	async hasSchema(schema: string): Promise<boolean> {
		throw new TypeORMError(`This driver does not support table schemas`);
	}

	/**
	 * Loads currently using database schema
	 */
	async getCurrentSchema(): Promise<undefined> {
		return Promise.resolve(undefined);
	}

	/**
	 * Checks if table with the given name exist in the database.
	 */
	async hasTable(tableOrName: Table | string): Promise<boolean> {
		const tableName = InstanceChecker.isTable(tableOrName) ? tableOrName.name : tableOrName;
		const sql = `SELECT * FROM "sqlite_master" WHERE "type" = 'table' AND "name" = ?1`;
		const result = await this.query(sql, [tableName]);
		return result.length ? true : false;
	}

	/**
	 * Checks if column with the given name exist in the given table.
	 */
	async hasColumn(tableOrName: Table | string, columnName: string): Promise<boolean> {
		const tableName = InstanceChecker.isTable(tableOrName) ? tableOrName.name : tableOrName;
		const sql = `PRAGMA table_xinfo(${this.escapePath(tableName)})`;
		const columns: ObjectLiteral[] = await this.query(sql);
		return !!columns.find((column) => column['name'] === columnName);
	}

	/**
	 * Creates a new database.
	 */
	async createDatabase(database: string, ifNotExist?: boolean): Promise<void> {
		return Promise.resolve();
	}

	/**
	 * Drops database.
	 */
	async dropDatabase(database: string, ifExist?: boolean): Promise<void> {
		return Promise.resolve();
	}

	/**
	 * Creates a new table schema.
	 */
	async createSchema(schemaPath: string, ifNotExist?: boolean): Promise<void> {
		return Promise.resolve();
	}

	/**
	 * Drops table schema.
	 */
	async dropSchema(schemaPath: string, ifExist?: boolean): Promise<void> {
		return Promise.resolve();
	}

	/**
	 * Creates a new table.
	 */
	async createTable(
		table: Table,
		ifNotExist: boolean = false,
		createForeignKeys: boolean = true,
		createIndices: boolean = true,
	): Promise<void> {
		const upQueries: Query[] = [];
		const downQueries: Query[] = [];

		if (ifNotExist) {
			const isTableExist = await this.hasTable(table);
			if (isTableExist) return Promise.resolve();
		}

		upQueries.push(this.createTableSql(table, createForeignKeys));
		downQueries.push(this.dropTableSql(table));

		if (createIndices) {
			table.indices.forEach((index) => {
				// new index may be passed without name. In this case we generate index name manually.
				if (!index.name)
					index.name = this.connection.namingStrategy.indexName(
						table,
						index.columnNames,
						index.where,
					);
				upQueries.push(this.createIndexSql(table, index));
				downQueries.push(this.dropIndexSql(index));
			});
		}

		// if table have column with generated type, we must add the expression to the metadata table
		const generatedColumns = table.columns.filter(
			(column) => column.generatedType && column.asExpression,
		);

		for (const column of generatedColumns) {
			const insertQuery = this.insertTypeormMetadataSql({
				table: table.name,
				type: MetadataTableType.GENERATED_COLUMN,
				name: column.name,
				value: column.asExpression,
			});

			const deleteQuery = this.deleteTypeormMetadataSql({
				table: table.name,
				type: MetadataTableType.GENERATED_COLUMN,
				name: column.name,
			});

			upQueries.push(insertQuery);
			downQueries.push(deleteQuery);
		}

		await this.executeQueries(upQueries, downQueries);
	}

	/**
	 * Drops the table.
	 */
	async dropTable(
		tableOrName: Table | string,
		ifExist?: boolean,
		dropForeignKeys: boolean = true,
		dropIndices: boolean = true,
	): Promise<void> {
		if (ifExist) {
			const isTableExist = await this.hasTable(tableOrName);
			if (!isTableExist) return Promise.resolve();
		}

		// if dropTable called with dropForeignKeys = true, we must create foreign keys in down query.
		const createForeignKeys: boolean = dropForeignKeys;
		const table = InstanceChecker.isTable(tableOrName)
			? tableOrName
			: await this.getCachedTable(tableOrName);
		const upQueries: Query[] = [];
		const downQueries: Query[] = [];

		if (dropIndices) {
			table.indices.forEach((index) => {
				upQueries.push(this.dropIndexSql(index));
				downQueries.push(this.createIndexSql(table, index));
			});
		}

		upQueries.push(this.dropTableSql(table, ifExist));
		downQueries.push(this.createTableSql(table, createForeignKeys));

		// if table had columns with generated type, we must remove the expression from the metadata table
		const generatedColumns = table.columns.filter(
			(column) => column.generatedType && column.asExpression,
		);

		for (const column of generatedColumns) {
			const deleteQuery = this.deleteTypeormMetadataSql({
				table: table.name,
				type: MetadataTableType.GENERATED_COLUMN,
				name: column.name,
			});

			const insertQuery = this.insertTypeormMetadataSql({
				table: table.name,
				type: MetadataTableType.GENERATED_COLUMN,
				name: column.name,
				value: column.asExpression,
			});

			upQueries.push(deleteQuery);
			downQueries.push(insertQuery);
		}

		await this.executeQueries(upQueries, downQueries);
	}

	/**
	 * Creates a new view.
	 */
	async createView(view: View, syncWithMetadata: boolean = false): Promise<void> {
		const upQueries: Query[] = [];
		const downQueries: Query[] = [];
		upQueries.push(this.createViewSql(view));
		if (syncWithMetadata) upQueries.push(this.insertViewDefinitionSql(view));
		downQueries.push(this.dropViewSql(view));
		if (syncWithMetadata) downQueries.push(this.deleteViewDefinitionSql(view));
		await this.executeQueries(upQueries, downQueries);
	}

	/**
	 * Drops the view.
	 */
	async dropView(target: View | string): Promise<void> {
		const viewName = InstanceChecker.isView(target) ? target.name : target;
		const view = await this.getCachedView(viewName);

		const upQueries: Query[] = [];
		const downQueries: Query[] = [];
		upQueries.push(this.deleteViewDefinitionSql(view));
		upQueries.push(this.dropViewSql(view));
		downQueries.push(this.insertViewDefinitionSql(view));
		downQueries.push(this.createViewSql(view));
		await this.executeQueries(upQueries, downQueries);
	}

	/**
	 * Renames the given table.
	 */
	async renameTable(oldTableOrName: Table | string, newTableName: string): Promise<void> {
		const oldTable = InstanceChecker.isTable(oldTableOrName)
			? oldTableOrName
			: await this.getCachedTable(oldTableOrName);
		const newTable = oldTable.clone();

		newTable.name = newTableName;

		// rename table
		const up = new Query(
			`ALTER TABLE ${this.escapePath(oldTable.name)} RENAME TO ${this.escapePath(newTableName)}`,
		);
		const down = new Query(
			`ALTER TABLE ${this.escapePath(newTableName)} RENAME TO ${this.escapePath(oldTable.name)}`,
		);
		await this.executeQueries(up, down);

		// rename unique constraints
		newTable.uniques.forEach((unique) => {
			const oldUniqueName = this.connection.namingStrategy.uniqueConstraintName(
				oldTable,
				unique.columnNames,
			);

			// Skip renaming if Unique has user defined constraint name
			if (unique.name !== oldUniqueName) return;

			unique.name = this.connection.namingStrategy.uniqueConstraintName(
				newTable,
				unique.columnNames,
			);
		});

		// rename foreign key constraints
		newTable.foreignKeys.forEach((foreignKey) => {
			const oldForeignKeyName = this.connection.namingStrategy.foreignKeyName(
				oldTable,
				foreignKey.columnNames,
				this.getTablePath(foreignKey),
				foreignKey.referencedColumnNames,
			);

			// Skip renaming if foreign key has user defined constraint name
			if (foreignKey.name !== oldForeignKeyName) return;

			foreignKey.name = this.connection.namingStrategy.foreignKeyName(
				newTable,
				foreignKey.columnNames,
				this.getTablePath(foreignKey),
				foreignKey.referencedColumnNames,
			);
		});

		// rename indices
		newTable.indices.forEach((index) => {
			const oldIndexName = this.connection.namingStrategy.indexName(
				oldTable,
				index.columnNames,
				index.where,
			);

			// Skip renaming if Index has user defined constraint name
			if (index.name !== oldIndexName) return;

			index.name = this.connection.namingStrategy.indexName(
				newTable,
				index.columnNames,
				index.where,
			);
		});

		// rename old table;
		oldTable.name = newTable.name;

		// recreate table with new constraint names
		await this.recreateTable(newTable, oldTable);
	}

	/**
	 * Creates a new column from the column in the table.
	 */
	async addColumn(tableOrName: Table | string, column: TableColumn): Promise<void> {
		const table = InstanceChecker.isTable(tableOrName)
			? tableOrName
			: await this.getCachedTable(tableOrName);
		return this.addColumns(table!, [column]);
	}

	/**
	 * Creates a new columns from the column in the table.
	 */
	async addColumns(tableOrName: Table | string, columns: TableColumn[]): Promise<void> {
		const table = InstanceChecker.isTable(tableOrName)
			? tableOrName
			: await this.getCachedTable(tableOrName);
		const changedTable = table.clone();
		columns.forEach((column) => changedTable.addColumn(column));
		await this.recreateTable(changedTable, table);
	}

	/**
	 * Renames column in the given table.
	 */
	async renameColumn(
		tableOrName: Table | string,
		oldTableColumnOrName: TableColumn | string,
		newTableColumnOrName: TableColumn | string,
	): Promise<void> {
		const table = InstanceChecker.isTable(tableOrName)
			? tableOrName
			: await this.getCachedTable(tableOrName);
		const oldColumn = InstanceChecker.isTableColumn(oldTableColumnOrName)
			? oldTableColumnOrName
			: table.columns.find((c) => c.name === oldTableColumnOrName);
		if (!oldColumn)
			throw new TypeORMError(
				`Column "${oldTableColumnOrName}" was not found in the "${table.name}" table.`,
			);

		let newColumn: TableColumn | undefined = undefined;
		if (InstanceChecker.isTableColumn(newTableColumnOrName)) {
			newColumn = newTableColumnOrName;
		} else {
			newColumn = oldColumn.clone();
			newColumn.name = newTableColumnOrName;
		}

		return this.changeColumn(table, oldColumn, newColumn);
	}

	/**
	 * Changes a column in the table.
	 */
	async changeColumn(
		tableOrName: Table | string,
		oldTableColumnOrName: TableColumn | string,
		newColumn: TableColumn,
	): Promise<void> {
		const table = InstanceChecker.isTable(tableOrName)
			? tableOrName
			: await this.getCachedTable(tableOrName);
		const oldColumn = InstanceChecker.isTableColumn(oldTableColumnOrName)
			? oldTableColumnOrName
			: table.columns.find((c) => c.name === oldTableColumnOrName);
		if (!oldColumn)
			throw new TypeORMError(
				`Column "${oldTableColumnOrName}" was not found in the "${table.name}" table.`,
			);

		await this.changeColumns(table, [{ oldColumn, newColumn }]);
	}

	/**
	 * Changes a column in the table.
	 * Changed column looses all its keys in the db.
	 */
	async changeColumns(
		tableOrName: Table | string,
		changedColumns: { oldColumn: TableColumn; newColumn: TableColumn }[],
	): Promise<void> {
		const table = InstanceChecker.isTable(tableOrName)
			? tableOrName
			: await this.getCachedTable(tableOrName);
		const changedTable = table.clone();
		changedColumns.forEach((changedColumnSet) => {
			if (changedColumnSet.newColumn.name !== changedColumnSet.oldColumn.name) {
				changedTable.findColumnUniques(changedColumnSet.oldColumn).forEach((unique) => {
					const uniqueName = this.connection.namingStrategy.uniqueConstraintName(
						table,
						unique.columnNames,
					);

					unique.columnNames.splice(unique.columnNames.indexOf(changedColumnSet.oldColumn.name), 1);
					unique.columnNames.push(changedColumnSet.newColumn.name);

					// rename Unique only if it has default constraint name
					if (unique.name === uniqueName) {
						unique.name = this.connection.namingStrategy.uniqueConstraintName(
							changedTable,
							unique.columnNames,
						);
					}
				});

				changedTable.findColumnForeignKeys(changedColumnSet.oldColumn).forEach((foreignKey) => {
					const foreignKeyName = this.connection.namingStrategy.foreignKeyName(
						table,
						foreignKey.columnNames,
						this.getTablePath(foreignKey),
						foreignKey.referencedColumnNames,
					);

					foreignKey.columnNames.splice(
						foreignKey.columnNames.indexOf(changedColumnSet.oldColumn.name),
						1,
					);
					foreignKey.columnNames.push(changedColumnSet.newColumn.name);

					// rename FK only if it has default constraint name
					if (foreignKey.name === foreignKeyName) {
						foreignKey.name = this.connection.namingStrategy.foreignKeyName(
							changedTable,
							foreignKey.columnNames,
							this.getTablePath(foreignKey),
							foreignKey.referencedColumnNames,
						);
					}
				});

				changedTable.findColumnIndices(changedColumnSet.oldColumn).forEach((index) => {
					const indexName = this.connection.namingStrategy.indexName(
						table,
						index.columnNames,
						index.where,
					);

					index.columnNames.splice(index.columnNames.indexOf(changedColumnSet.oldColumn.name), 1);
					index.columnNames.push(changedColumnSet.newColumn.name);

					// rename Index only if it has default constraint name
					if (index.name === indexName) {
						index.name = this.connection.namingStrategy.indexName(
							changedTable,
							index.columnNames,
							index.where,
						);
					}
				});
			}
			const originalColumn = changedTable.columns.find(
				(column) => column.name === changedColumnSet.oldColumn.name,
			);
			if (originalColumn)
				changedTable.columns[changedTable.columns.indexOf(originalColumn)] =
					changedColumnSet.newColumn;
		});

		await this.recreateTable(changedTable, table);
	}

	/**
	 * Drops column in the table.
	 */
	async dropColumn(tableOrName: Table | string, columnOrName: TableColumn | string): Promise<void> {
		const table = InstanceChecker.isTable(tableOrName)
			? tableOrName
			: await this.getCachedTable(tableOrName);
		const column = InstanceChecker.isTableColumn(columnOrName)
			? columnOrName
			: table.findColumnByName(columnOrName);
		if (!column)
			throw new TypeORMError(`Column "${columnOrName}" was not found in table "${table.name}"`);

		await this.dropColumns(table, [column]);
	}

	/**
	 * Drops the columns in the table.
	 */
	async dropColumns(tableOrName: Table | string, columns: TableColumn[] | string[]): Promise<void> {
		const table = InstanceChecker.isTable(tableOrName)
			? tableOrName
			: await this.getCachedTable(tableOrName);

		// clone original table and remove column and its constraints from cloned table
		const changedTable = table.clone();
		columns.forEach((column: TableColumn | string) => {
			const columnInstance = InstanceChecker.isTableColumn(column)
				? column
				: table.findColumnByName(column);
			if (!columnInstance)
				throw new Error(`Column "${column}" was not found in table "${table.name}"`);

			changedTable.removeColumn(columnInstance);
			changedTable
				.findColumnUniques(columnInstance)
				.forEach((unique) => changedTable.removeUniqueConstraint(unique));
			changedTable
				.findColumnIndices(columnInstance)
				.forEach((index) => changedTable.removeIndex(index));
			changedTable
				.findColumnForeignKeys(columnInstance)
				.forEach((fk) => changedTable.removeForeignKey(fk));
		});

		await this.recreateTable(changedTable, table);
	}

	/**
	 * Creates a new primary key.
	 */
	async createPrimaryKey(tableOrName: Table | string, columnNames: string[]): Promise<void> {
		const table = InstanceChecker.isTable(tableOrName)
			? tableOrName
			: await this.getCachedTable(tableOrName);
		// clone original table and mark columns as primary
		const changedTable = table.clone();
		changedTable.columns.forEach((column) => {
			if (columnNames.find((columnName) => columnName === column.name)) column.isPrimary = true;
		});

		await this.recreateTable(changedTable, table);
		// mark columns as primary in original table
		table.columns.forEach((column) => {
			if (columnNames.find((columnName) => columnName === column.name)) column.isPrimary = true;
		});
	}

	/**
	 * Updates composite primary keys.
	 */
	async updatePrimaryKeys(tableOrName: Table | string, columns: TableColumn[]): Promise<void> {
		await Promise.resolve();
	}

	/**
	 * Drops a primary key.
	 */
	async dropPrimaryKey(tableOrName: Table | string): Promise<void> {
		const table = InstanceChecker.isTable(tableOrName)
			? tableOrName
			: await this.getCachedTable(tableOrName);
		// clone original table and mark primary columns as non-primary
		const changedTable = table.clone();
		changedTable.primaryColumns.forEach((column) => {
			column.isPrimary = false;
		});

		await this.recreateTable(changedTable, table);
		// mark primary columns as non-primary in original table
		table.primaryColumns.forEach((column) => {
			column.isPrimary = false;
		});
	}

	/**
	 * Creates a new unique constraint.
	 */
	async createUniqueConstraint(
		tableOrName: Table | string,
		uniqueConstraint: TableUnique,
	): Promise<void> {
		await this.createUniqueConstraints(tableOrName, [uniqueConstraint]);
	}

	/**
	 * Creates a new unique constraints.
	 */
	async createUniqueConstraints(
		tableOrName: Table | string,
		uniqueConstraints: TableUnique[],
	): Promise<void> {
		const table = InstanceChecker.isTable(tableOrName)
			? tableOrName
			: await this.getCachedTable(tableOrName);

		// clone original table and add unique constraints in to cloned table
		const changedTable = table.clone();
		uniqueConstraints.forEach((uniqueConstraint) =>
			changedTable.addUniqueConstraint(uniqueConstraint),
		);
		await this.recreateTable(changedTable, table);
	}

	/**
	 * Drops an unique constraint.
	 */
	async dropUniqueConstraint(
		tableOrName: Table | string,
		uniqueOrName: TableUnique | string,
	): Promise<void> {
		const table = InstanceChecker.isTable(tableOrName)
			? tableOrName
			: await this.getCachedTable(tableOrName);
		const uniqueConstraint = InstanceChecker.isTableUnique(uniqueOrName)
			? uniqueOrName
			: table.uniques.find((u) => u.name === uniqueOrName);
		if (!uniqueConstraint)
			throw new TypeORMError(`Supplied unique constraint was not found in table ${table.name}`);

		await this.dropUniqueConstraints(table, [uniqueConstraint]);
	}

	/**
	 * Creates an unique constraints.
	 */
	async dropUniqueConstraints(
		tableOrName: Table | string,
		uniqueConstraints: TableUnique[],
	): Promise<void> {
		const table = InstanceChecker.isTable(tableOrName)
			? tableOrName
			: await this.getCachedTable(tableOrName);

		// clone original table and remove unique constraints from cloned table
		const changedTable = table.clone();
		uniqueConstraints.forEach((uniqueConstraint) =>
			changedTable.removeUniqueConstraint(uniqueConstraint),
		);

		await this.recreateTable(changedTable, table);
	}

	/**
	 * Creates new check constraint.
	 */
	async createCheckConstraint(
		tableOrName: Table | string,
		checkConstraint: TableCheck,
	): Promise<void> {
		await this.createCheckConstraints(tableOrName, [checkConstraint]);
	}

	/**
	 * Creates new check constraints.
	 */
	async createCheckConstraints(
		tableOrName: Table | string,
		checkConstraints: TableCheck[],
	): Promise<void> {
		const table = InstanceChecker.isTable(tableOrName)
			? tableOrName
			: await this.getCachedTable(tableOrName);

		// clone original table and add check constraints in to cloned table
		const changedTable = table.clone();
		checkConstraints.forEach((checkConstraint) => changedTable.addCheckConstraint(checkConstraint));
		await this.recreateTable(changedTable, table);
	}

	/**
	 * Drops check constraint.
	 */
	async dropCheckConstraint(
		tableOrName: Table | string,
		checkOrName: TableCheck | string,
	): Promise<void> {
		const table = InstanceChecker.isTable(tableOrName)
			? tableOrName
			: await this.getCachedTable(tableOrName);
		const checkConstraint = InstanceChecker.isTableCheck(checkOrName)
			? checkOrName
			: table.checks.find((c) => c.name === checkOrName);
		if (!checkConstraint)
			throw new TypeORMError(`Supplied check constraint was not found in table ${table.name}`);

		await this.dropCheckConstraints(table, [checkConstraint]);
	}

	/**
	 * Drops check constraints.
	 */
	async dropCheckConstraints(
		tableOrName: Table | string,
		checkConstraints: TableCheck[],
	): Promise<void> {
		const table = InstanceChecker.isTable(tableOrName)
			? tableOrName
			: await this.getCachedTable(tableOrName);

		// clone original table and remove check constraints from cloned table
		const changedTable = table.clone();
		checkConstraints.forEach((checkConstraint) =>
			changedTable.removeCheckConstraint(checkConstraint),
		);

		await this.recreateTable(changedTable, table);
	}

	/**
	 * Creates a new exclusion constraint.
	 */
	async createExclusionConstraint(
		tableOrName: Table | string,
		exclusionConstraint: TableExclusion,
	): Promise<void> {
		throw new TypeORMError(`Sqlite does not support exclusion constraints.`);
	}

	/**
	 * Creates a new exclusion constraints.
	 */
	async createExclusionConstraints(
		tableOrName: Table | string,
		exclusionConstraints: TableExclusion[],
	): Promise<void> {
		throw new TypeORMError(`Sqlite does not support exclusion constraints.`);
	}

	/**
	 * Drops exclusion constraint.
	 */
	async dropExclusionConstraint(
		tableOrName: Table | string,
		exclusionOrName: TableExclusion | string,
	): Promise<void> {
		throw new TypeORMError(`Sqlite does not support exclusion constraints.`);
	}

	/**
	 * Drops exclusion constraints.
	 */
	async dropExclusionConstraints(
		tableOrName: Table | string,
		exclusionConstraints: TableExclusion[],
	): Promise<void> {
		throw new TypeORMError(`Sqlite does not support exclusion constraints.`);
	}

	/**
	 * Creates a new foreign key.
	 */
	async createForeignKey(tableOrName: Table | string, foreignKey: TableForeignKey): Promise<void> {
		await this.createForeignKeys(tableOrName, [foreignKey]);
	}

	/**
	 * Creates a new foreign keys.
	 */
	async createForeignKeys(
		tableOrName: Table | string,
		foreignKeys: TableForeignKey[],
	): Promise<void> {
		const table = InstanceChecker.isTable(tableOrName)
			? tableOrName
			: await this.getCachedTable(tableOrName);
		// clone original table and add foreign keys in to cloned table
		const changedTable = table.clone();
		foreignKeys.forEach((foreignKey) => changedTable.addForeignKey(foreignKey));

		await this.recreateTable(changedTable, table);
	}

	/**
	 * Drops a foreign key from the table.
	 */
	async dropForeignKey(
		tableOrName: Table | string,
		foreignKeyOrName: TableForeignKey | string,
	): Promise<void> {
		const table = InstanceChecker.isTable(tableOrName)
			? tableOrName
			: await this.getCachedTable(tableOrName);
		const foreignKey = InstanceChecker.isTableForeignKey(foreignKeyOrName)
			? foreignKeyOrName
			: table.foreignKeys.find((fk) => fk.name === foreignKeyOrName);
		if (!foreignKey)
			throw new TypeORMError(`Supplied foreign key was not found in table ${table.name}`);

		await this.dropForeignKeys(tableOrName, [foreignKey]);
	}

	/**
	 * Drops a foreign keys from the table.
	 */
	async dropForeignKeys(
		tableOrName: Table | string,
		foreignKeys: TableForeignKey[],
	): Promise<void> {
		const table = InstanceChecker.isTable(tableOrName)
			? tableOrName
			: await this.getCachedTable(tableOrName);

		// clone original table and remove foreign keys from cloned table
		const changedTable = table.clone();
		foreignKeys.forEach((foreignKey) => changedTable.removeForeignKey(foreignKey));

		await this.recreateTable(changedTable, table);
	}

	/**
	 * Creates a new index.
	 */
	async createIndex(tableOrName: Table | string, index: TableIndex): Promise<void> {
		const table = InstanceChecker.isTable(tableOrName)
			? tableOrName
			: await this.getCachedTable(tableOrName);

		// new index may be passed without name. In this case we generate index name manually.
		if (!index.name) index.name = this.generateIndexName(table, index);

		const up = this.createIndexSql(table, index);
		const down = this.dropIndexSql(index);
		await this.executeQueries(up, down);
		table.addIndex(index);
	}

	/**
	 * Creates a new indices
	 */
	async createIndices(tableOrName: Table | string, indices: TableIndex[]): Promise<void> {
		const promises = indices.map((index) => this.createIndex(tableOrName, index));
		await Promise.all(promises);
	}

	/**
	 * Drops an index from the table.
	 */
	async dropIndex(tableOrName: Table | string, indexOrName: TableIndex | string): Promise<void> {
		const table = InstanceChecker.isTable(tableOrName)
			? tableOrName
			: await this.getCachedTable(tableOrName);
		const index = InstanceChecker.isTableIndex(indexOrName)
			? indexOrName
			: table.indices.find((i) => i.name === indexOrName);
		if (!index)
			throw new TypeORMError(`Supplied index ${indexOrName} was not found in table ${table.name}`);

		// old index may be passed without name. In this case we generate index name manually.
		if (!index.name) index.name = this.generateIndexName(table, index);

		const up = this.dropIndexSql(index);
		const down = this.createIndexSql(table, index);
		await this.executeQueries(up, down);
		table.removeIndex(index);
	}

	/**
	 * Drops an indices from the table.
	 */
	async dropIndices(tableOrName: Table | string, indices: TableIndex[]): Promise<void> {
		const promises = indices.map((index) => this.dropIndex(tableOrName, index));
		await Promise.all(promises);
	}

	/**
	 * Clears all table contents.
	 * Note: this operation uses SQL's TRUNCATE query which cannot be reverted in transactions.
	 */
	async clearTable(tableName: string): Promise<void> {
		await this.query(`DELETE FROM ${this.escapePath(tableName)}`);
	}

	/**
	 * Removes all tables from the currently connected database.
	 */
	async clearDatabase(database?: string): Promise<void> {
		let dbPath: string | undefined = undefined;
		if (database && this.driver.getAttachedDatabaseHandleByRelativePath(database)) {
			dbPath = this.driver.getAttachedDatabaseHandleByRelativePath(database);
		}

		await this.query(`PRAGMA foreign_keys = OFF`);

		const isAnotherTransactionActive = this.isTransactionActive;
		if (!isAnotherTransactionActive) await this.startTransaction();
		try {
			const selectViewDropsQuery = dbPath
				? `SELECT 'DROP VIEW "${dbPath}"."' || name || '";' as query FROM "${dbPath}"."sqlite_master" WHERE "type" = 'view'`
				: `SELECT 'DROP VIEW "' || name || '";' as query FROM "sqlite_master" WHERE "type" = 'view'`;
			const dropViewQueries: ObjectLiteral[] = await this.query(selectViewDropsQuery);
			await Promise.all(dropViewQueries.map((q) => this.query(q['query'])));

			const selectTableDropsQuery = dbPath
				? `SELECT 'DROP TABLE "${dbPath}"."' || name || '";' as query FROM "${dbPath}"."sqlite_master" WHERE "type" = 'table' AND "name" != 'sqlite_sequence'`
				: `SELECT 'DROP TABLE "' || name || '";' as query FROM "sqlite_master" WHERE "type" = 'table' AND "name" != 'sqlite_sequence'`;
			const dropTableQueries: ObjectLiteral[] = await this.query(selectTableDropsQuery);
			await Promise.all(dropTableQueries.map((q) => this.query(q['query'])));

			if (!isAnotherTransactionActive) await this.commitTransaction();
		} catch (error) {
			try {
				// we throw original error even if rollback thrown an error
				if (!isAnotherTransactionActive) await this.rollbackTransaction();
			} catch (rollbackError) {}
			throw error;
		} finally {
			await this.query(`PRAGMA foreign_keys = ON`);
		}
	}

	// -------------------------------------------------------------------------
	// Protected Methods
	// -------------------------------------------------------------------------

	protected async loadViews(viewNames?: string[]): Promise<View[]> {
		const hasTable = await this.hasTable(this.getTypeormMetadataTableName());
		if (!hasTable) {
			return [];
		}

		if (!viewNames) {
			viewNames = [];
		}

		const viewNamesString = viewNames.map((name) => "'" + name + "'").join(', ');
		let query = `SELECT "t".* FROM "${this.getTypeormMetadataTableName()}" "t" INNER JOIN "sqlite_master" s ON "s"."name" = "t"."name" AND "s"."type" = 'view' WHERE "t"."type" = '${
			MetadataTableType.VIEW
		}'`;
		if (viewNamesString.length > 0) query += ` AND "t"."name" IN (${viewNamesString})`;
		const dbViews = await this.query(query);
		return dbViews.map((dbView: any) => {
			const view = new View();
			view.name = dbView['name'];
			view.expression = dbView['value'];
			return view;
		});
	}

	protected async loadTableRecords(tablePath: string, tableOrIndex: 'table' | 'index') {
		let database: string | undefined = undefined;
		const [schema, tableName] = this.splitTablePath(tablePath);
		if (schema && this.driver.getAttachedDatabasePathRelativeByHandle(schema)) {
			database = this.driver.getAttachedDatabasePathRelativeByHandle(schema);
		}

		const databaseColumn = database ?? null;
		const schemaColumn = schema ?? null;
		const masterTable = `${
			schema ? `${this.escapePath(schema)}.` : ''
		}${this.escapePath('sqlite_master')}`;
		const query =
			tableOrIndex === 'table'
				? `SELECT ?1 as database, ?2 as schema, * FROM ${masterTable} WHERE "type" = 'table' AND "name" = ?3`
				: `SELECT ?1 as database, ?2 as schema, * FROM ${masterTable} WHERE "type" = 'index' AND "tbl_name" = ?3`;

		return this.query(query, [databaseColumn, schemaColumn, tableName]);
	}

	protected async loadPragmaRecords(tablePath: string, pragma: string) {
		const [, tableName] = this.splitTablePath(tablePath);
		return this.query(`PRAGMA ${pragma}("${tableName}")`);
	}

	/**
	 * Loads all tables (with given names) from the database and creates a Table from them.
	 */
	protected async loadTables(tableNames?: string[]): Promise<Table[]> {
		// if no tables given then no need to proceed
		if (tableNames && tableNames.length === 0) {
			return [];
		}

		let dbTables: { database?: string; name: string; sql: string }[] = [];
		let dbIndicesDef: ObjectLiteral[];

		if (!tableNames) {
			const tablesSql = `SELECT * FROM "sqlite_master" WHERE "type" = 'table'`;
			dbTables.push(...(await this.query(tablesSql)));

			const tableNamesString = dbTables.map(({ name }) => `'${name}'`).join(', ');
			dbIndicesDef = await this.query(
				`SELECT * FROM "sqlite_master" WHERE "type" = 'index' AND "tbl_name" IN (${tableNamesString})`,
			);
		} else {
			const tableNamesWithoutDot = tableNames
				.filter((tableName) => {
					return tableName.split('.').length === 1;
				})
				.map((tableName) => `${tableName}`);

			const tableNamesWithDot = tableNames.filter((tableName) => {
				return tableName.split('.').length > 1;
			});

			const queryPromises = (type: 'table' | 'index') => {
				const promises = [
					...tableNamesWithDot.map((tableName) => this.loadTableRecords(tableName, type)),
				];

				if (tableNamesWithoutDot.length) {
					const columnName = type === 'table' ? 'name' : 'tbl_name';
					const placeholders = tableNamesWithoutDot.map(() => '?').join(',');
					promises.push(
						this.query(
							`SELECT * FROM "sqlite_master" WHERE "type" = ? AND ${columnName} IN (${placeholders})`,
							[type, ...tableNamesWithoutDot],
						),
					);
				}

				return promises;
			};
			dbTables = (await Promise.all(queryPromises('table')))
				.reduce((acc, res) => [...acc, ...res], [])
				.filter(Boolean);
			dbIndicesDef = (await Promise.all(queryPromises('index')))
				.reduce((acc, res) => [...acc, ...res], [])
				.filter(Boolean);
		}

		// if tables were not found in the db, no need to proceed
		if (dbTables.length === 0) {
			return [];
		}

		// create table schemas for loaded tables
		return Promise.all(
			dbTables.map(async (dbTable) => {
				const tablePath =
					dbTable['database'] &&
					this.driver.getAttachedDatabaseHandleByRelativePath(dbTable['database'])
						? `${this.driver.getAttachedDatabaseHandleByRelativePath(
								dbTable['database'],
							)}.${dbTable['name']}`
						: dbTable['name'];

				const sql = dbTable['sql'];

				const withoutRowid = sql.includes('WITHOUT ROWID');
				const table = new Table({ name: tablePath, withoutRowid });

				// load columns and indices
				const [dbColumns, dbIndices, dbForeignKeys]: ObjectLiteral[][] = await Promise.all([
					this.loadPragmaRecords(tablePath, `table_xinfo`),
					this.loadPragmaRecords(tablePath, `index_list`),
					this.loadPragmaRecords(tablePath, `foreign_key_list`),
				]);

				// find column name with auto increment
				let autoIncrementColumnName: string | undefined = undefined;
				const tableSql: string = dbTable['sql'];
				let autoIncrementIndex = tableSql.toUpperCase().indexOf('AUTOINCREMENT');
				if (autoIncrementIndex !== -1) {
					autoIncrementColumnName = tableSql.substr(0, autoIncrementIndex);
					const comma = autoIncrementColumnName.lastIndexOf(',');
					const bracket = autoIncrementColumnName.lastIndexOf('(');
					if (comma !== -1) {
						autoIncrementColumnName = autoIncrementColumnName.substr(comma);
						autoIncrementColumnName = autoIncrementColumnName.substr(
							0,
							autoIncrementColumnName.lastIndexOf('"'),
						);
						autoIncrementColumnName = autoIncrementColumnName.substr(
							autoIncrementColumnName.indexOf('"') + 1,
						);
					} else if (bracket !== -1) {
						autoIncrementColumnName = autoIncrementColumnName.substr(bracket);
						autoIncrementColumnName = autoIncrementColumnName.substr(
							0,
							autoIncrementColumnName.lastIndexOf('"'),
						);
						autoIncrementColumnName = autoIncrementColumnName.substr(
							autoIncrementColumnName.indexOf('"') + 1,
						);
					}
				}

				// create columns from the loaded columns
				table.columns = await Promise.all(
					dbColumns.map(async (dbColumn) => {
						const tableColumn = new TableColumn();
						tableColumn.name = dbColumn['name'];
						tableColumn.type = dbColumn['type'].toLowerCase();
						tableColumn.default =
							dbColumn['dflt_value'] !== null && dbColumn['dflt_value'] !== undefined
								? dbColumn['dflt_value']
								: undefined;
						tableColumn.isNullable = dbColumn['notnull'] === 0;
						// primary keys are numbered starting with 1, columns that aren't primary keys are marked with 0
						tableColumn.isPrimary = dbColumn['pk'] > 0;
						tableColumn.comment = ''; // SQLite does not support column comments
						tableColumn.isGenerated = autoIncrementColumnName === dbColumn['name'];
						if (tableColumn.isGenerated) {
							tableColumn.generationStrategy = 'increment';
						}

						if (dbColumn['hidden'] === 2 || dbColumn['hidden'] === 3) {
							tableColumn.generatedType = dbColumn['hidden'] === 2 ? 'VIRTUAL' : 'STORED';

							const asExpressionQuery = this.selectTypeormMetadataSql({
								table: table.name,
								type: MetadataTableType.GENERATED_COLUMN,
								name: tableColumn.name,
							});

							const results = await this.query(
								asExpressionQuery.query,
								asExpressionQuery.parameters,
							);
							if (results[0] && results[0].value) {
								tableColumn.asExpression = results[0].value;
							} else {
								tableColumn.asExpression = '';
							}
						}

						if (tableColumn.type === 'varchar') {
							tableColumn.enum = OrmUtils.parseSqlCheckExpression(sql, tableColumn.name);
						}

						// parse datatype and attempt to retrieve length, precision and scale
						let pos = tableColumn.type.indexOf('(');
						if (pos !== -1) {
							const fullType = tableColumn.type;
							let dataType = fullType.substr(0, pos);
							if (this.driver.withLengthColumnTypes.find((col) => col === dataType)) {
								let len = parseInt(fullType.substring(pos + 1, fullType.length - 1));
								if (len) {
									tableColumn.length = len.toString();
									tableColumn.type = dataType; // remove the length part from the datatype
								}
							}
							if (this.driver.withPrecisionColumnTypes.find((col) => col === dataType)) {
								const re = new RegExp(`^${dataType}\\((\\d+),?\\s?(\\d+)?\\)`);
								const matches = fullType.match(re);
								if (matches && matches[1]) {
									tableColumn.precision = +matches[1];
								}
								if (this.driver.withScaleColumnTypes.find((col) => col === dataType)) {
									if (matches && matches[2]) {
										tableColumn.scale = +matches[2];
									}
								}
								tableColumn.type = dataType; // remove the precision/scale part from the datatype
							}
						}

						return tableColumn;
					}),
				);

				// find foreign key constraints from CREATE TABLE sql
				let fkResult;
				const fkMappings: {
					name: string;
					columns: string[];
					referencedTableName: string;
				}[] = [];
				const fkRegex = /CONSTRAINT "([^"]*)" FOREIGN KEY ?\((.*?)\) REFERENCES "([^"]*)"/g;
				while ((fkResult = fkRegex.exec(sql)) !== null) {
					fkMappings.push({
						name: fkResult[1],
						columns: fkResult[2].substr(1, fkResult[2].length - 2).split(`", "`),
						referencedTableName: fkResult[3],
					});
				}

				// build foreign keys
				const tableForeignKeyConstraints = OrmUtils.uniq(
					dbForeignKeys,
					(dbForeignKey) => dbForeignKey['id'],
				);

				table.foreignKeys = tableForeignKeyConstraints.map((foreignKey) => {
					const ownForeignKeys = dbForeignKeys.filter(
						(dbForeignKey) =>
							dbForeignKey['id'] === foreignKey['id'] &&
							dbForeignKey['table'] === foreignKey['table'],
					);
					const columnNames = ownForeignKeys.map((dbForeignKey) => dbForeignKey['from']);
					const referencedColumnNames = ownForeignKeys.map((dbForeignKey) => dbForeignKey['to']);

					// find related foreign key mapping
					const fkMapping = fkMappings.find(
						(it) =>
							it.referencedTableName === foreignKey['table'] &&
							it.columns.every((column) => columnNames.indexOf(column) !== -1),
					);

					return new TableForeignKey({
						name: fkMapping?.name,
						columnNames: columnNames,
						referencedTableName: foreignKey['table'],
						referencedColumnNames: referencedColumnNames,
						onDelete: foreignKey['on_delete'],
						onUpdate: foreignKey['on_update'],
					});
				});

				// find unique constraints from CREATE TABLE sql
				let uniqueRegexResult;
				const uniqueMappings: { name: string; columns: string[] }[] = [];
				const uniqueRegex = /CONSTRAINT "([^"]*)" UNIQUE ?\((.*?)\)/g;
				while ((uniqueRegexResult = uniqueRegex.exec(sql)) !== null) {
					uniqueMappings.push({
						name: uniqueRegexResult[1],
						columns: uniqueRegexResult[2].substr(1, uniqueRegexResult[2].length - 2).split(`", "`),
					});
				}

				// build unique constraints
				const tableUniquePromises = dbIndices
					.filter((dbIndex) => dbIndex['origin'] === 'u')
					.map((dbIndex) => dbIndex['name'])
					.filter((value, index, self) => self.indexOf(value) === index)
					.map(async (dbIndexName) => {
						const dbIndex = dbIndices.find((dbIndex) => dbIndex['name'] === dbIndexName);
						const indexInfos: ObjectLiteral[] = await this.query(
							`PRAGMA index_info("${dbIndex!['name']}")`,
						);
						const indexColumns = indexInfos
							.sort(
								(indexInfo1, indexInfo2) =>
									parseInt(indexInfo1['seqno']) - parseInt(indexInfo2['seqno']),
							)
							.map((indexInfo) => indexInfo['name']);
						if (indexColumns.length === 1) {
							const column = table.columns.find((column) => {
								return !!indexColumns.find((indexColumn) => indexColumn === column.name);
							});
							if (column) column.isUnique = true;
						}

						// find existent mapping by a column names
						const foundMapping = uniqueMappings.find((mapping) => {
							return mapping!.columns.every((column) => indexColumns.indexOf(column) !== -1);
						});

						return new TableUnique({
							name: foundMapping
								? foundMapping.name
								: this.connection.namingStrategy.uniqueConstraintName(table, indexColumns),
							columnNames: indexColumns,
						});
					});
				table.uniques = (await Promise.all(tableUniquePromises)) as TableUnique[];

				// build checks
				let result;
				const regexp = /CONSTRAINT "([^"]*)" CHECK ?(\(.*?\))([,]|[)]$)/g;
				while ((result = regexp.exec(sql)) !== null) {
					table.checks.push(
						new TableCheck({
							name: result[1],
							expression: result[2],
						}),
					);
				}

				// build indices
				const indicesPromises = dbIndices
					.filter((dbIndex) => dbIndex['origin'] === 'c')
					.map((dbIndex) => dbIndex['name'])
					.filter((value, index, self) => self.indexOf(value) === index) // unqiue
					.map(async (dbIndexName) => {
						const indexDef = dbIndicesDef.find((dbIndexDef) => dbIndexDef['name'] === dbIndexName);
						const condition = /WHERE (.*)/.exec(indexDef!['sql']);
						const dbIndex = dbIndices.find((dbIndex) => dbIndex['name'] === dbIndexName);
						const indexInfos: ObjectLiteral[] = await this.query(
							`PRAGMA index_info("${dbIndex!['name']}")`,
						);
						const indexColumns = indexInfos
							.sort(
								(indexInfo1, indexInfo2) =>
									parseInt(indexInfo1['seqno']) - parseInt(indexInfo2['seqno']),
							)
							.map((indexInfo) => indexInfo['name']);
						const dbIndexPath = `${
							dbTable['database'] ? `${dbTable['database']}.` : ''
						}${dbIndex!['name']}`;

						const isUnique = dbIndex!['unique'] === '1' || dbIndex!['unique'] === 1;
						return new TableIndex(<TableIndexOptions>{
							table: table,
							name: dbIndexPath,
							columnNames: indexColumns,
							isUnique: isUnique,
							where: condition ? condition[1] : undefined,
						});
					});
				const indices = await Promise.all(indicesPromises);
				table.indices = indices.filter((index) => !!index) as TableIndex[];

				return table;
			}),
		);
	}

	/**
	 * Builds create table sql.
	 */
	protected createTableSql(
		table: Table,
		createForeignKeys?: boolean,
		temporaryTable?: boolean,
	): Query {
		const primaryColumns = table.columns.filter((column) => column.isPrimary);
		const hasAutoIncrement = primaryColumns.find(
			(column) => column.isGenerated && column.generationStrategy === 'increment',
		);
		const skipPrimary = primaryColumns.length > 1;
		if (skipPrimary && hasAutoIncrement)
			throw new TypeORMError(`Sqlite does not support AUTOINCREMENT on composite primary key`);

		const columnDefinitions = table.columns
			.map((column) => this.buildCreateColumnSql(column, skipPrimary))
			.join(', ');
		const [database] = this.splitTablePath(table.name);
		let sql = `CREATE TABLE ${this.escapePath(table.name)} (${columnDefinitions}`;

		let [databaseNew, tableName] = this.splitTablePath(table.name);
		const newTableName = temporaryTable
			? `${databaseNew ? `${databaseNew}.` : ''}${tableName.replace(/^temporary_/, '')}`
			: table.name;

		// need for `addColumn()` method, because it recreates table.
		table.columns
			.filter((column) => column.isUnique)
			.forEach((column) => {
				const isUniqueExist = table.uniques.some(
					(unique) => unique.columnNames.length === 1 && unique.columnNames[0] === column.name,
				);
				if (!isUniqueExist)
					table.uniques.push(
						new TableUnique({
							name: this.connection.namingStrategy.uniqueConstraintName(table, [column.name]),
							columnNames: [column.name],
						}),
					);
			});

		if (table.uniques.length > 0) {
			const uniquesSql = table.uniques
				.map((unique) => {
					const uniqueName = unique.name
						? unique.name
						: this.connection.namingStrategy.uniqueConstraintName(newTableName, unique.columnNames);
					const columnNames = unique.columnNames.map((columnName) => `"${columnName}"`).join(', ');
					return `CONSTRAINT "${uniqueName}" UNIQUE (${columnNames})`;
				})
				.join(', ');

			sql += `, ${uniquesSql}`;
		}

		if (table.checks.length > 0) {
			const checksSql = table.checks
				.map((check) => {
					const checkName = check.name
						? check.name
						: this.connection.namingStrategy.checkConstraintName(newTableName, check.expression!);
					return `CONSTRAINT "${checkName}" CHECK (${check.expression})`;
				})
				.join(', ');

			sql += `, ${checksSql}`;
		}

		if (table.foreignKeys.length > 0 && createForeignKeys) {
			const foreignKeysSql = table.foreignKeys
				.filter((fk) => {
					const [referencedDatabase] = this.splitTablePath(fk.referencedTableName);
					if (referencedDatabase !== database) {
						return false;
					}
					return true;
				})
				.map((fk) => {
					const [, referencedTable] = this.splitTablePath(fk.referencedTableName);
					const columnNames = fk.columnNames.map((columnName) => `"${columnName}"`).join(', ');
					if (!fk.name)
						fk.name = this.connection.namingStrategy.foreignKeyName(
							newTableName,
							fk.columnNames,
							this.getTablePath(fk),
							fk.referencedColumnNames,
						);
					const referencedColumnNames = fk.referencedColumnNames
						.map((columnName) => `"${columnName}"`)
						.join(', ');

					let constraint = `CONSTRAINT "${fk.name}" FOREIGN KEY (${columnNames}) REFERENCES "${referencedTable}" (${referencedColumnNames})`;
					if (fk.onDelete) constraint += ` ON DELETE ${fk.onDelete}`;
					if (fk.onUpdate) constraint += ` ON UPDATE ${fk.onUpdate}`;
					if (fk.deferrable) constraint += ` DEFERRABLE ${fk.deferrable}`;

					return constraint;
				})
				.join(', ');

			sql += `, ${foreignKeysSql}`;
		}

		if (primaryColumns.length > 1) {
			const columnNames = primaryColumns.map((column) => `"${column.name}"`).join(', ');
			sql += `, PRIMARY KEY (${columnNames})`;
		}

		sql += `)`;

		if (table.withoutRowid) {
			sql += ' WITHOUT ROWID';
		}

		return new Query(sql);
	}

	/**
	 * Builds drop table sql.
	 */
	protected dropTableSql(tableOrName: Table | string, ifExist?: boolean): Query {
		const tableName = InstanceChecker.isTable(tableOrName) ? tableOrName.name : tableOrName;
		const query = ifExist
			? `DROP TABLE IF EXISTS ${this.escapePath(tableName)}`
			: `DROP TABLE ${this.escapePath(tableName)}`;
		return new Query(query);
	}

	protected createViewSql(view: View): Query {
		if (typeof view.expression === 'string') {
			return new Query(`CREATE VIEW "${view.name}" AS ${view.expression}`);
		} else {
			return new Query(
				`CREATE VIEW "${view.name}" AS ${view.expression(this.connection).getQuery()}`,
			);
		}
	}

	protected insertViewDefinitionSql(view: View): Query {
		const expression =
			typeof view.expression === 'string'
				? view.expression.trim()
				: view.expression(this.connection).getQuery();
		return this.insertTypeormMetadataSql({
			type: MetadataTableType.VIEW,
			name: view.name,
			value: expression,
		});
	}

	/**
	 * Builds drop view sql.
	 */
	protected dropViewSql(viewOrPath: View | string): Query {
		const viewName = InstanceChecker.isView(viewOrPath) ? viewOrPath.name : viewOrPath;
		return new Query(`DROP VIEW "${viewName}"`);
	}

	/**
	 * Builds remove view sql.
	 */
	protected deleteViewDefinitionSql(viewOrPath: View | string): Query {
		const viewName = InstanceChecker.isView(viewOrPath) ? viewOrPath.name : viewOrPath;
		return this.deleteTypeormMetadataSql({
			type: MetadataTableType.VIEW,
			name: viewName,
		});
	}

	/**
	 * Builds create index sql.
	 */
	protected createIndexSql(table: Table, index: TableIndex): Query {
		const columns = index.columnNames.map((columnName) => `"${columnName}"`).join(', ');
		const [database, tableName] = this.splitTablePath(table.name);
		return new Query(
			`CREATE ${index.isUnique ? 'UNIQUE ' : ''}INDEX ${
				database ? `"${database}".` : ''
			}${this.escapePath(index.name!)} ON "${tableName}" (${columns}) ${
				index.where ? 'WHERE ' + index.where : ''
			}`,
		);
	}

	/**
	 * Builds drop index sql.
	 */
	protected dropIndexSql(indexOrName: TableIndex | string): Query {
		let indexName = InstanceChecker.isTableIndex(indexOrName) ? indexOrName.name : indexOrName;
		return new Query(`DROP INDEX ${this.escapePath(indexName!)}`);
	}

	/**
	 * Builds a query for create column.
	 */
	protected buildCreateColumnSql(column: TableColumn, skipPrimary?: boolean): string {
		let c = '"' + column.name + '"';
		if (InstanceChecker.isColumnMetadata(column)) {
			c += ' ' + this.driver.normalizeType(column);
		} else {
			c += ' ' + this.connection.driver.createFullType(column);
		}

		if (column.enum)
			c +=
				' CHECK( "' +
				column.name +
				'" IN (' +
				column.enum.map((val) => "'" + val + "'").join(',') +
				') )';
		if (column.isPrimary && !skipPrimary) c += ' PRIMARY KEY';
		if (column.isGenerated === true && column.generationStrategy === 'increment')
			// don't use skipPrimary here since updates can update already exist primary without auto inc.
			c += ' AUTOINCREMENT';
		if (column.collation) c += ' COLLATE ' + column.collation;
		if (column.isNullable !== true) c += ' NOT NULL';

		if (column.asExpression) {
			c += ` AS (${column.asExpression}) ${
				column.generatedType ? column.generatedType : 'VIRTUAL'
			}`;
		} else {
			if (column.default !== undefined && column.default !== null)
				c += ' DEFAULT (' + column.default + ')';
		}

		return c;
	}

	protected async recreateTable(
		newTable: Table,
		oldTable: Table,
		migrateData = true,
	): Promise<void> {
		const upQueries: Query[] = [];
		const downQueries: Query[] = [];

		// query triggers from old table before recreation
		const [, tableNameOldInitial] = this.splitTablePath(oldTable.name);
		const triggerQuery = `SELECT name, sql FROM sqlite_master WHERE type = 'trigger' AND tbl_name = ?`;
		const triggers: { name: string; sql: string }[] = await this.query(triggerQuery, [
			tableNameOldInitial,
		]);

		// drop old table indices
		oldTable.indices.forEach((index) => {
			upQueries.push(this.dropIndexSql(index));
			downQueries.push(this.createIndexSql(oldTable, index));
		});

		// change table name into 'temporary_table'
		let [databaseNew, tableNameNew] = this.splitTablePath(newTable.name);
		let [, tableNameOld] = this.splitTablePath(oldTable.name);
		newTable.name = tableNameNew = `${
			databaseNew ? `${databaseNew}.` : ''
		}temporary_${tableNameNew}`;

		// create new table
		upQueries.push(this.createTableSql(newTable, true, true));
		downQueries.push(this.dropTableSql(newTable));

		// migrate all data from the old table into new table
		if (migrateData) {
			let newColumnNames = newTable.columns
				.filter((column) => !column.generatedType)
				.map((column) => `"${column.name}"`);

			let oldColumnNames = oldTable.columns
				.filter((column) => !column.generatedType)
				.map((column) => `"${column.name}"`);

			if (oldColumnNames.length < newColumnNames.length) {
				newColumnNames = newTable.columns
					.filter((column) => {
						const oldColumn = oldTable.columns.find((c) => c.name === column.name);
						if (oldColumn && oldColumn.generatedType) return false;
						return !column.generatedType && oldColumn;
					})
					.map((column) => `"${column.name}"`);
			} else if (oldColumnNames.length > newColumnNames.length) {
				oldColumnNames = oldTable.columns
					.filter((column) => {
						return !column.generatedType && newTable.columns.find((c) => c.name === column.name);
					})
					.map((column) => `"${column.name}"`);
			}

			upQueries.push(
				new Query(
					`INSERT INTO ${this.escapePath(newTable.name)}(${newColumnNames.join(
						', ',
					)}) SELECT ${oldColumnNames.join(', ')} FROM ${this.escapePath(oldTable.name)}`,
				),
			);
			downQueries.push(
				new Query(
					`INSERT INTO ${this.escapePath(oldTable.name)}(${oldColumnNames.join(
						', ',
					)}) SELECT ${newColumnNames.join(', ')} FROM ${this.escapePath(newTable.name)}`,
				),
			);
		}

		// drop old table
		upQueries.push(this.dropTableSql(oldTable));
		downQueries.push(this.createTableSql(oldTable, true));

		// rename old table
		upQueries.push(
			new Query(
				`ALTER TABLE ${this.escapePath(newTable.name)} RENAME TO ${this.escapePath(tableNameOld)}`,
			),
		);
		downQueries.push(
			new Query(
				`ALTER TABLE ${this.escapePath(oldTable.name)} RENAME TO ${this.escapePath(tableNameNew)}`,
			),
		);

		newTable.name = oldTable.name;

		// recreate table indices
		newTable.indices.forEach((index) => {
			// new index may be passed without name. In this case we generate index name manually.
			if (!index.name)
				index.name = this.connection.namingStrategy.indexName(
					newTable,
					index.columnNames,
					index.where,
				);
			upQueries.push(this.createIndexSql(newTable, index));
			downQueries.push(this.dropIndexSql(index));
		});

		// recreate table triggers
		triggers.forEach((trigger) => {
			// upQueries: recreate triggers on the new table (forward migration)
			upQueries.push(new Query(trigger.sql));
			// downQueries: recreate triggers on the old table (rollback)
			downQueries.push(new Query(trigger.sql));
		});

		// update generated columns in "typeorm_metadata" table
		// Step 1: clear data for removed generated columns
		oldTable.columns
			.filter((column) => {
				const newTableColumn = newTable.columns.find((c) => c.name === column.name);
				// we should delete record from "typeorm_metadata" if generated column was removed
				// or it was changed to non-generated
				return (
					column.generatedType &&
					column.asExpression &&
					(!newTableColumn || (!newTableColumn.generatedType && !newTableColumn.asExpression))
				);
			})
			.forEach((column) => {
				const deleteQuery = this.deleteTypeormMetadataSql({
					table: oldTable.name,
					type: MetadataTableType.GENERATED_COLUMN,
					name: column.name,
				});

				const insertQuery = this.insertTypeormMetadataSql({
					table: oldTable.name,
					type: MetadataTableType.GENERATED_COLUMN,
					name: column.name,
					value: column.asExpression,
				});

				upQueries.push(deleteQuery);
				downQueries.push(insertQuery);
			});

		// Step 2: add data for new generated columns
		newTable.columns
			.filter(
				(column) =>
					column.generatedType &&
					column.asExpression &&
					!oldTable.columns.some((c) => c.name === column.name),
			)
			.forEach((column) => {
				const insertQuery = this.insertTypeormMetadataSql({
					table: newTable.name,
					type: MetadataTableType.GENERATED_COLUMN,
					name: column.name,
					value: column.asExpression,
				});

				const deleteQuery = this.deleteTypeormMetadataSql({
					table: newTable.name,
					type: MetadataTableType.GENERATED_COLUMN,
					name: column.name,
				});

				upQueries.push(insertQuery);
				downQueries.push(deleteQuery);
			});

		// Step 3: update changed expressions
		newTable.columns
			.filter((column) => column.generatedType && column.asExpression)
			.forEach((column) => {
				const oldColumn = oldTable.columns.find(
					(c) =>
						c.name === column.name &&
						c.generatedType &&
						column.generatedType &&
						c.asExpression !== column.asExpression,
				);

				if (!oldColumn) return;

				// update expression
				const deleteQuery = this.deleteTypeormMetadataSql({
					table: oldTable.name,
					type: MetadataTableType.GENERATED_COLUMN,
					name: oldColumn.name,
				});

				const insertQuery = this.insertTypeormMetadataSql({
					table: newTable.name,
					type: MetadataTableType.GENERATED_COLUMN,
					name: column.name,
					value: column.asExpression,
				});

				upQueries.push(deleteQuery);
				upQueries.push(insertQuery);

				// revert update
				const revertInsertQuery = this.insertTypeormMetadataSql({
					table: newTable.name,
					type: MetadataTableType.GENERATED_COLUMN,
					name: oldColumn.name,
					value: oldColumn.asExpression,
				});

				const revertDeleteQuery = this.deleteTypeormMetadataSql({
					table: oldTable.name,
					type: MetadataTableType.GENERATED_COLUMN,
					name: column.name,
				});

				downQueries.push(revertInsertQuery);
				downQueries.push(revertDeleteQuery);
			});

		await this.executeQueries(upQueries, downQueries);
		this.replaceCachedTable(oldTable, newTable);
	}

	/**
	 * tablePath e.g. "myDB.myTable", "myTable"
	 */
	protected splitTablePath(tablePath: string): [string | undefined, string] {
		return (tablePath.indexOf('.') !== -1 ? tablePath.split('.') : [undefined, tablePath]) as [
			string | undefined,
			string,
		];
	}

	/**
	 * Escapes given table or view path. Tolerates leading/trailing dots
	 */
	protected escapePath(target: Table | View | string, disableEscape?: boolean): string {
		const tableName =
			InstanceChecker.isTable(target) || InstanceChecker.isView(target) ? target.name : target;
		return tableName
			.replace(/^\.+|\.+$/g, '')
			.split('.')
			.map((i) => (disableEscape ? i : `"${i.replace(/"/g, '""')}"`))
			.join('.');
	}

	/**
	 * Change table comment.
	 */
	changeTableComment(tableOrName: Table | string, comment?: string): Promise<void> {
		throw new TypeORMError(`sqlit driver does not support change comment.`);
	}
}
