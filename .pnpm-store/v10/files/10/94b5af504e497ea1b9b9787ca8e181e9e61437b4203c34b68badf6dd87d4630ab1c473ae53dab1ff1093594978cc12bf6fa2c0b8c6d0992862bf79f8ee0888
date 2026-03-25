import { SerializedSqlDatabase, SqlDatabaseDataSourceParams, SqlDatabaseOptionsParams, SqlTable } from "./util/sql_utils.js";
import * as _langchain_core_load_serializable0 from "@langchain/core/load/serializable";
import { Serializable } from "@langchain/core/load/serializable";
import { DataSource, DataSourceOptions } from "typeorm";

//#region src/sql_db.d.ts

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
declare class SqlDatabase extends Serializable implements SqlDatabaseOptionsParams, SqlDatabaseDataSourceParams {
  lc_namespace: string[];
  toJSON(): _langchain_core_load_serializable0.SerializedNotImplemented;
  appDataSourceOptions: DataSourceOptions;
  appDataSource: DataSource;
  allTables: Array<SqlTable>;
  includesTables: Array<string>;
  ignoreTables: Array<string>;
  sampleRowsInTableInfo: number;
  customDescription?: Record<string, string>;
  protected constructor(fields: SqlDatabaseDataSourceParams);
  static fromDataSourceParams(fields: SqlDatabaseDataSourceParams): Promise<SqlDatabase>;
  static fromOptionsParams(fields: SqlDatabaseOptionsParams): Promise<SqlDatabase>;
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
  getTableInfo(targetTables?: Array<string>): Promise<string>;
  /**
   * Execute a SQL command and return a string representing the results.
   * If the statement returns rows, a string of the results is returned.
   * If the statement returns no rows, an empty string is returned.
   */
  run(command: string, fetch?: "all" | "one"): Promise<string>;
  serialize(): SerializedSqlDatabase;
  /** @ignore */
  static imports(): Promise<{
    DataSource: typeof DataSource;
  }>;
}
//#endregion
export { SqlDatabase, type SqlDatabaseDataSourceParams, type SqlDatabaseOptionsParams };
//# sourceMappingURL=sql_db.d.ts.map