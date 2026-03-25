import { BaseChain, ChainInputs } from "../base.cjs";
import { SqlDatabase } from "../../sql_db.cjs";
import { SqlDialect } from "./sql_db_prompt.cjs";
import { RunnableSequence } from "@langchain/core/runnables";
import { ChainValues } from "@langchain/core/utils/types";
import { BasePromptTemplate, PromptTemplate } from "@langchain/core/prompts";
import { BaseLanguageModel, BaseLanguageModelInterface } from "@langchain/core/language_models/base";
import { CallbackManagerForChainRun } from "@langchain/core/callbacks/manager";

//#region src/chains/sql_db/sql_db_chain.d.ts

/**
 * Interface that extends the ChainInputs interface and defines additional
 * fields specific to a SQL database chain. It represents the input fields
 * for a SQL database chain.
 */
interface SqlDatabaseChainInput extends ChainInputs {
  llm: BaseLanguageModelInterface;
  database: SqlDatabase;
  topK?: number;
  inputKey?: string;
  outputKey?: string;
  sqlOutputKey?: string;
  prompt?: PromptTemplate;
}
/**
 * Class that represents a SQL database chain in the LangChain framework.
 * It extends the BaseChain class and implements the functionality
 * specific to a SQL database chain.
 *
 * @security **Security Notice**
 * This chain generates SQL queries for the given database.
 * The SQLDatabase class provides a getTableInfo method that can be used
 * to get column information as well as sample data from the table.
 * To mitigate risk of leaking sensitive data, limit permissions
 * to read and scope to the tables that are needed.
 * Optionally, use the includesTables or ignoreTables class parameters
 * to limit which tables can/cannot be accessed.
 *
 * @link See https://js.langchain.com/docs/security for more information.
 * @example
 * ```typescript
 * const chain = new SqlDatabaseChain({
 *   llm: new OpenAI({ temperature: 0 }),
 *   database: new SqlDatabase({ ...config }),
 * });
 *
 * const result = await chain.run("How many tracks are there?");
 * ```
 */
declare class SqlDatabaseChain extends BaseChain {
  static lc_name(): string;
  llm: BaseLanguageModelInterface;
  database: SqlDatabase;
  prompt: PromptTemplate<{
    dialect: any;
    input: any;
    table_info: any;
    top_k: any;
  }, any>;
  topK: number;
  inputKey: string;
  outputKey: string;
  sqlOutputKey: string | undefined;
  returnDirect: boolean;
  constructor(fields: SqlDatabaseChainInput);
  /** @ignore */
  _call(values: ChainValues, runManager?: CallbackManagerForChainRun): Promise<ChainValues>;
  _chainType(): "sql_database_chain";
  get inputKeys(): string[];
  get outputKeys(): string[];
  private verifyNumberOfTokens;
}
interface CreateSqlQueryChainFields {
  llm: BaseLanguageModel;
  db: SqlDatabase;
  prompt?: BasePromptTemplate;
  /**
   * @default 5
   */
  k?: number;
  dialect: SqlDialect;
}
/**
 * Create a SQL query chain that can create SQL queries for the given database.
 * Returns a Runnable.
 *
 * @param {BaseLanguageModel} llm The language model to use in the chain.
 * @param {SqlDatabase} db The database to use in the chain.
 * @param {BasePromptTemplate | undefined} prompt The prompt to use in the chain.
 * @param {BaseLanguageModel | undefined} k The amount of docs/results to return. Passed through the prompt input value `top_k`.
 * @param {SqlDialect} dialect The SQL dialect to use in the chain.
 * @returns {Promise<RunnableSequence<Record<string, unknown>, string>>} A runnable sequence representing the chain.
 * @example ```typescript
 * const datasource = new DataSource({
 *   type: "sqlite",
 *   database: "../../../../Chinook.db",
 * });
 * const db = await SqlDatabase.fromDataSourceParams({
 *   appDataSource: datasource,
 * });
 * const llm = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });
 * const chain = await createSqlQueryChain({
 *   llm,
 *   db,
 *   dialect: "sqlite",
 * });
 * ```
 */
declare function createSqlQueryChain({
  llm,
  db,
  prompt,
  k,
  dialect
}: CreateSqlQueryChainFields): Promise<RunnableSequence<Record<string, unknown>, string>>;
//#endregion
export { CreateSqlQueryChainFields, SqlDatabaseChain, SqlDatabaseChainInput, createSqlQueryChain };
//# sourceMappingURL=sql_db_chain.d.cts.map