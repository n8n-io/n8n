import { ListKeyOptions, RecordManagerInterface, UpdateOptions } from "@langchain/core/indexing";
import { Database as Database$1 } from "better-sqlite3";

//#region src/indexes/sqlite.d.ts

/**
 * Options for configuring the SQLiteRecordManager class.
 */
type SQLiteRecordManagerOptions = {
  /**
   * The file path of the SQLite database.
   * One of either `localPath` or `connectionString` is required.
   */
  localPath?: string;
  /**
   * The connection string of the SQLite database.
   * One of either `localPath` or `connectionString` is required.
   */
  connectionString?: string;
  /**
   * The name of the table in the SQLite database.
   */
  tableName: string;
};
declare class SQLiteRecordManager implements RecordManagerInterface {
  lc_namespace: string[];
  tableName: string;
  db: Database$1;
  namespace: string;
  constructor(namespace: string, config: SQLiteRecordManagerOptions);
  createSchema(): Promise<void>;
  getTime(): Promise<number>;
  update(keys: string[], updateOptions?: UpdateOptions): Promise<void>;
  exists(keys: string[]): Promise<boolean[]>;
  listKeys(options?: ListKeyOptions): Promise<string[]>;
  deleteKeys(keys: string[]): Promise<void>;
}
//#endregion
export { SQLiteRecordManager, SQLiteRecordManagerOptions };
//# sourceMappingURL=sqlite.d.ts.map