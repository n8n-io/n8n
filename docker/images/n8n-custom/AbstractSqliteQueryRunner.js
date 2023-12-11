'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.AbstractSqliteQueryRunner = void 0;
const TransactionNotStartedError_1 = require('../../error/TransactionNotStartedError');
const TableColumn_1 = require('../../schema-builder/table/TableColumn');
const Table_1 = require('../../schema-builder/table/Table');
const TableIndex_1 = require('../../schema-builder/table/TableIndex');
const TableForeignKey_1 = require('../../schema-builder/table/TableForeignKey');
const View_1 = require('../../schema-builder/view/View');
const Query_1 = require('../Query');
const TableUnique_1 = require('../../schema-builder/table/TableUnique');
const BaseQueryRunner_1 = require('../../query-runner/BaseQueryRunner');
const OrmUtils_1 = require('../../util/OrmUtils');
const TableCheck_1 = require('../../schema-builder/table/TableCheck');
const error_1 = require('../../error');
const MetadataTableType_1 = require('../types/MetadataTableType');
const InstanceChecker_1 = require('../../util/InstanceChecker');

function formatStack() {
	const stack = new Error().stack;
	return stack
		.split('\n')
		.slice(1)
		.map((line) => {
			return line
				.replace(/ \(.*\)/g, '')
				.replace(/at \/.*/g, '')
				.replace(/at /g, '')
				.trim();
		})
		.join(', ');
}

/**
 * Runs queries on a single sqlite database connection.
 */
