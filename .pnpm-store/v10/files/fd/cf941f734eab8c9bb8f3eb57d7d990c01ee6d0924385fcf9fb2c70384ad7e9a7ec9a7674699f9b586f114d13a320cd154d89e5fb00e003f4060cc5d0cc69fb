import { LLMChain } from "../../../chains/llm_chain.js";
import { ZeroShotAgent } from "../../mrkl/index.js";
import { AgentExecutor } from "../../executor.js";
import { InfoSqlTool, ListTablesSqlTool, QueryCheckerTool, QuerySqlTool } from "../../../tools/sql.js";
import { SQL_PREFIX, SQL_SUFFIX } from "./prompt.js";
import { renderTemplate } from "@langchain/core/prompts";
import { BaseToolkit } from "@langchain/core/tools";

//#region src/agents/toolkits/sql/sql.ts
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
var SqlToolkit = class extends BaseToolkit {
	tools;
	db;
	dialect = "sqlite";
	constructor(db, llm) {
		super();
		this.db = db;
		this.tools = [
			new QuerySqlTool(db),
			new InfoSqlTool(db),
			new ListTablesSqlTool(db),
			new QueryCheckerTool({ llm })
		];
	}
};
function createSqlAgent(llm, toolkit, args) {
	const { prefix = SQL_PREFIX, suffix = SQL_SUFFIX, inputVariables = ["input", "agent_scratchpad"], topK = 10 } = args ?? {};
	const { tools } = toolkit;
	const formattedPrefix = renderTemplate(prefix, "f-string", {
		dialect: toolkit.dialect,
		top_k: topK
	});
	const prompt = ZeroShotAgent.createPrompt(tools, {
		prefix: formattedPrefix,
		suffix,
		inputVariables
	});
	const chain = new LLMChain({
		prompt,
		llm
	});
	const agent = new ZeroShotAgent({
		llmChain: chain,
		allowedTools: tools.map((t) => t.name)
	});
	return AgentExecutor.fromAgentAndTools({
		agent,
		tools,
		returnIntermediateSteps: true
	});
}

//#endregion
export { SqlToolkit, createSqlAgent };
//# sourceMappingURL=sql.js.map