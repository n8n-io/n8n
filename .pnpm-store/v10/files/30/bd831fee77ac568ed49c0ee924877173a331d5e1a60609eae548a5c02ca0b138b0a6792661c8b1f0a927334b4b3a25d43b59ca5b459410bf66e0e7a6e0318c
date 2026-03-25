const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_agent = require('../agent.cjs');
const require_llm_chain = require('../../chains/llm_chain.cjs');
const require_helpers = require('../helpers.cjs');
const require_prompt = require('./prompt.cjs');
const require_outputParser = require('./outputParser.cjs');
const __langchain_core_prompts = require_rolldown_runtime.__toESM(require("@langchain/core/prompts"));

//#region src/agents/mrkl/index.ts
/**
* Agent for the MRKL chain.
* @augments Agent
* @example
* ```typescript
*
* const agent = new ZeroShotAgent({
*   llmChain: new LLMChain({
*     llm: new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 }),
*     prompt: ZeroShotAgent.createPrompt([new SerpAPI(), new Calculator()], {
*       prefix: `Answer the following questions as best you can, but speaking as a pirate might speak. You have access to the following tools:`,
*       suffix: `Begin! Remember to speak as a pirate when giving your final answer. Use lots of "Args"
* Question: {input}
* {agent_scratchpad}`,
*       inputVariables: ["input", "agent_scratchpad"],
*     }),
*   }),
*   allowedTools: ["search", "calculator"],
* });
*
* const result = await agent.invoke({
*   input: `Who is Olivia Wilde's boyfriend? What is his current age raised to the 0.23 power?`,
* });
* ```
*/
var ZeroShotAgent = class ZeroShotAgent extends require_agent.Agent {
	static lc_name() {
		return "ZeroShotAgent";
	}
	lc_namespace = [
		"langchain",
		"agents",
		"mrkl"
	];
	constructor(input) {
		const outputParser = input?.outputParser ?? ZeroShotAgent.getDefaultOutputParser();
		super({
			...input,
			outputParser
		});
	}
	_agentType() {
		return "zero-shot-react-description";
	}
	observationPrefix() {
		return "Observation: ";
	}
	llmPrefix() {
		return "Thought:";
	}
	/**
	* Returns the default output parser for the ZeroShotAgent.
	* @param fields Optional arguments for the output parser.
	* @returns An instance of ZeroShotAgentOutputParser.
	*/
	static getDefaultOutputParser(fields) {
		return new require_outputParser.ZeroShotAgentOutputParser(fields);
	}
	/**
	* Validates the tools for the ZeroShotAgent. Throws an error if any tool
	* does not have a description.
	* @param tools List of tools to validate.
	*/
	static validateTools(tools) {
		const descriptionlessTool = tools.find((tool) => !tool.description);
		if (descriptionlessTool) {
			const msg = `Got a tool ${descriptionlessTool.name} without a description. This agent requires descriptions for all tools.`;
			throw new Error(msg);
		}
	}
	/**
	* Create prompt in the style of the zero shot agent.
	*
	* @param tools - List of tools the agent will have access to, used to format the prompt.
	* @param args - Arguments to create the prompt with.
	* @param args.suffix - String to put after the list of tools.
	* @param args.prefix - String to put before the list of tools.
	* @param args.inputVariables - List of input variables the final prompt will expect.
	*/
	static createPrompt(tools, args) {
		const { prefix = require_prompt.PREFIX, suffix = require_prompt.SUFFIX, inputVariables = ["input", "agent_scratchpad"] } = args ?? {};
		const toolStrings = tools.map((tool) => `${tool.name}: ${tool.description}`).join("\n");
		const toolNames = tools.map((tool) => `"${tool.name}"`).join(", ");
		const formatInstructions = (0, __langchain_core_prompts.renderTemplate)(require_prompt.FORMAT_INSTRUCTIONS, "f-string", { tool_names: toolNames });
		const template = [
			prefix,
			toolStrings,
			formatInstructions,
			suffix
		].join("\n\n");
		return new __langchain_core_prompts.PromptTemplate({
			template,
			inputVariables
		});
	}
	/**
	* Creates a ZeroShotAgent from a Large Language Model and a set of tools.
	* @param llm The Large Language Model to use.
	* @param tools The tools for the agent to use.
	* @param args Optional arguments for creating the agent.
	* @returns A new instance of ZeroShotAgent.
	*/
	static fromLLMAndTools(llm, tools, args) {
		ZeroShotAgent.validateTools(tools);
		const prompt = ZeroShotAgent.createPrompt(tools, args);
		const outputParser = args?.outputParser ?? ZeroShotAgent.getDefaultOutputParser();
		const chain = new require_llm_chain.LLMChain({
			prompt,
			llm,
			callbacks: args?.callbacks ?? args?.callbackManager
		});
		return new ZeroShotAgent({
			llmChain: chain,
			allowedTools: tools.map((t) => t.name),
			outputParser
		});
	}
	static async deserialize(data) {
		const { llm, tools,...rest } = data;
		return require_helpers.deserializeHelper(llm, tools, rest, (llm$1, tools$1, args) => ZeroShotAgent.fromLLMAndTools(llm$1, tools$1, {
			prefix: args.prefix,
			suffix: args.suffix,
			inputVariables: args.input_variables
		}), (args) => new ZeroShotAgent(args));
	}
};

//#endregion
exports.ZeroShotAgent = ZeroShotAgent;
//# sourceMappingURL=index.cjs.map