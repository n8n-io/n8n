import { LLMChain } from "../chains/llm_chain.cjs";
import { SqlDatabase } from "../sql_db.cjs";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";
import { Tool } from "@langchain/core/tools";

//#region src/tools/sql.d.ts

/**
 * Interface for SQL tools. It has a `db` property which is a SQL
 * database.
 */
interface SqlTool {
  db: SqlDatabase;
}
/**
 * A tool for executing SQL queries. It takes a SQL database as a
 * parameter and assigns it to the `db` property. The `_call` method is
 * used to run the SQL query and return the result. If the query is
 * incorrect, an error message is returned.
 */
declare class QuerySqlTool extends Tool implements SqlTool {
  static lc_name(): string;
  name: string;
  db: SqlDatabase;
  constructor(db: SqlDatabase);
  /** @ignore */
  _call(input: string): Promise<string>;
  description: string;
}
/**
 * A tool for retrieving information about SQL tables. It takes a SQL
 * database as a parameter and assigns it to the `db` property. The
 * `_call` method is used to retrieve the schema and sample rows for the
 * specified tables. If the tables do not exist, an error message is
 * returned.
 */
declare class InfoSqlTool extends Tool implements SqlTool {
  static lc_name(): string;
  name: string;
  db: SqlDatabase;
  constructor(db: SqlDatabase);
  /** @ignore */
  _call(input: string): Promise<string>;
  description: string;
}
/**
 * A tool for listing all tables in a SQL database. It takes a SQL
 * database as a parameter and assigns it to the `db` property. The
 * `_call` method is used to return a comma-separated list of all tables
 * in the database.
 */
declare class ListTablesSqlTool extends Tool implements SqlTool {
  static lc_name(): string;
  name: string;
  db: SqlDatabase;
  constructor(db: SqlDatabase);
  _call(_: string): Promise<string>;
  description: string;
}
/**
 * Arguments for the QueryCheckerTool class.
 */
type QueryCheckerToolArgs = {
  llmChain?: LLMChain;
  llm: BaseLanguageModelInterface;
  _chainType?: never;
};
/**
 * A tool for checking SQL queries for common mistakes. It takes a
 * LLMChain or QueryCheckerToolArgs as a parameter. The `_call` method is
 * used to check the input query for common mistakes and returns a
 * prediction.
 */
declare class QueryCheckerTool extends Tool {
  static lc_name(): string;
  name: string;
  template: string;
  llmChain: LLMChain;
  constructor(llmChainOrOptions?: LLMChain | QueryCheckerToolArgs);
  /** @ignore */
  _call(input: string): Promise<string>;
  description: string;
}
//#endregion
export { InfoSqlTool, ListTablesSqlTool, QueryCheckerTool, QuerySqlTool };
//# sourceMappingURL=sql.d.cts.map