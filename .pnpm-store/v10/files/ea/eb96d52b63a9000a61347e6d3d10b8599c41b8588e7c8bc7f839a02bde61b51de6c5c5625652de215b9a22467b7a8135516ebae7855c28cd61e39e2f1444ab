import { AgentRunnableSequence } from "../agent.js";
import { renderTextDescription } from "../../tools/render.js";
import { formatLogToString } from "../format_scratchpad/log.js";
import { ReActSingleInputOutputParser } from "./output_parser.js";
import { RunnablePassthrough } from "@langchain/core/runnables";

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
		tools: renderTextDescription(tools),
		tool_names: toolNames.join(", ")
	});
	const llmWithStop = llm.withConfig({ stop: ["\nObservation:"] });
	const agent = AgentRunnableSequence.fromRunnables([
		RunnablePassthrough.assign({ agent_scratchpad: (input) => formatLogToString(input.steps) }),
		partialedPrompt,
		llmWithStop,
		new ReActSingleInputOutputParser({ toolNames })
	], {
		name: "ReactAgent",
		streamRunnable,
		singleAction: true
	});
	return agent;
}

//#endregion
export { createReactAgent };
//# sourceMappingURL=index.js.map