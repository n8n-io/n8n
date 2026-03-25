import { PromptTemplate } from "@langchain/core/prompts";
import { DataSource, DataSourceOptions } from "typeorm";

//#region src/util/sql_utils.d.ts
interface SqlDatabaseParams {
  includesTables?: Array<string>;
  ignoreTables?: Array<string>;
  sampleRowsInTableInfo?: number;
  customDescription?: Record<string, string>;
}
interface SqlDatabaseOptionsParams extends SqlDatabaseParams {
  appDataSourceOptions: DataSourceOptions;
}
interface SqlDatabaseDataSourceParams extends SqlDatabaseParams {
  appDataSource: DataSource;
}
type SerializedSqlDatabase = SqlDatabaseOptionsParams & {
  _type: string;
};
interface SqlTable {
  tableName: string;
  columns: SqlColumn[];
}
interface SqlColumn {
  columnName: string;
  dataType?: string;
  isNullable?: boolean;
}
//#endregion
export { SerializedSqlDatabase, SqlDatabaseDataSourceParams, SqlDatabaseOptionsParams, SqlTable };
//# sourceMappingURL=sql_utils.d.cts.map