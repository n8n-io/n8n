const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_llm_chain = require('../chains/llm_chain.cjs');
const __langchain_core_prompts = require_rolldown_runtime.__toESM(require("@langchain/core/prompts"));
const __langchain_core_tools = require_rolldown_runtime.__toESM(require("@langchain/core/tools"));

//#region src/tools/sql.ts
var sql_exports = {};
require_rolldown_runtime.__export(sql_exports, {
	InfoSqlTool: () => InfoSqlTool,
	ListTablesSqlTool: () => ListTablesSqlTool,
	QueryCheckerTool: () => QueryCheckerTool,
	QuerySqlTool: () => QuerySqlTool
});
/**
* A tool for executing SQL queries. It takes a SQL database as a
* parameter and assigns it to the `db` property. The `_call` method is
* used to run the SQL query and return the result. If the query is
* incorrect, an error message is returned.
*/
var QuerySqlTool = class extends __langchain_core_tools.Tool {
	static lc_name() {
		return "QuerySqlTool";
	}
	name = "query-sql";
	db;
	constructor(db) {
		super(...arguments);
		this.db = db;
	}
	/** @ignore */
	async _call(input) {
		try {
			return await this.db.run(input);
		} catch (error) {
			return `${error}`;
		}
	}
	description = `Input to this tool is a detailed and correct SQL query, output is a result from the database.
  If the query is not correct, an error message will be returned.
  If an error is returned, rewrite the query, check the query, and try again.`;
};
/**
* A tool for retrieving information about SQL tables. It takes a SQL
* database as a parameter and assigns it to the `db` property. The
* `_call` method is used to retrieve the schema and sample rows for the
* specified tables. If the tables do not exist, an error message is
* returned.
*/
var InfoSqlTool = class extends __langchain_core_tools.Tool {
	static lc_name() {
		return "InfoSqlTool";
	}
	name = "info-sql";
	db;
	constructor(db) {
		super();
		this.db = db;
	}
	/** @ignore */
	async _call(input) {
		try {
			const tables = input.split(",").map((table) => table.trim());
			return await this.db.getTableInfo(tables);
		} catch (error) {
			return `${error}`;
		}
	}
	description = `Input to this tool is a comma-separated list of tables, output is the schema and sample rows for those tables.
    Be sure that the tables actually exist by calling list-tables-sql first!

    Example Input: "table1, table2, table3.`;
};
/**
* A tool for listing all tables in a SQL database. It takes a SQL
* database as a parameter and assigns it to the `db` property. The
* `_call` method is used to return a comma-separated list of all tables
* in the database.
*/
var ListTablesSqlTool = class extends __langchain_core_tools.Tool {
	static lc_name() {
		return "ListTablesSqlTool";
	}
	name = "list-tables-sql";
	db;
	constructor(db) {
		super();
		this.db = db;
	}
	async _call(_) {
		try {
			let selectedTables = this.db.allTables;
			if (this.db.includesTables.length > 0) selectedTables = selectedTables.filter((currentTable) => this.db.includesTables.includes(currentTable.tableName));
			if (this.db.ignoreTables.length > 0) selectedTables = selectedTables.filter((currentTable) => !this.db.ignoreTables.includes(currentTable.tableName));
			const tables = selectedTables.map((table) => table.tableName);
			return tables.join(", ");
		} catch (error) {
			return `${error}`;
		}
	}
	description = `Input is an empty string, output is a comma-separated list of tables in the database.`;
};
/**
* A tool for checking SQL queries for common mistakes. It takes a
* LLMChain or QueryCheckerToolArgs as a parameter. The `_call` method is
* used to check the input query for common mistakes and returns a
* prediction.
*/
var QueryCheckerTool = class extends __langchain_core_tools.Tool {
	static lc_name() {
		return "QueryCheckerTool";
	}
	name = "query-checker";
	template = `
    {query}
Double check the SQL query above for common mistakes, including:
- Using NOT IN with NULL values
- Using UNION when UNION ALL should have been used
- Using BETWEEN for exclusive ranges
- Data type mismatch in predicates
- Properly quoting identifiers
- Using the correct number of arguments for functions
- Casting to the correct data type
- Using the proper columns for joins

If there are any of the above mistakes, rewrite the query. If there are no mistakes, just reproduce the original query.`;
	llmChain;
	constructor(llmChainOrOptions) {
		super();
		if (typeof llmChainOrOptions?._chainType === "function") this.llmChain = llmChainOrOptions;
		else {
			const options = llmChainOrOptions;
			if (options?.llmChain !== void 0) this.llmChain = options.llmChain;
			else {
				const prompt = new __langchain_core_prompts.PromptTemplate({
					template: this.template,
					inputVariables: ["query"]
				});
				const llm = options.llm;
				this.llmChain = new require_llm_chain.LLMChain({
					llm,
					prompt
				});
			}
		}
	}
	/** @ignore */
	async _call(input) {
		return this.llmChain.predict({ query: input });
	}
	description = `Use this tool to double check if your query is correct before executing it.
    Always use this tool before executing a query with query-sql!`;
};

//#endregion
exports.InfoSqlTool = InfoSqlTool;
exports.ListTablesSqlTool = ListTablesSqlTool;
exports.QueryCheckerTool = QueryCheckerTool;
exports.QuerySqlTool = QuerySqlTool;
Object.defineProperty(exports, 'sql_exports', {
  enumerable: true,
  get: function () {
    return sql_exports;
  }
});
//# sourceMappingURL=sql.cjs.map