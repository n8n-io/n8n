const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_agent = require('../agent.cjs');
const require_llm_chain = require('../../chains/llm_chain.cjs');
const require_prompt = require('./prompt.cjs');
const require_output_parser = require('./output_parser.cjs');
require('../openai/output_parser.cjs');
const require_agents_format_scratchpad_openai_functions = require('../format_scratchpad/openai_functions.cjs');
const __langchain_core_prompts = require_rolldown_runtime.__toESM(require("@langchain/core/prompts"));
const __langchain_core_runnables = require_rolldown_runtime.__toESM(require("@langchain/core/runnables"));
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));
const __langchain_core_utils_function_calling = require_rolldown_runtime.__toESM(require("@langchain/core/utils/function_calling"));

//#region src/agents/openai_functions/index.ts
/**
* Checks if the given action is a FunctionsAgentAction.
* @param action The action to check.
* @returns True if the action is a FunctionsAgentAction, false otherwise.
*/
function isFunctionsAgentAction(action) {
	return action.messageLog !== void 0;
}
function _convertAgentStepToMessages(action, observation) {
	if (isFunctionsAgentAction(action) && action.messageLog !== void 0) return action.messageLog?.concat(new __langchain_core_messages.FunctionMessage(observation, action.tool));
	else return [new __langchain_core_messages.AIMessage(action.log)];
}
function _formatIntermediateSteps(intermediateSteps) {
	return intermediateSteps.flatMap(({ action, observation }) => _convertAgentStepToMessages(action, observation));
}
/**
* Class representing an agent for the OpenAI chat model in LangChain. It
* extends the Agent class and provides additional functionality specific
* to the OpenAIAgent type.
*/
var OpenAIAgent = class OpenAIAgent extends require_agent.Agent {
	static lc_name() {
		return "OpenAIAgent";
	}
	lc_namespace = [
		"langchain",
		"agents",
		"openai"
	];
	_agentType() {
		return "openai-functions";
	}
	observationPrefix() {
		return "Observation: ";
	}
	llmPrefix() {
		return "Thought:";
	}
	_stop() {
		return ["Observation:"];
	}
	tools;
	outputParser = new require_output_parser.OpenAIFunctionsAgentOutputParser();
	constructor(input) {
		super({
			...input,
			outputParser: void 0
		});
		this.tools = input.tools;
	}
	/**
	* Creates a prompt for the OpenAIAgent using the provided tools and
	* fields.
	* @param _tools The tools to be used in the prompt.
	* @param fields Optional fields for creating the prompt.
	* @returns A BasePromptTemplate object representing the created prompt.
	*/
	static createPrompt(_tools, fields) {
		const { prefix = require_prompt.PREFIX } = fields || {};
		return __langchain_core_prompts.ChatPromptTemplate.fromMessages([
			__langchain_core_prompts.SystemMessagePromptTemplate.fromTemplate(prefix),
			new __langchain_core_prompts.MessagesPlaceholder("chat_history"),
			__langchain_core_prompts.HumanMessagePromptTemplate.fromTemplate("{input}"),
			new __langchain_core_prompts.MessagesPlaceholder("agent_scratchpad")
		]);
	}
	/**
	* Creates an OpenAIAgent from a BaseLanguageModel and a list of tools.
	* @param llm The BaseLanguageModel to use.
	* @param tools The tools to be used by the agent.
	* @param args Optional arguments for creating the agent.
	* @returns An instance of OpenAIAgent.
	*/
	static fromLLMAndTools(llm, tools, args) {
		OpenAIAgent.validateTools(tools);
		if (llm._modelType() !== "base_chat_model" || llm._llmType() !== "openai") throw new Error("OpenAIAgent requires an OpenAI chat model");
		const prompt = OpenAIAgent.createPrompt(tools, args);
		const chain = new require_llm_chain.LLMChain({
			prompt,
			llm,
			callbacks: args?.callbacks
		});
		return new OpenAIAgent({
			llmChain: chain,
			allowedTools: tools.map((t) => t.name),
			tools
		});
	}
	/**
	* Constructs a scratch pad from a list of agent steps.
	* @param steps The steps to include in the scratch pad.
	* @returns A string or a list of BaseMessages representing the constructed scratch pad.
	*/
	async constructScratchPad(steps) {
		return _formatIntermediateSteps(steps);
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
		const thoughts = await this.constructScratchPad(steps);
		const newInputs = {
			...inputs,
			agent_scratchpad: thoughts
		};
		if (this._stop().length !== 0) newInputs.stop = this._stop();
		const llm = this.llmChain.llm;
		const valuesForPrompt = { ...newInputs };
		const valuesForLLM = { functions: this.tools.map((tool) => (0, __langchain_core_utils_function_calling.convertToOpenAIFunction)(tool)) };
		const callKeys = "callKeys" in this.llmChain.llm ? this.llmChain.llm.callKeys : [];
		for (const key of callKeys) if (key in inputs) {
			valuesForLLM[key] = inputs[key];
			delete valuesForPrompt[key];
		}
		const promptValue = await this.llmChain.prompt.formatPromptValue(valuesForPrompt);
		const message = await llm.invoke(promptValue.toChatMessages(), {
			...valuesForLLM,
			callbacks: callbackManager
		});
		return this.outputParser.parseAIMessage(message);
	}
};
/**
* Create an agent that uses OpenAI-style function calling.
* @param params Params required to create the agent. Includes an LLM, tools, and prompt.
* @returns A runnable sequence representing an agent. It takes as input all the same input
*     variables as the prompt passed in does. It returns as output either an
*     AgentAction or AgentFinish.
*
* @example
* ```typescript
* import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
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
* // https://smith.langchain.com/hub/hwchase17/openai-functions-agent
* const prompt = await pull<ChatPromptTemplate>(
*   "hwchase17/openai-functions-agent"
* );
*
* const llm = new ChatOpenAI({
*   model: "gpt-4o-mini",
*   temperature: 0,
* });
*
* const agent = await createOpenAIFunctionsAgent({
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
async function createOpenAIFunctionsAgent({ llm, tools, prompt, streamRunnable }) {
	if (!prompt.inputVariables.includes("agent_scratchpad")) throw new Error([`Prompt must have an input variable named "agent_scratchpad".`, `Found ${JSON.stringify(prompt.inputVariables)} instead.`].join("\n"));
	const llmWithTools = llm.bindTools ? llm.bindTools(tools) : llm.withConfig({ functions: tools.map((tool) => (0, __langchain_core_utils_function_calling.convertToOpenAIFunction)(tool)) });
	const agent = require_agent.AgentRunnableSequence.fromRunnables([
		__langchain_core_runnables.RunnablePassthrough.assign({ agent_scratchpad: (input) => require_agents_format_scratchpad_openai_functions.formatToOpenAIFunctionMessages(input.steps) }),
		prompt,
		llmWithTools,
		new require_output_parser.OpenAIFunctionsAgentOutputParser()
	], {
		name: "OpenAIFunctionsAgent",
		streamRunnable,
		singleAction: true
	});
	return agent;
}

//#endregion
exports.OpenAIAgent = OpenAIAgent;
exports._formatIntermediateSteps = _formatIntermediateSteps;
exports.createOpenAIFunctionsAgent = createOpenAIFunctionsAgent;
//# sourceMappingURL=index.cjs.map