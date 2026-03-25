const require_rolldown_runtime = require('./_virtual/rolldown_runtime.cjs');
const require_sql_utils = require('./util/sql_utils.cjs');
const __langchain_core_load_serializable = require_rolldown_runtime.__toESM(require("@langchain/core/load/serializable"));

//#region src/sql_db.ts
var sql_db_exports = {};
require_rolldown_runtime.__export(sql_db_exports, { SqlDatabase: () => SqlDatabase });
/**
* Class that represents a SQL database in the LangChain framework.
*
* @security **Security Notice**
* This class generates SQL queries for the given database.
* The SQLDatabase class provides a getTableInfo method that can be used
* to get column information as well as sample data from the table.
* To mitigate risk of leaking sensitive data, limit permissions
* to read and scope to the tables that are needed.
* Optionally, use the includesTables or ignoreTables class parameters
* to limit which tables can/cannot be accessed.
*
* @link See https://js.langchain.com/docs/security for more information.
*/
var SqlDatabase = class SqlDatabase extends __langchain_core_load_serializable.Serializable {
	lc_namespace = ["langchain", "sql_db"];
	toJSON() {
		return this.toJSONNotImplemented();
	}
	appDataSourceOptions;
	appDataSource;
	allTables = [];
	includesTables = [];
	ignoreTables = [];
	sampleRowsInTableInfo = 3;
	customDescription;
	constructor(fields) {
		super(...arguments);
		this.appDataSource = fields.appDataSource;
		this.appDataSourceOptions = fields.appDataSource.options;
		if (fields?.includesTables && fields?.ignoreTables) throw new Error("Cannot specify both includeTables and ignoreTables");
		this.includesTables = fields?.includesTables ?? [];
		this.ignoreTables = fields?.ignoreTables ?? [];
		this.sampleRowsInTableInfo = fields?.sampleRowsInTableInfo ?? this.sampleRowsInTableInfo;
	}
	static async fromDataSourceParams(fields) {
		const sqlDatabase = new SqlDatabase(fields);
		if (!sqlDatabase.appDataSource.isInitialized) await sqlDatabase.appDataSource.initialize();
		sqlDatabase.allTables = await require_sql_utils.getTableAndColumnsName(sqlDatabase.appDataSource);
		sqlDatabase.customDescription = Object.fromEntries(Object.entries(fields?.customDescription ?? {}).filter(([key, _]) => sqlDatabase.allTables.map((table) => table.tableName).includes(key)));
		require_sql_utils.verifyIncludeTablesExistInDatabase(sqlDatabase.allTables, sqlDatabase.includesTables);
		require_sql_utils.verifyIgnoreTablesExistInDatabase(sqlDatabase.allTables, sqlDatabase.ignoreTables);
		return sqlDatabase;
	}
	static async fromOptionsParams(fields) {
		const { DataSource } = await import("typeorm");
		const dataSource = new DataSource(fields.appDataSourceOptions);
		return SqlDatabase.fromDataSourceParams({
			...fields,
			appDataSource: dataSource
		});
	}
	/**
	* Get information about specified tables.
	*
	* Follows best practices as specified in: Rajkumar et al, 2022
	* (https://arxiv.org/abs/2204.00498)
	*
	* If `sample_rows_in_table_info`, the specified number of sample rows will be
	* appended to each table description. This can increase performance as
	* demonstrated in the paper.
	*/
	async getTableInfo(targetTables) {
		let selectedTables = this.includesTables.length > 0 ? this.allTables.filter((currentTable) => this.includesTables.includes(currentTable.tableName)) : this.allTables;
		if (this.ignoreTables.length > 0) selectedTables = selectedTables.filter((currentTable) => !this.ignoreTables.includes(currentTable.tableName));
		if (targetTables && targetTables.length > 0) {
			require_sql_utils.verifyListTablesExistInDatabase(this.allTables, targetTables, "Wrong target table name:");
			selectedTables = this.allTables.filter((currentTable) => targetTables.includes(currentTable.tableName));
		}
		return require_sql_utils.generateTableInfoFromTables(selectedTables, this.appDataSource, this.sampleRowsInTableInfo, this.customDescription);
	}
	/**
	* Execute a SQL command and return a string representing the results.
	* If the statement returns rows, a string of the results is returned.
	* If the statement returns no rows, an empty string is returned.
	*/
	async run(command, fetch = "all") {
		const res = await this.appDataSource.query(command);
		if (fetch === "all") return JSON.stringify(res);
		if (res?.length > 0) return JSON.stringify(res[0]);
		return "";
	}
	serialize() {
		return {
			_type: "sql_database",
			appDataSourceOptions: this.appDataSourceOptions,
			includesTables: this.includesTables,
			ignoreTables: this.ignoreTables,
			sampleRowsInTableInfo: this.sampleRowsInTableInfo
		};
	}
	/** @ignore */
	static async imports() {
		try {
			const { DataSource } = await import("typeorm");
			return { DataSource };
		} catch (e) {
			console.error(e);
			throw new Error("Failed to load typeorm. Please install it with eg. `yarn add typeorm`.");
		}
	}
};

//#endregion
exports.SqlDatabase = SqlDatabase;
Object.defineProperty(exports, 'sql_db_exports', {
  enumerable: true,
  get: function () {
    return sql_db_exports;
  }
});
//# sourceMappingURL=sql_db.cjs.map