class AbstractSqliteQueryRunner extends BaseQueryRunner_1.BaseQueryRunner {
	// -------------------------------------------------------------------------
	// Constructor
	// -------------------------------------------------------------------------
	constructor() {
		super();
		this.transactionPromise = null;
	}
	// -------------------------------------------------------------------------
	// Public Methods
	// -------------------------------------------------------------------------
	/**
	 * Creates/uses database connection from the connection pool to perform further operations.
	 * Returns obtained database connection.
	 */
	connect() {
		return Promise.resolve(this.driver.databaseConnection);
	}
	/**
	 * Releases used database connection.
	 * We just clear loaded tables and sql in memory, because sqlite do not support multiple connections thus query runners.
	 */
	release() {
		this.loadedTables = [];
		this.clearSqlMemory();
		return Promise.resolve();
	}
	/**
	 * Starts transaction.
	 */
	async startTransaction(isolationLevel) {
		console.log('[startTransaction]', this.transactionDepth, formatStack());
		if (this.driver.transactionSupport === 'none')
			throw new error_1.TypeORMError(
				`Transactions aren't supported by ${this.connection.driver.options.type}.`,
			);
		if (this.isTransactionActive && this.driver.transactionSupport === 'simple')
			throw new error_1.TransactionAlreadyStartedError();
		if (
			isolationLevel &&
			isolationLevel !== 'READ UNCOMMITTED' &&
			isolationLevel !== 'SERIALIZABLE'
		)
			throw new error_1.TypeORMError(
				`SQLite only supports SERIALIZABLE and READ UNCOMMITTED isolation`,
			);
		this.isTransactionActive = true;
		try {
			await this.broadcaster.broadcast('BeforeTransactionStart');
		} catch (err) {
			this.isTransactionActive = false;
			throw err;
		}
		if (this.transactionDepth === 0) {
			if (isolationLevel) {
				if (isolationLevel === 'READ UNCOMMITTED') {
					await this.query('PRAGMA read_uncommitted = true');
				} else {
					await this.query('PRAGMA read_uncommitted = false');
				}
			}
			await this.query('BEGIN TRANSACTION');
		} else {
			await this.query(`SAVEPOINT typeorm_${this.transactionDepth}`);
		}
		this.transactionDepth += 1;
		await this.broadcaster.broadcast('AfterTransactionStart');
	}
	/**
	 * Commits transaction.
	 * Error will be thrown if transaction was not started.
	 */
	async commitTransaction() {
		console.log('[commitTransaction]', this.transactionDepth, formatStack());
		if (!this.isTransactionActive)
			throw new TransactionNotStartedError_1.TransactionNotStartedError();
		await this.broadcaster.broadcast('BeforeTransactionCommit');
		if (this.transactionDepth > 1) {
			await this.query(`RELEASE SAVEPOINT typeorm_${this.transactionDepth - 1}`);
		} else {
			await this.query('COMMIT');
			this.isTransactionActive = false;
		}
		this.transactionDepth -= 1;
		await this.broadcaster.broadcast('AfterTransactionCommit');
	}
	/**
	 * Rollbacks transaction.
	 * Error will be thrown if transaction was not started.
	 */
	async rollbackTransaction() {
		console.log('[rollbackTransaction]', this.transactionDepth, formatStack());
		if (!this.isTransactionActive)
			throw new TransactionNotStartedError_1.TransactionNotStartedError();
		await this.broadcaster.broadcast('BeforeTransactionRollback');
		if (this.transactionDepth > 1) {
			await this.query(`ROLLBACK TO SAVEPOINT typeorm_${this.transactionDepth - 1}`);
		} else {
			await this.query('ROLLBACK');
			this.isTransactionActive = false;
		}
		this.transactionDepth -= 1;
		await this.broadcaster.broadcast('AfterTransactionRollback');
	}
	/**
	 * Returns raw data stream.
	 */
	stream(query, parameters, onEnd, onError) {
		throw new error_1.TypeORMError(`Stream is not supported by sqlite driver.`);
	}
	/**
	 * Returns all available database names including system databases.
	 */
	async getDatabases() {
		return Promise.resolve([]);
	}
	/**
	 * Returns all available schema names including system schemas.
	 * If database parameter specified, returns schemas of that database.
	 */
	async getSchemas(database) {
		return Promise.resolve([]);
	}
	/**
	 * Checks if database with the given name exist.
	 */
	async hasDatabase(database) {
		return Promise.resolve(false);
	}
	/**
	 * Loads currently using database
	 */
	async getCurrentDatabase() {
		return Promise.resolve(undefined);
	}
	/**
	 * Checks if schema with the given name exist.
	 */
	async hasSchema(schema) {
		throw new error_1.TypeORMError(`This driver does not support table schemas`);
	}
	/**
	 * Loads currently using database schema
	 */
	async getCurrentSchema() {
		return Promise.resolve(undefined);
	}
	/**
	 * Checks if table with the given name exist in the database.
	 */
	async hasTable(tableOrName) {
		const tableName = InstanceChecker_1.InstanceChecker.isTable(tableOrName)
			? tableOrName.name
			: tableOrName;
		const sql = `SELECT * FROM "sqlite_master" WHERE "type" = 'table' AND "name" = '${tableName}'`;
		const result = await this.query(sql);
		return result.length ? true : false;
	}
	/**
	 * Checks if column with the given name exist in the given table.
	 */
	async hasColumn(tableOrName, columnName) {
		const tableName = InstanceChecker_1.InstanceChecker.isTable(tableOrName)
			? tableOrName.name
			: tableOrName;
		const sql = `PRAGMA table_xinfo(${this.escapePath(tableName)})`;
		const columns = await this.query(sql);
		return !!columns.find((column) => column['name'] === columnName);
	}
	/**
	 * Creates a new database.
	 */
	async createDatabase(database, ifNotExist) {
		return Promise.resolve();
	}
	/**
	 * Drops database.
	 */
	async dropDatabase(database, ifExist) {
		return Promise.resolve();
	}
	/**
	 * Creates a new table schema.
	 */
	async createSchema(schemaPath, ifNotExist) {
		return Promise.resolve();
	}
	/**
	 * Drops table schema.
	 */
	async dropSchema(schemaPath, ifExist) {
		return Promise.resolve();
	}
	/**
	 * Creates a new table.
	 */
	async createTable(table, ifNotExist = false, createForeignKeys = true, createIndices = true) {
		const upQueries = [];
		const downQueries = [];
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
				type: MetadataTableType_1.MetadataTableType.GENERATED_COLUMN,
				name: column.name,
				value: column.asExpression,
			});
			const deleteQuery = this.deleteTypeormMetadataSql({
				table: table.name,
				type: MetadataTableType_1.MetadataTableType.GENERATED_COLUMN,
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
	async dropTable(tableOrName, ifExist, dropForeignKeys = true, dropIndices = true) {
		if (ifExist) {
			const isTableExist = await this.hasTable(tableOrName);
			if (!isTableExist) return Promise.resolve();
		}
		// if dropTable called with dropForeignKeys = true, we must create foreign keys in down query.
		const createForeignKeys = dropForeignKeys;
		const table = InstanceChecker_1.InstanceChecker.isTable(tableOrName)
			? tableOrName
			: await this.getCachedTable(tableOrName);
		const upQueries = [];
		const downQueries = [];
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
				type: MetadataTableType_1.MetadataTableType.GENERATED_COLUMN,
				name: column.name,
			});
			const insertQuery = this.insertTypeormMetadataSql({
				table: table.name,
				type: MetadataTableType_1.MetadataTableType.GENERATED_COLUMN,
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
	async createView(view, syncWithMetadata = false) {
		const upQueries = [];
		const downQueries = [];
		upQueries.push(this.createViewSql(view));
		if (syncWithMetadata) upQueries.push(this.insertViewDefinitionSql(view));
		downQueries.push(this.dropViewSql(view));
		if (syncWithMetadata) downQueries.push(this.deleteViewDefinitionSql(view));
		await this.executeQueries(upQueries, downQueries);
	}
	/**
	 * Drops the view.
	 */
	async dropView(target) {
		const viewName = InstanceChecker_1.InstanceChecker.isView(target) ? target.name : target;
		const view = await this.getCachedView(viewName);
		const upQueries = [];
		const downQueries = [];
		upQueries.push(this.deleteViewDefinitionSql(view));
		upQueries.push(this.dropViewSql(view));
		downQueries.push(this.insertViewDefinitionSql(view));
		downQueries.push(this.createViewSql(view));
		await this.executeQueries(upQueries, downQueries);
	}
	/**
	 * Renames the given table.
	 */
	async renameTable(oldTableOrName, newTableName) {
		const oldTable = InstanceChecker_1.InstanceChecker.isTable(oldTableOrName)
			? oldTableOrName
			: await this.getCachedTable(oldTableOrName);
		const newTable = oldTable.clone();
		newTable.name = newTableName;
		// rename table
		const up = new Query_1.Query(
			`ALTER TABLE ${this.escapePath(oldTable.name)} RENAME TO ${this.escapePath(newTableName)}`,
		);
		const down = new Query_1.Query(
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
	async addColumn(tableOrName, column) {
		const table = InstanceChecker_1.InstanceChecker.isTable(tableOrName)
			? tableOrName
			: await this.getCachedTable(tableOrName);
		return this.addColumns(table, [column]);
	}
	/**
	 * Creates a new columns from the column in the table.
	 */
	async addColumns(tableOrName, columns) {
		const table = InstanceChecker_1.InstanceChecker.isTable(tableOrName)
			? tableOrName
			: await this.getCachedTable(tableOrName);
		const changedTable = table.clone();
		columns.forEach((column) => changedTable.addColumn(column));
		await this.recreateTable(changedTable, table);
	}
	/**
	 * Renames column in the given table.
	 */
	async renameColumn(tableOrName, oldTableColumnOrName, newTableColumnOrName) {
		const table = InstanceChecker_1.InstanceChecker.isTable(tableOrName)
			? tableOrName
			: await this.getCachedTable(tableOrName);
		const oldColumn = InstanceChecker_1.InstanceChecker.isTableColumn(oldTableColumnOrName)
			? oldTableColumnOrName
			: table.columns.find((c) => c.name === oldTableColumnOrName);
		if (!oldColumn)
			throw new error_1.TypeORMError(
				`Column "${oldTableColumnOrName}" was not found in the "${table.name}" table.`,
			);
		let newColumn = undefined;
		if (InstanceChecker_1.InstanceChecker.isTableColumn(newTableColumnOrName)) {
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
	async changeColumn(tableOrName, oldTableColumnOrName, newColumn) {
		const table = InstanceChecker_1.InstanceChecker.isTable(tableOrName)
			? tableOrName
			: await this.getCachedTable(tableOrName);
		const oldColumn = InstanceChecker_1.InstanceChecker.isTableColumn(oldTableColumnOrName)
			? oldTableColumnOrName
			: table.columns.find((c) => c.name === oldTableColumnOrName);
		if (!oldColumn)
			throw new error_1.TypeORMError(
				`Column "${oldTableColumnOrName}" was not found in the "${table.name}" table.`,
			);
		await this.changeColumns(table, [{ oldColumn, newColumn }]);
	}
	/**
	 * Changes a column in the table.
	 * Changed column looses all its keys in the db.
	 */
	async changeColumns(tableOrName, changedColumns) {
		const table = InstanceChecker_1.InstanceChecker.isTable(tableOrName)
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
	async dropColumn(tableOrName, columnOrName) {
		const table = InstanceChecker_1.InstanceChecker.isTable(tableOrName)
			? tableOrName
			: await this.getCachedTable(tableOrName);
		const column = InstanceChecker_1.InstanceChecker.isTableColumn(columnOrName)
			? columnOrName
			: table.findColumnByName(columnOrName);
		if (!column)
			throw new error_1.TypeORMError(
				`Column "${columnOrName}" was not found in table "${table.name}"`,
			);
		await this.dropColumns(table, [column]);
	}
	/**
	 * Drops the columns in the table.
	 */
	async dropColumns(tableOrName, columns) {
		const table = InstanceChecker_1.InstanceChecker.isTable(tableOrName)
			? tableOrName
			: await this.getCachedTable(tableOrName);
		// clone original table and remove column and its constraints from cloned table
		const changedTable = table.clone();
		columns.forEach((column) => {
			const columnInstance = InstanceChecker_1.InstanceChecker.isTableColumn(column)
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
	async createPrimaryKey(tableOrName, columnNames) {
		const table = InstanceChecker_1.InstanceChecker.isTable(tableOrName)
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
	async updatePrimaryKeys(tableOrName, columns) {
		await Promise.resolve();
	}
	/**
	 * Drops a primary key.
	 */
	async dropPrimaryKey(tableOrName) {
		const table = InstanceChecker_1.InstanceChecker.isTable(tableOrName)
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
	async createUniqueConstraint(tableOrName, uniqueConstraint) {
		await this.createUniqueConstraints(tableOrName, [uniqueConstraint]);
	}
	/**
	 * Creates a new unique constraints.
	 */
	async createUniqueConstraints(tableOrName, uniqueConstraints) {
		const table = InstanceChecker_1.InstanceChecker.isTable(tableOrName)
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
	async dropUniqueConstraint(tableOrName, uniqueOrName) {
		const table = InstanceChecker_1.InstanceChecker.isTable(tableOrName)
			? tableOrName
			: await this.getCachedTable(tableOrName);
		const uniqueConstraint = InstanceChecker_1.InstanceChecker.isTableUnique(uniqueOrName)
			? uniqueOrName
			: table.uniques.find((u) => u.name === uniqueOrName);
		if (!uniqueConstraint)
			throw new error_1.TypeORMError(
				`Supplied unique constraint was not found in table ${table.name}`,
			);
		await this.dropUniqueConstraints(table, [uniqueConstraint]);
	}
	/**
	 * Creates an unique constraints.
	 */
	async dropUniqueConstraints(tableOrName, uniqueConstraints) {
		const table = InstanceChecker_1.InstanceChecker.isTable(tableOrName)
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
	async createCheckConstraint(tableOrName, checkConstraint) {
		await this.createCheckConstraints(tableOrName, [checkConstraint]);
	}
	/**
	 * Creates new check constraints.
	 */
	async createCheckConstraints(tableOrName, checkConstraints) {
		const table = InstanceChecker_1.InstanceChecker.isTable(tableOrName)
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
	async dropCheckConstraint(tableOrName, checkOrName) {
		const table = InstanceChecker_1.InstanceChecker.isTable(tableOrName)
			? tableOrName
			: await this.getCachedTable(tableOrName);
		const checkConstraint = InstanceChecker_1.InstanceChecker.isTableCheck(checkOrName)
			? checkOrName
			: table.checks.find((c) => c.name === checkOrName);
		if (!checkConstraint)
			throw new error_1.TypeORMError(
				`Supplied check constraint was not found in table ${table.name}`,
			);
		await this.dropCheckConstraints(table, [checkConstraint]);
	}
	/**
	 * Drops check constraints.
	 */
	async dropCheckConstraints(tableOrName, checkConstraints) {
		const table = InstanceChecker_1.InstanceChecker.isTable(tableOrName)
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
	async createExclusionConstraint(tableOrName, exclusionConstraint) {
		throw new error_1.TypeORMError(`Sqlite does not support exclusion constraints.`);
	}
	/**
	 * Creates a new exclusion constraints.
	 */
	async createExclusionConstraints(tableOrName, exclusionConstraints) {
		throw new error_1.TypeORMError(`Sqlite does not support exclusion constraints.`);
	}
	/**
	 * Drops exclusion constraint.
	 */
	async dropExclusionConstraint(tableOrName, exclusionOrName) {
		throw new error_1.TypeORMError(`Sqlite does not support exclusion constraints.`);
	}
	/**
	 * Drops exclusion constraints.
	 */
	async dropExclusionConstraints(tableOrName, exclusionConstraints) {
		throw new error_1.TypeORMError(`Sqlite does not support exclusion constraints.`);
	}
	/**
	 * Creates a new foreign key.
	 */
	async createForeignKey(tableOrName, foreignKey) {
		await this.createForeignKeys(tableOrName, [foreignKey]);
	}
	/**
	 * Creates a new foreign keys.
	 */
	async createForeignKeys(tableOrName, foreignKeys) {
		const table = InstanceChecker_1.InstanceChecker.isTable(tableOrName)
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
	async dropForeignKey(tableOrName, foreignKeyOrName) {
		const table = InstanceChecker_1.InstanceChecker.isTable(tableOrName)
			? tableOrName
			: await this.getCachedTable(tableOrName);
		const foreignKey = InstanceChecker_1.InstanceChecker.isTableForeignKey(foreignKeyOrName)
			? foreignKeyOrName
			: table.foreignKeys.find((fk) => fk.name === foreignKeyOrName);
		if (!foreignKey)
			throw new error_1.TypeORMError(`Supplied foreign key was not found in table ${table.name}`);
		await this.dropForeignKeys(tableOrName, [foreignKey]);
	}
	/**
	 * Drops a foreign keys from the table.
	 */
	async dropForeignKeys(tableOrName, foreignKeys) {
		const table = InstanceChecker_1.InstanceChecker.isTable(tableOrName)
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
	async createIndex(tableOrName, index) {
		const table = InstanceChecker_1.InstanceChecker.isTable(tableOrName)
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
	async createIndices(tableOrName, indices) {
		const promises = indices.map((index) => this.createIndex(tableOrName, index));
		await Promise.all(promises);
	}
	/**
	 * Drops an index from the table.
	 */
	async dropIndex(tableOrName, indexOrName) {
		const table = InstanceChecker_1.InstanceChecker.isTable(tableOrName)
			? tableOrName
			: await this.getCachedTable(tableOrName);
		const index = InstanceChecker_1.InstanceChecker.isTableIndex(indexOrName)
			? indexOrName
			: table.indices.find((i) => i.name === indexOrName);
		if (!index)
			throw new error_1.TypeORMError(
				`Supplied index ${indexOrName} was not found in table ${table.name}`,
			);
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
	async dropIndices(tableOrName, indices) {
		const promises = indices.map((index) => this.dropIndex(tableOrName, index));
		await Promise.all(promises);
	}
	/**
	 * Clears all table contents.
	 * Note: this operation uses SQL's TRUNCATE query which cannot be reverted in transactions.
	 */
	async clearTable(tableName) {
		await this.query(`DELETE FROM ${this.escapePath(tableName)}`);
	}
	/**
	 * Removes all tables from the currently connected database.
	 */
	async clearDatabase(database) {
		let dbPath = undefined;
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
			const dropViewQueries = await this.query(selectViewDropsQuery);
			await Promise.all(dropViewQueries.map((q) => this.query(q['query'])));
			const selectTableDropsQuery = dbPath
				? `SELECT 'DROP TABLE "${dbPath}"."' || name || '";' as query FROM "${dbPath}"."sqlite_master" WHERE "type" = 'table' AND "name" != 'sqlite_sequence'`
				: `SELECT 'DROP TABLE "' || name || '";' as query FROM "sqlite_master" WHERE "type" = 'table' AND "name" != 'sqlite_sequence'`;
			const dropTableQueries = await this.query(selectTableDropsQuery);
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
	async loadViews(viewNames) {
		const hasTable = await this.hasTable(this.getTypeormMetadataTableName());
		if (!hasTable) {
			return [];
		}
		if (!viewNames) {
			viewNames = [];
		}
		const viewNamesString = viewNames.map((name) => "'" + name + "'").join(', ');
		let query = `SELECT "t".* FROM "${this.getTypeormMetadataTableName()}" "t" INNER JOIN "sqlite_master" s ON "s"."name" = "t"."name" AND "s"."type" = 'view' WHERE "t"."type" = '${
			MetadataTableType_1.MetadataTableType.VIEW
		}'`;
		if (viewNamesString.length > 0) query += ` AND "t"."name" IN (${viewNamesString})`;
		const dbViews = await this.query(query);
		return dbViews.map((dbView) => {
			const view = new View_1.View();
			view.name = dbView['name'];
			view.expression = dbView['value'];
			return view;
		});
	}
	async loadTableRecords(tablePath, tableOrIndex) {
		let database = undefined;
		const [schema, tableName] = this.splitTablePath(tablePath);
		if (schema && this.driver.getAttachedDatabasePathRelativeByHandle(schema)) {
			database = this.driver.getAttachedDatabasePathRelativeByHandle(schema);
		}
		return this.query(
			`SELECT ${database ? `'${database}'` : null} as database, ${
				schema ? `'${schema}'` : null
			} as schema, * FROM ${schema ? `"${schema}".` : ''}${this.escapePath(
				`sqlite_master`,
			)} WHERE "type" = '${tableOrIndex}' AND "${
				tableOrIndex === 'table' ? 'name' : 'tbl_name'
			}" IN ('${tableName}')`,
		);
	}
	async loadPragmaRecords(tablePath, pragma) {
		const [, tableName] = this.splitTablePath(tablePath);
		return this.query(`PRAGMA ${pragma}("${tableName}")`);
	}
	/**
	 * Loads all tables (with given names) from the database and creates a Table from them.
	 */
	async loadTables(tableNames) {
		// if no tables given then no need to proceed
		if (tableNames && tableNames.length === 0) {
			return [];
		}
		let dbTables = [];
		let dbIndicesDef;
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
				.map((tableName) => `'${tableName}'`);
			const tableNamesWithDot = tableNames.filter((tableName) => {
				return tableName.split('.').length > 1;
			});
			const queryPromises = (type) => {
				const promises = [
					...tableNamesWithDot.map((tableName) => this.loadTableRecords(tableName, type)),
				];
				if (tableNamesWithoutDot.length) {
					promises.push(
						this.query(
							`SELECT * FROM "sqlite_master" WHERE "type" = '${type}' AND "${
								type === 'table' ? 'name' : 'tbl_name'
							}" IN (${tableNamesWithoutDot})`,
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
						? `${this.driver.getAttachedDatabaseHandleByRelativePath(dbTable['database'])}.${
								dbTable['name']
						  }`
						: dbTable['name'];
				const sql = dbTable['sql'];
				const withoutRowid = sql.includes('WITHOUT ROWID');
				const table = new Table_1.Table({ name: tablePath, withoutRowid });
				// load columns and indices
				const [dbColumns, dbIndices, dbForeignKeys] = await Promise.all([
					this.loadPragmaRecords(tablePath, `table_xinfo`),
					this.loadPragmaRecords(tablePath, `index_list`),
					this.loadPragmaRecords(tablePath, `foreign_key_list`),
				]);
				// find column name with auto increment
				let autoIncrementColumnName = undefined;
				const tableSql = dbTable['sql'];
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
						const tableColumn = new TableColumn_1.TableColumn();
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
							const asExpressionQuery = await this.selectTypeormMetadataSql({
								table: table.name,
								type: MetadataTableType_1.MetadataTableType.GENERATED_COLUMN,
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
							// Check if this is an enum
							const enumMatch = sql.match(
								new RegExp(
									'"(' +
										tableColumn.name +
										")\" varchar CHECK\\s*\\(\\s*\"\\1\"\\s+IN\\s*\\(('[^']+'(?:\\s*,\\s*'[^']+')+)\\s*\\)\\s*\\)",
								),
							);
							if (enumMatch) {
								// This is an enum
								tableColumn.enum = enumMatch[2].substr(1, enumMatch[2].length - 2).split("','");
							}
						}
						// parse datatype and attempt to retrieve length, precision and scale
						let pos = tableColumn.type.indexOf('(');
						if (pos !== -1) {
							const fullType = tableColumn.type;
							let dataType = fullType.substr(0, pos);
							if (!!this.driver.withLengthColumnTypes.find((col) => col === dataType)) {
								let len = parseInt(fullType.substring(pos + 1, fullType.length - 1));
								if (len) {
									tableColumn.length = len.toString();
									tableColumn.type = dataType; // remove the length part from the datatype
								}
							}
							if (!!this.driver.withPrecisionColumnTypes.find((col) => col === dataType)) {
								const re = new RegExp(`^${dataType}\\((\\d+),?\\s?(\\d+)?\\)`);
								const matches = fullType.match(re);
								if (matches && matches[1]) {
									tableColumn.precision = +matches[1];
								}
								if (!!this.driver.withScaleColumnTypes.find((col) => col === dataType)) {
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
				const fkMappings = [];
				const fkRegex = /CONSTRAINT "([^"]*)" FOREIGN KEY ?\((.*?)\) REFERENCES "([^"]*)"/g;
				while ((fkResult = fkRegex.exec(sql)) !== null) {
					fkMappings.push({
						name: fkResult[1],
						columns: fkResult[2].substr(1, fkResult[2].length - 2).split(`", "`),
						referencedTableName: fkResult[3],
					});
				}
				// build foreign keys
				const tableForeignKeyConstraints = OrmUtils_1.OrmUtils.uniq(
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
					return new TableForeignKey_1.TableForeignKey({
						name: fkMapping === null || fkMapping === void 0 ? void 0 : fkMapping.name,
						columnNames: columnNames,
						referencedTableName: foreignKey['table'],
						referencedColumnNames: referencedColumnNames,
						onDelete: foreignKey['on_delete'],
						onUpdate: foreignKey['on_update'],
					});
				});
				// find unique constraints from CREATE TABLE sql
				let uniqueRegexResult;
				const uniqueMappings = [];
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
						const indexInfos = await this.query(`PRAGMA index_info("${dbIndex['name']}")`);
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
							return mapping.columns.every((column) => indexColumns.indexOf(column) !== -1);
						});
						return new TableUnique_1.TableUnique({
							name: foundMapping
								? foundMapping.name
								: this.connection.namingStrategy.uniqueConstraintName(table, indexColumns),
							columnNames: indexColumns,
						});
					});
				table.uniques = await Promise.all(tableUniquePromises);
				// build checks
				let result;
				const regexp = /CONSTRAINT "([^"]*)" CHECK ?(\(.*?\))([,]|[)]$)/g;
				while ((result = regexp.exec(sql)) !== null) {
					table.checks.push(
						new TableCheck_1.TableCheck({
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
						const condition = /WHERE (.*)/.exec(indexDef['sql']);
						const dbIndex = dbIndices.find((dbIndex) => dbIndex['name'] === dbIndexName);
						const indexInfos = await this.query(`PRAGMA index_info("${dbIndex['name']}")`);
						const indexColumns = indexInfos
							.sort(
								(indexInfo1, indexInfo2) =>
									parseInt(indexInfo1['seqno']) - parseInt(indexInfo2['seqno']),
							)
							.map((indexInfo) => indexInfo['name']);
						const dbIndexPath = `${dbTable['database'] ? `${dbTable['database']}.` : ''}${
							dbIndex['name']
						}`;
						const isUnique = dbIndex['unique'] === '1' || dbIndex['unique'] === 1;
						return new TableIndex_1.TableIndex({
							table: table,
							name: dbIndexPath,
							columnNames: indexColumns,
							isUnique: isUnique,
							where: condition ? condition[1] : undefined,
						});
					});
				const indices = await Promise.all(indicesPromises);
				table.indices = indices.filter((index) => !!index);
				return table;
			}),
		);
	}
	/**
	 * Builds create table sql.
	 */
	createTableSql(table, createForeignKeys, temporaryTable) {
		const primaryColumns = table.columns.filter((column) => column.isPrimary);
		const hasAutoIncrement = primaryColumns.find(
			(column) => column.isGenerated && column.generationStrategy === 'increment',
		);
		const skipPrimary = primaryColumns.length > 1;
		if (skipPrimary && hasAutoIncrement)
			throw new error_1.TypeORMError(
				`Sqlite does not support AUTOINCREMENT on composite primary key`,
			);
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
						new TableUnique_1.TableUnique({
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
						: this.connection.namingStrategy.checkConstraintName(newTableName, check.expression);
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
		return new Query_1.Query(sql);
	}
	/**
	 * Builds drop table sql.
	 */
	dropTableSql(tableOrName, ifExist) {
		const tableName = InstanceChecker_1.InstanceChecker.isTable(tableOrName)
			? tableOrName.name
			: tableOrName;
		const query = ifExist
			? `DROP TABLE IF EXISTS ${this.escapePath(tableName)}`
			: `DROP TABLE ${this.escapePath(tableName)}`;
		return new Query_1.Query(query);
	}
	createViewSql(view) {
		if (typeof view.expression === 'string') {
			return new Query_1.Query(`CREATE VIEW "${view.name}" AS ${view.expression}`);
		} else {
			return new Query_1.Query(
				`CREATE VIEW "${view.name}" AS ${view.expression(this.connection).getQuery()}`,
			);
		}
	}
	insertViewDefinitionSql(view) {
		const expression =
			typeof view.expression === 'string'
				? view.expression.trim()
				: view.expression(this.connection).getQuery();
		return this.insertTypeormMetadataSql({
			type: MetadataTableType_1.MetadataTableType.VIEW,
			name: view.name,
			value: expression,
		});
	}
	/**
	 * Builds drop view sql.
	 */
	dropViewSql(viewOrPath) {
		const viewName = InstanceChecker_1.InstanceChecker.isView(viewOrPath)
			? viewOrPath.name
			: viewOrPath;
		return new Query_1.Query(`DROP VIEW "${viewName}"`);
	}
	/**
	 * Builds remove view sql.
	 */
	deleteViewDefinitionSql(viewOrPath) {
		const viewName = InstanceChecker_1.InstanceChecker.isView(viewOrPath)
			? viewOrPath.name
			: viewOrPath;
		return this.deleteTypeormMetadataSql({
			type: MetadataTableType_1.MetadataTableType.VIEW,
			name: viewName,
		});
	}
	/**
	 * Builds create index sql.
	 */
	createIndexSql(table, index) {
		const columns = index.columnNames.map((columnName) => `"${columnName}"`).join(', ');
		const [database, tableName] = this.splitTablePath(table.name);
		return new Query_1.Query(
			`CREATE ${index.isUnique ? 'UNIQUE ' : ''}INDEX ${
				database ? `"${database}".` : ''
			}${this.escapePath(index.name)} ON "${tableName}" (${columns}) ${
				index.where ? 'WHERE ' + index.where : ''
			}`,
		);
	}
	/**
	 * Builds drop index sql.
	 */
	dropIndexSql(indexOrName) {
		let indexName = InstanceChecker_1.InstanceChecker.isTableIndex(indexOrName)
			? indexOrName.name
			: indexOrName;
		return new Query_1.Query(`DROP INDEX ${this.escapePath(indexName)}`);
	}
	/**
	 * Builds a query for create column.
	 */
	buildCreateColumnSql(column, skipPrimary) {
		let c = '"' + column.name + '"';
		if (InstanceChecker_1.InstanceChecker.isColumnMetadata(column)) {
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
	async recreateTable(newTable, oldTable, migrateData = true) {
		const upQueries = [];
		const downQueries = [];
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
				new Query_1.Query(
					`INSERT INTO ${this.escapePath(newTable.name)}(${newColumnNames.join(
						', ',
					)}) SELECT ${oldColumnNames.join(', ')} FROM ${this.escapePath(oldTable.name)}`,
				),
			);
			downQueries.push(
				new Query_1.Query(
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
			new Query_1.Query(
				`ALTER TABLE ${this.escapePath(newTable.name)} RENAME TO ${this.escapePath(tableNameOld)}`,
			),
		);
		downQueries.push(
			new Query_1.Query(
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
					type: MetadataTableType_1.MetadataTableType.GENERATED_COLUMN,
					name: column.name,
				});
				const insertQuery = this.insertTypeormMetadataSql({
					table: oldTable.name,
					type: MetadataTableType_1.MetadataTableType.GENERATED_COLUMN,
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
					type: MetadataTableType_1.MetadataTableType.GENERATED_COLUMN,
					name: column.name,
					value: column.asExpression,
				});
				const deleteQuery = this.deleteTypeormMetadataSql({
					table: newTable.name,
					type: MetadataTableType_1.MetadataTableType.GENERATED_COLUMN,
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
					type: MetadataTableType_1.MetadataTableType.GENERATED_COLUMN,
					name: oldColumn.name,
				});
				const insertQuery = this.insertTypeormMetadataSql({
					table: newTable.name,
					type: MetadataTableType_1.MetadataTableType.GENERATED_COLUMN,
					name: column.name,
					value: column.asExpression,
				});
				upQueries.push(deleteQuery);
				upQueries.push(insertQuery);
				// revert update
				const revertInsertQuery = this.insertTypeormMetadataSql({
					table: newTable.name,
					type: MetadataTableType_1.MetadataTableType.GENERATED_COLUMN,
					name: oldColumn.name,
					value: oldColumn.asExpression,
				});
				const revertDeleteQuery = this.deleteTypeormMetadataSql({
					table: oldTable.name,
					type: MetadataTableType_1.MetadataTableType.GENERATED_COLUMN,
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
	splitTablePath(tablePath) {
		return tablePath.indexOf('.') !== -1 ? tablePath.split('.') : [undefined, tablePath];
	}
	/**
	 * Escapes given table or view path. Tolerates leading/trailing dots
	 */
	escapePath(target, disableEscape) {
		const tableName =
			InstanceChecker_1.InstanceChecker.isTable(target) ||
			InstanceChecker_1.InstanceChecker.isView(target)
				? target.name
				: target;
		return tableName
			.replace(/^\.+|\.+$/g, '')
			.split('.')
			.map((i) => (disableEscape ? i : `"${i}"`))
			.join('.');
	}
}
exports.AbstractSqliteQueryRunner = AbstractSqliteQueryRunner;

//# sourceMappingURL=AbstractSqliteQueryRunner.js.map
