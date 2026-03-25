const require_rolldown_runtime = require('../../../_virtual/rolldown_runtime.cjs');
const require_llm_chain = require('../../../chains/llm_chain.cjs');
const require_index = require('../../mrkl/index.cjs');
const require_executor = require('../../executor.cjs');
const require_tools_sql = require('../../../tools/sql.cjs');
const require_prompt = require('./prompt.cjs');
const __langchain_core_prompts = require_rolldown_runtime.__toESM(require("@langchain/core/prompts"));
const __langchain_core_tools = require_rolldown_runtime.__toESM(require("@langchain/core/tools"));

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
var SqlToolkit = class extends __langchain_core_tools.BaseToolkit {
	tools;
	db;
	dialect = "sqlite";
	constructor(db, llm) {
		super();
		this.db = db;
		this.tools = [
			new require_tools_sql.QuerySqlTool(db),
			new require_tools_sql.InfoSqlTool(db),
			new require_tools_sql.ListTablesSqlTool(db),
			new require_tools_sql.QueryCheckerTool({ llm })
		];
	}
};
function createSqlAgent(llm, toolkit, args) {
	const { prefix = require_prompt.SQL_PREFIX, suffix = require_prompt.SQL_SUFFIX, inputVariables = ["input", "agent_scratchpad"], topK = 10 } = args ?? {};
	const { tools } = toolkit;
	const formattedPrefix = (0, __langchain_core_prompts.renderTemplate)(prefix, "f-string", {
		dialect: toolkit.dialect,
		top_k: topK
	});
	const prompt = require_index.ZeroShotAgent.createPrompt(tools, {
		prefix: formattedPrefix,
		suffix,
		inputVariables
	});
	const chain = new require_llm_chain.LLMChain({
		prompt,
		llm
	});
	const agent = new require_index.ZeroShotAgent({
		llmChain: chain,
		allowedTools: tools.map((t) => t.name)
	});
	return require_executor.AgentExecutor.fromAgentAndTools({
		agent,
		tools,
		returnIntermediateSteps: true
	});
}

//#endregion
exports.SqlToolkit = SqlToolkit;
exports.createSqlAgent = createSqlAgent;
//# sourceMappingURL=sql.cjs.map