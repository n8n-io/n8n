import { JsonGetValueTool, JsonListKeysTool } from "../../../tools/json.js";
import { JSON_PREFIX, JSON_SUFFIX } from "./prompt.js";
import { LLMChain } from "../../../chains/llm_chain.js";
import { ZeroShotAgent } from "../../mrkl/index.js";
import { AgentExecutor } from "../../executor.js";
import { BaseToolkit } from "@langchain/core/tools";

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
var JsonToolkit = class extends BaseToolkit {
	tools;
	constructor(jsonSpec) {
		super();
		this.jsonSpec = jsonSpec;
		this.tools = [new JsonListKeysTool(jsonSpec), new JsonGetValueTool(jsonSpec)];
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
	const { prefix = JSON_PREFIX, suffix = JSON_SUFFIX, inputVariables = ["input", "agent_scratchpad"] } = args ?? {};
	const { tools } = toolkit;
	const prompt = ZeroShotAgent.createPrompt(tools, {
		prefix,
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
export { JsonToolkit, createJsonAgent };
//# sourceMappingURL=json.js.map