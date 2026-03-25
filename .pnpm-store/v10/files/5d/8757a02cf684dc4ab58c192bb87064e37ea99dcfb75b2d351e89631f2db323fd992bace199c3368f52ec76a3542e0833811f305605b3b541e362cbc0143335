import { AgentRunnableSequence, BaseSingleActionAgent } from "../agent.js";
import { LLMChain } from "../../chains/llm_chain.js";
import { renderTextDescription } from "../../tools/render.js";
import { AGENT_INSTRUCTIONS } from "./prompt.js";
import { XMLAgentOutputParser } from "./output_parser.js";
import { formatXml } from "../format_scratchpad/xml.js";
import { AIMessagePromptTemplate, ChatPromptTemplate, HumanMessagePromptTemplate } from "@langchain/core/prompts";
import { RunnablePassthrough } from "@langchain/core/runnables";

//#region src/agents/xml/index.ts
/**
* Class that represents an agent that uses XML tags.
*/
var XMLAgent = class XMLAgent extends BaseSingleActionAgent {
	static lc_name() {
		return "XMLAgent";
	}
	lc_namespace = [
		"langchain",
		"agents",
		"xml"
	];
	tools;
	llmChain;
	outputParser = new XMLAgentOutputParser();
	_agentType() {
		return "xml";
	}
	constructor(fields) {
		super(fields);
		this.tools = fields.tools;
		this.llmChain = fields.llmChain;
	}
	get inputKeys() {
		return ["input"];
	}
	static createPrompt() {
		return ChatPromptTemplate.fromMessages([HumanMessagePromptTemplate.fromTemplate(AGENT_INSTRUCTIONS), AIMessagePromptTemplate.fromTemplate("{intermediate_steps}")]);
	}
	/**
	* Plans the next action or finish state of the agent based on the
	* provided steps, inputs, and optional callback manager.
	* @param steps The steps to consider in planning.
	* @param inputs The inputs to consider in planning.
	* @param callbackManager Optional CallbackManager to use in planning.
	* @returns A Promise that resolves to an AgentAction or AgentFinish object representing the planned action or finish state.
	*/
	async plan(steps, inputs, callbackManager) {
		let log = "";
		for (const { action, observation } of steps) log += `<tool>${action.tool}</tool><tool_input>${action.toolInput}</tool_input><observation>${observation}</observation>`;
		let tools = "";
		for (const tool of this.tools) tools += `${tool.name}: ${tool.description}\n`;
		const _inputs = {
			intermediate_steps: log,
			tools,
			question: inputs.input,
			stop: ["</tool_input>", "</final_answer>"]
		};
		const response = await this.llmChain.call(_inputs, callbackManager);
		return this.outputParser.parse(response[this.llmChain.outputKey]);
	}
	/**
	* Creates an XMLAgent from a BaseLanguageModel and a list of tools.
	* @param llm The BaseLanguageModel to use.
	* @param tools The tools to be used by the agent.
	* @param args Optional arguments for creating the agent.
	* @returns An instance of XMLAgent.
	*/
	static fromLLMAndTools(llm, tools, args) {
		const prompt = XMLAgent.createPrompt();
		const chain = new LLMChain({
			prompt,
			llm,
			callbacks: args?.callbacks
		});
		return new XMLAgent({
			llmChain: chain,
			tools
		});
	}
};
/**
* Create an agent that uses XML to format its logic.
* @param params Params required to create the agent. Includes an LLM, tools, and prompt.
* @returns A runnable sequence representing an agent. It takes as input all the same input
*     variables as the prompt passed in does. It returns as output either an
*     AgentAction or AgentFinish.
*
* @example
* ```typescript
* import { AgentExecutor, createXmlAgent } from "langchain/agents";
* import { pull } from "langchain/hub";
* import type { PromptTemplate } from "@langchain/core/prompts";
*
* import { ChatAnthropic } from "@langchain/anthropic";
*
* // Define the tools the agent will have access to.
* const tools = [...];
*
* // Get the prompt to use - you can modify this!
* // If you want to see the prompt in full, you can at:
* // https://smith.langchain.com/hub/hwchase17/xml-agent-convo
* const prompt = await pull<PromptTemplate>("hwchase17/xml-agent-convo");
*
* const llm = new ChatAnthropic({
*   temperature: 0,
* });
*
* const agent = await createXmlAgent({
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
*   // Notice that chat_history is a string, since this prompt is aimed at LLMs, not chat models
*   chat_history: "Human: Hi! My name is Cob\nAI: Hello Cob! Nice to meet you",
* });
* ```
*/
async function createXmlAgent({ llm, tools, prompt, streamRunnable }) {
	const missingVariables = ["tools", "agent_scratchpad"].filter((v) => !prompt.inputVariables.includes(v));
	if (missingVariables.length > 0) throw new Error(`Provided prompt is missing required input variables: ${JSON.stringify(missingVariables)}`);
	const partialedPrompt = await prompt.partial({ tools: renderTextDescription(tools) });
	const llmWithStop = llm.withConfig({ stop: ["</tool_input>", "</final_answer>"] });
	const agent = AgentRunnableSequence.fromRunnables([
		RunnablePassthrough.assign({ agent_scratchpad: (input) => formatXml(input.steps) }),
		partialedPrompt,
		llmWithStop,
		new XMLAgentOutputParser()
	], {
		name: "XMLAgent",
		streamRunnable,
		singleAction: true
	});
	return agent;
}

//#endregion
export { XMLAgent, createXmlAgent };
//# sourceMappingURL=index.js.map