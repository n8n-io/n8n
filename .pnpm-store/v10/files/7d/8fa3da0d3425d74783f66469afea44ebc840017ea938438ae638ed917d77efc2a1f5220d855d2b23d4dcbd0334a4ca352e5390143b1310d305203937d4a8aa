import { BaseMessage } from "@langchain/core/messages";
import pg from "pg";
import { BaseListChatMessageHistory } from "@langchain/core/chat_history";

//#region src/stores/message/postgres.d.ts

/**
 * Type definition for the input parameters required when instantiating a
 * PostgresChatMessageHistory object.
 */
type PostgresChatMessageHistoryInput = {
  /**
   * Name of the table to use when storing and retrieving chat message
   */
  tableName?: string;
  /**
   * Session ID to use when storing and retrieving chat message history.
   */
  sessionId: string;
  /**
   * Configuration object for the Postgres pool. If provided the
   * PostgresChatMessageHistory object will create a new pool using
   * the provided configuration. Otherwise it will use the provided
   * pool.
   */
  poolConfig?: pg.PoolConfig;
  /**
   * Postgres pool to use. If provided the PostgresChatMessageHistory
   * object will use the provided pool. Otherwise it will create a
   * new pool using the provided configuration.
   */
  pool?: pg.Pool;
  /**
   * If true, the table name will be escaped. ('lAnGcHaIn' will be escaped to '"lAnGcHaIn"')
   */
  escapeTableName?: boolean;
};
interface StoredPostgresMessageData {
  name: string | undefined;
  role: string | undefined;
  content: string;
  additional_kwargs?: Record<string, unknown>;
  type: string;
  tool_call_id: string | undefined;
}
/**
 * Class for managing chat message history using a Postgres Database as a
 * storage backend. Extends the BaseListChatMessageHistory class.
 * @example
 * ```typescript
 * const chatHistory = new PostgresChatMessageHistory({
 *    tableName: "langchain_chat_histories",
 *    sessionId: "lc-example",
 *    pool: new pg.Pool({
 *      host: "127.0.0.1",
 *      port: 5432,
 *      user: "myuser",
 *      password: "ChangeMe",
 *      database: "api",
 *    }),
 * });
 * ```
 */
declare class PostgresChatMessageHistory extends BaseListChatMessageHistory {
  lc_namespace: string[];
  pool: pg.Pool;
  tableName: string;
  sessionId: string;
  private initialized;
  /**
   * Creates a new PostgresChatMessageHistory.
   * @param {PostgresChatMessageHistoryInput} fields The input fields for the PostgresChatMessageHistory.
   * @param {string} fields.tableName The name of the table name to use. Defaults to `langchain_chat_histories`.
   * @param {string} fields.sessionId The session ID to use when storing and retrieving chat message history.
   * @param {pg.Pool} fields.pool The Postgres pool to use. If provided, the PostgresChatMessageHistory will use the provided pool.
   * @param {pg.PoolConfig} fields.poolConfig The configuration object for the Postgres pool. If no pool is provided, the conig will be used to create a new pool.
   * If `pool` is provided, it will be used as the Postgres pool even if `poolConfig` is also provided.
   * @throws If neither `pool` nor `poolConfig` is provided.
   */
  constructor(fields: PostgresChatMessageHistoryInput);
  private ensureTable;
  addMessage(message: BaseMessage): Promise<void>;
  getMessages(): Promise<BaseMessage[]>;
  clear(): Promise<void>;
  /**
   * End the Postgres pool.
   */
  end(): Promise<void>;
}
//#endregion
export { PostgresChatMessageHistory, PostgresChatMessageHistoryInput, StoredPostgresMessageData };
//# sourceMappingURL=postgres.d.cts.map