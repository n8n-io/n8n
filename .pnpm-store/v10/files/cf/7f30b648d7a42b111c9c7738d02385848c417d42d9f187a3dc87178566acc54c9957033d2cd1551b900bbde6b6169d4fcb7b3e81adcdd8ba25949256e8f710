import { ListKeyOptions, RecordManagerInterface, UpdateOptions } from "@langchain/core/indexing";
import { Pool, PoolConfig } from "pg";

//#region src/indexes/postgres.d.ts
type PostgresRecordManagerOptions = {
  postgresConnectionOptions?: PoolConfig;
  pool?: Pool;
  tableName?: string;
  schema?: string;
};
declare class PostgresRecordManager implements RecordManagerInterface {
  lc_namespace: string[];
  pool: Pool;
  tableName: string;
  namespace: string;
  finalTableName: string;
  constructor(namespace: string, config: PostgresRecordManagerOptions);
  createSchema(): Promise<void>;
  getTime(): Promise<number>;
  /**
   * Generates the SQL placeholders for a specific row at the provided index.
   *
   * @param index - The index of the row for which placeholders need to be generated.
   * @param numOfColumns - The number of columns we are inserting data into.
   * @returns The SQL placeholders for the row values.
   */
  private generatePlaceholderForRowAt;
  update(keys: string[], updateOptions?: UpdateOptions): Promise<void>;
  exists(keys: string[]): Promise<boolean[]>;
  listKeys(options?: ListKeyOptions): Promise<string[]>;
  deleteKeys(keys: string[]): Promise<void>;
  /**
   * Terminates the connection pool.
   * @returns {Promise<void>}
   */
  end(): Promise<void>;
}
//#endregion
export { PostgresRecordManager, PostgresRecordManagerOptions };
//# sourceMappingURL=postgres.d.ts.map