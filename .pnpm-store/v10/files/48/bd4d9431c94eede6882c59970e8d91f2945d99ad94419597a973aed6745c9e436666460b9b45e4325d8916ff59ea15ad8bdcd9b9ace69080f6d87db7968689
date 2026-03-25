const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_agent = require('../agent.cjs');
const require_tool_calling = require('../format_scratchpad/tool_calling.cjs');
const require_output_parser = require('./output_parser.cjs');
const __langchain_core_runnables = require_rolldown_runtime.__toESM(require("@langchain/core/runnables"));

//#region src/agents/tool_calling/index.ts
function _isBaseChatModel(x) {
	const model = x;
	return typeof model._modelType === "function" && model._modelType() === "base_chat_model";
}
/**
* Create an agent that uses tools.
* @param params Params required to create the agent. Includes an LLM, tools, and prompt.
* @returns A runnable sequence representing an agent. It takes as input all the same input
*     variables as the prompt passed in does. It returns as output either an
*     AgentAction or AgentFinish.
* @example
* ```typescript
* import { ChatAnthropic } from "@langchain/anthropic";
* import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
* import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
*
* const prompt = ChatPromptTemplate.fromMessages(
*   [
*     ["system", "You are a helpful assistant"],
*     ["placeholder", "{chat_history}"],
*     ["human", "{input}"],
*     ["placeholder", "{agent_scratchpad}"],
*   ]
* );
*
*
* const llm = new ChatAnthropic({
*   modelName: "claude-3-opus-20240229",
*   temperature: 0,
* });
*
* // Define the tools the agent will have access to.
* const tools = [...];
*
* const agent = createToolCallingAgent({ llm, tools, prompt });
*
* const agentExecutor = new AgentExecutor({ agent, tools });
*
* const result = await agentExecutor.invoke({input: "what is LangChain?"});
*
* // Using with chat history
* import { AIMessage, HumanMessage } from "@langchain/core/messages";
*
* const result2 = await agentExecutor.invoke(
*   {
*     input: "what's my name?",
*     chat_history: [
*       new HumanMessage({content: "hi! my name is bob"}),
*       new AIMessage({content: "Hello Bob! How can I assist you today?"}),
*     ],
*   }
* );
* ```
*/
function createToolCallingAgent({ llm, tools, prompt, streamRunnable }) {
	if (!prompt.inputVariables.includes("agent_scratchpad")) throw new Error([`Prompt must have an input variable named "agent_scratchpad".`, `Found ${JSON.stringify(prompt.inputVariables)} instead.`].join("\n"));
	let modelWithTools;
	if (_isBaseChatModel(llm)) {
		if (llm.bindTools === void 0) throw new Error(`This agent requires that the "bind_tools()" method be implemented on the input model.`);
		modelWithTools = llm.bindTools(tools);
	} else modelWithTools = llm;
	const agent = require_agent.AgentRunnableSequence.fromRunnables([
		__langchain_core_runnables.RunnablePassthrough.assign({ agent_scratchpad: (input) => require_tool_calling.formatToToolMessages(input.steps) }),
		prompt,
		modelWithTools,
		new require_output_parser.ToolCallingAgentOutputParser()
	], {
		name: "ToolCallingAgent",
		streamRunnable,
		singleAction: false
	});
	return agent;
}

//#endregion
exports.createToolCallingAgent = createToolCallingAgent;
//# sourceMappingURL=index.cjs.map