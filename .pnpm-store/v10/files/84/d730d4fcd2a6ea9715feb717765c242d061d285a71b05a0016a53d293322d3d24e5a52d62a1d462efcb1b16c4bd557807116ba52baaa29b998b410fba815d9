import { ZeroShotCreatePromptArgs } from "../../mrkl/index.cjs";
import { AgentExecutor } from "../../executor.cjs";
import { SqlDatabase } from "../../../sql_db.cjs";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";
import { BaseToolkit, ToolInterface } from "@langchain/core/tools";

//#region src/agents/toolkits/sql/sql.d.ts

/**
 * Interface that extends ZeroShotCreatePromptArgs and adds an optional
 * topK parameter for specifying the number of results to return.
 */
interface SqlCreatePromptArgs extends ZeroShotCreatePromptArgs {
  /** Number of results to return. */
  topK?: number;
}
/**
 * Class that represents a toolkit for working with SQL databases. It
 * initializes SQL tools based on the provided SQL database.
 * @example
 * ```typescript
 * const model = new ChatOpenAI({ model: "gpt-4o-mini" });
 * const toolkit = new SqlToolkit(sqlDb, model);
 * const executor = createSqlAgent(model, toolkit);
 * const result = await executor.invoke({ input: 'List the total sales per country. Which country's customers spent the most?' });
 * console.log(`Got output ${result.output}`);
 * ```
 */
declare class SqlToolkit extends BaseToolkit {
  tools: ToolInterface[];
  db: SqlDatabase;
  dialect: string;
  constructor(db: SqlDatabase, llm: BaseLanguageModelInterface);
}
declare function createSqlAgent(llm: BaseLanguageModelInterface, toolkit: SqlToolkit, args?: SqlCreatePromptArgs): AgentExecutor;
//#endregion
export { SqlCreatePromptArgs, SqlToolkit, createSqlAgent };
//# sourceMappingURL=sql.d.cts.map