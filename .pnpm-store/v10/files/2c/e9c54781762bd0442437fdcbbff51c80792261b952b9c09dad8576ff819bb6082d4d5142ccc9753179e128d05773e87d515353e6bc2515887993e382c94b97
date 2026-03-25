const require_rolldown_runtime = require('../../../_virtual/rolldown_runtime.cjs');
const require_json = require('../../../tools/json.cjs');
const require_prompt = require('./prompt.cjs');
const require_llm_chain = require('../../../chains/llm_chain.cjs');
const require_index = require('../../mrkl/index.cjs');
const require_executor = require('../../executor.cjs');
const __langchain_core_tools = require_rolldown_runtime.__toESM(require("@langchain/core/tools"));

//#region src/agents/toolkits/json/json.ts
/**
* Represents a toolkit for working with JSON data. It initializes the
* JSON tools based on the provided JSON specification.
* @example
* ```typescript
* const toolkit = new JsonToolkit(new JsonSpec());
* const executor = createJsonAgent(model, toolkit);
* const result = await executor.invoke({
*   input: 'What are the required parameters in the request body to the /completions endpoint?'
* });
* ```
*/
var JsonToolkit = class extends __langchain_core_tools.BaseToolkit {
	tools;
	constructor(jsonSpec) {
		super();
		this.jsonSpec = jsonSpec;
		this.tools = [new require_json.JsonListKeysTool(jsonSpec), new require_json.JsonGetValueTool(jsonSpec)];
	}
};
/**
* Creates a JSON agent using a language model, a JSON toolkit, and
* optional prompt arguments. It creates a prompt for the agent using the
* JSON tools and the provided prefix and suffix. It then creates a
* ZeroShotAgent with the prompt and the JSON tools, and returns an
* AgentExecutor for executing the agent with the tools.
* @param llm The language model used to create the JSON agent.
* @param toolkit The JSON toolkit used to create the JSON agent.
* @param args Optional prompt arguments used to create the JSON agent.
* @returns An AgentExecutor for executing the created JSON agent with the tools.
*/
function createJsonAgent(llm, toolkit, args) {
	const { prefix = require_prompt.JSON_PREFIX, suffix = require_prompt.JSON_SUFFIX, inputVariables = ["input", "agent_scratchpad"] } = args ?? {};
	const { tools } = toolkit;
	const prompt = require_index.ZeroShotAgent.createPrompt(tools, {
		prefix,
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
exports.JsonToolkit = JsonToolkit;
exports.createJsonAgent = createJsonAgent;
//# sourceMappingURL=json.cjs.map