const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_agent = require('../agent.cjs');
const require_output_parser = require('./output_parser.cjs');
const require_tool_calling = require('../format_scratchpad/tool_calling.cjs');
require('../format_scratchpad/openai_tools.cjs');
const __langchain_core_runnables = require_rolldown_runtime.__toESM(require("@langchain/core/runnables"));
const __langchain_core_utils_function_calling = require_rolldown_runtime.__toESM(require("@langchain/core/utils/function_calling"));

//#region src/agents/openai_tools/index.ts
/**
* Create an agent that uses OpenAI-style tool calling.
* @param params Params required to create the agent. Includes an LLM, tools, and prompt.
* @returns A runnable sequence representing an agent. It takes as input all the same input
*     variables as the prompt passed in does. It returns as output either an
*     AgentAction or AgentFinish.
*
* @example
* ```typescript
* import { AgentExecutor, createOpenAIToolsAgent } from "langchain/agents";
* import { pull } from "langchain/hub";
* import type { ChatPromptTemplate } from "@langchain/core/prompts";
* import { AIMessage, HumanMessage } from "@langchain/core/messages";
*
* import { ChatOpenAI } from "@langchain/openai";
*
* // Define the tools the agent will have access to.
* const tools = [...];
*
* // Get the prompt to use - you can modify this!
* // If you want to see the prompt in full, you can at:
* // https://smith.langchain.com/hub/hwchase17/openai-tools-agent
* const prompt = await pull<ChatPromptTemplate>(
*   "hwchase17/openai-tools-agent"
* );
*
* const llm = new ChatOpenAI({
*   temperature: 0,
*   model: "gpt-3.5-turbo-1106",
* });
*
* const agent = await createOpenAIToolsAgent({
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
*
* // With chat history
* const result2 = await agentExecutor.invoke({
*   input: "what's my name?",
*   chat_history: [
*     new HumanMessage("hi! my name is cob"),
*     new AIMessage("Hello Cob! How can I assist you today?"),
*   ],
* });
* ```
*/
async function createOpenAIToolsAgent({ llm, tools, prompt, streamRunnable }) {
	if (!prompt.inputVariables.includes("agent_scratchpad")) throw new Error([`Prompt must have an input variable named "agent_scratchpad".`, `Found ${JSON.stringify(prompt.inputVariables)} instead.`].join("\n"));
	const modelWithTools = llm.bindTools ? llm.bindTools(tools) : llm.withConfig({ tools: tools.map((tool) => (0, __langchain_core_utils_function_calling.convertToOpenAITool)(tool)) });
	const agent = require_agent.AgentRunnableSequence.fromRunnables([
		__langchain_core_runnables.RunnablePassthrough.assign({ agent_scratchpad: (input) => require_tool_calling.formatToToolMessages(input.steps) }),
		prompt,
		modelWithTools,
		new require_output_parser.OpenAIToolsAgentOutputParser()
	], {
		name: "OpenAIToolsAgent",
		streamRunnable,
		singleAction: false
	});
	return agent;
}

//#endregion
exports.createOpenAIToolsAgent = createOpenAIToolsAgent;
//# sourceMappingURL=index.cjs.map