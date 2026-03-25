const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_agent = require('../agent.cjs');
const require_llm_chain = require('../../chains/llm_chain.cjs');
const require_tools_render = require('../../tools/render.cjs');
const require_prompt = require('./prompt.cjs');
const require_agents_xml_output_parser = require('./output_parser.cjs');
const require_agents_format_scratchpad_xml = require('../format_scratchpad/xml.cjs');
const __langchain_core_prompts = require_rolldown_runtime.__toESM(require("@langchain/core/prompts"));
const __langchain_core_runnables = require_rolldown_runtime.__toESM(require("@langchain/core/runnables"));

//#region src/agents/xml/index.ts
/**
* Class that represents an agent that uses XML tags.
*/
var XMLAgent = class XMLAgent extends require_agent.BaseSingleActionAgent {
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
	outputParser = new require_agents_xml_output_parser.XMLAgentOutputParser();
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
		return __langchain_core_prompts.ChatPromptTemplate.fromMessages([__langchain_core_prompts.HumanMessagePromptTemplate.fromTemplate(require_prompt.AGENT_INSTRUCTIONS), __langchain_core_prompts.AIMessagePromptTemplate.fromTemplate("{intermediate_steps}")]);
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
		const chain = new require_llm_chain.LLMChain({
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
	const partialedPrompt = await prompt.partial({ tools: require_tools_render.renderTextDescription(tools) });
	const llmWithStop = llm.withConfig({ stop: ["</tool_input>", "</final_answer>"] });
	const agent = require_agent.AgentRunnableSequence.fromRunnables([
		__langchain_core_runnables.RunnablePassthrough.assign({ agent_scratchpad: (input) => require_agents_format_scratchpad_xml.formatXml(input.steps) }),
		partialedPrompt,
		llmWithStop,
		new require_agents_xml_output_parser.XMLAgentOutputParser()
	], {
		name: "XMLAgent",
		streamRunnable,
		singleAction: true
	});
	return agent;
}

//#endregion
exports.XMLAgent = XMLAgent;
exports.createXmlAgent = createXmlAgent;
//# sourceMappingURL=index.cjs.map