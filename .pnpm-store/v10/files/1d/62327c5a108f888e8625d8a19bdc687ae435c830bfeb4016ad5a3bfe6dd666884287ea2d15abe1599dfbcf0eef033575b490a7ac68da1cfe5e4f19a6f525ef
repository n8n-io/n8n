const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_agent = require('../agent.cjs');
const require_tools_render = require('../../tools/render.cjs');
const require_agents_format_scratchpad_log = require('../format_scratchpad/log.cjs');
const require_agents_react_output_parser = require('./output_parser.cjs');
const __langchain_core_runnables = require_rolldown_runtime.__toESM(require("@langchain/core/runnables"));

//#region src/agents/react/index.ts
/**
* Create an agent that uses ReAct prompting.
* @param params Params required to create the agent. Includes an LLM, tools, and prompt.
* @returns A runnable sequence representing an agent. It takes as input all the same input
*     variables as the prompt passed in does. It returns as output either an
*     AgentAction or AgentFinish.
*
* @example
* ```typescript
* import { AgentExecutor, createReactAgent } from "langchain/agents";
* import { pull } from "langchain/hub";
* import type { PromptTemplate } from "@langchain/core/prompts";
*
* import { OpenAI } from "@langchain/openai";
*
* // Define the tools the agent will have access to.
* const tools = [...];
*
* // Get the prompt to use - you can modify this!
* // If you want to see the prompt in full, you can at:
* // https://smith.langchain.com/hub/hwchase17/react
* const prompt = await pull<PromptTemplate>("hwchase17/react");
*
* const llm = new OpenAI({
*   temperature: 0,
* });
*
* const agent = await createReactAgent({
*   llm,
*   tools,
*   prompt,
* });
*
* const agentExecutor = new AgentExecutor({
*   agent,
*   tools,
* });
*
* const result = await agentExecutor.invoke({
*   input: "what is LangChain?",
* });
* ```
*/
async function createReactAgent({ llm, tools, prompt, streamRunnable }) {
	const missingVariables = [
		"tools",
		"tool_names",
		"agent_scratchpad"
	].filter((v) => !prompt.inputVariables.includes(v));
	if (missingVariables.length > 0) throw new Error(`Provided prompt is missing required input variables: ${JSON.stringify(missingVariables)}`);
	const toolNames = tools.map((tool) => tool.name);
	const partialedPrompt = await prompt.partial({
		tools: require_tools_render.renderTextDescription(tools),
		tool_names: toolNames.join(", ")
	});
	const llmWithStop = llm.withConfig({ stop: ["\nObservation:"] });
	const agent = require_agent.AgentRunnableSequence.fromRunnables([
		__langchain_core_runnables.RunnablePassthrough.assign({ agent_scratchpad: (input) => require_agents_format_scratchpad_log.formatLogToString(input.steps) }),
		partialedPrompt,
		llmWithStop,
		new require_agents_react_output_parser.ReActSingleInputOutputParser({ toolNames })
	], {
		name: "ReactAgent",
		streamRunnable,
		singleAction: true
	});
	return agent;
}

//#endregion
exports.createReactAgent = createReactAgent;
//# sourceMappingURL=index.cjs.map