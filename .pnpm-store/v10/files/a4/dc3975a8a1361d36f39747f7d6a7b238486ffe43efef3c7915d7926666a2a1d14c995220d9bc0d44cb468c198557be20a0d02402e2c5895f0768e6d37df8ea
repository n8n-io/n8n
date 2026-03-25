const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_agent = require('../agent.cjs');
const require_llm_chain = require('../../chains/llm_chain.cjs');
const require_prompt = require('./prompt.cjs');
const require_outputParser = require('./outputParser.cjs');
const __langchain_core_prompts = require_rolldown_runtime.__toESM(require("@langchain/core/prompts"));
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));

//#region src/agents/chat_convo/index.ts
/**
* Agent for the MRKL chain.
* @augments Agent
*/
var ChatConversationalAgent = class ChatConversationalAgent extends require_agent.Agent {
	static lc_name() {
		return "ChatConversationalAgent";
	}
	lc_namespace = [
		"langchain",
		"agents",
		"chat_convo"
	];
	constructor(input) {
		const outputParser = input.outputParser ?? ChatConversationalAgent.getDefaultOutputParser();
		super({
			...input,
			outputParser
		});
	}
	_agentType() {
		return "chat-conversational-react-description";
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
	static validateTools(tools) {
		const descriptionlessTool = tools.find((tool) => !tool.description);
		if (descriptionlessTool) {
			const msg = `Got a tool ${descriptionlessTool.name} without a description. This agent requires descriptions for all tools.`;
			throw new Error(msg);
		}
	}
	/**
	* Constructs the agent scratchpad based on the agent steps. It returns an
	* array of base messages representing the thoughts of the agent.
	* @param steps The agent steps to construct the scratchpad from.
	* @returns An array of base messages representing the thoughts of the agent.
	*/
	async constructScratchPad(steps) {
		const thoughts = [];
		for (const step of steps) {
			thoughts.push(new __langchain_core_messages.AIMessage(step.action.log));
			thoughts.push(new __langchain_core_messages.HumanMessage((0, __langchain_core_prompts.renderTemplate)(require_prompt.TEMPLATE_TOOL_RESPONSE, "f-string", { observation: step.observation })));
		}
		return thoughts;
	}
	/**
	* Returns the default output parser for the ChatConversationalAgent
	* class. It takes optional fields as arguments to customize the output
	* parser.
	* @param fields Optional fields to customize the output parser.
	* @returns The default output parser for the ChatConversationalAgent class.
	*/
	static getDefaultOutputParser(fields) {
		if (fields?.llm) return require_outputParser.ChatConversationalAgentOutputParserWithRetries.fromLLM(fields.llm, { toolNames: fields.toolNames });
		return new require_outputParser.ChatConversationalAgentOutputParserWithRetries({ toolNames: fields?.toolNames });
	}
	/**
	* Create prompt in the style of the ChatConversationAgent.
	*
	* @param tools - List of tools the agent will have access to, used to format the prompt.
	* @param args - Arguments to create the prompt with.
	* @param args.systemMessage - String to put before the list of tools.
	* @param args.humanMessage - String to put after the list of tools.
	* @param args.outputParser - Output parser to use for formatting.
	*/
	static createPrompt(tools, args) {
		const systemMessage = (args?.systemMessage ?? require_prompt.DEFAULT_PREFIX) + require_prompt.PREFIX_END;
		const humanMessage = args?.humanMessage ?? require_prompt.DEFAULT_SUFFIX;
		const toolStrings = tools.map((tool) => `${tool.name}: ${tool.description}`).join("\n");
		const toolNames = tools.map((tool) => tool.name);
		const outputParser = args?.outputParser ?? ChatConversationalAgent.getDefaultOutputParser({ toolNames });
		const formatInstructions = outputParser.getFormatInstructions({ toolNames });
		const renderedHumanMessage = (0, __langchain_core_prompts.renderTemplate)(humanMessage, "f-string", {
			format_instructions: formatInstructions,
			tools: toolStrings
		});
		const messages = [
			__langchain_core_prompts.SystemMessagePromptTemplate.fromTemplate(systemMessage),
			new __langchain_core_prompts.MessagesPlaceholder("chat_history"),
			__langchain_core_prompts.HumanMessagePromptTemplate.fromTemplate(renderedHumanMessage),
			new __langchain_core_prompts.MessagesPlaceholder("agent_scratchpad")
		];
		return __langchain_core_prompts.ChatPromptTemplate.fromMessages(messages);
	}
	/**
	* Creates an instance of the ChatConversationalAgent class from a
	* BaseLanguageModel and a set of tools. It takes optional arguments to
	* customize the agent.
	* @param llm The BaseLanguageModel to create the agent from.
	* @param tools The set of tools to create the agent from.
	* @param args Optional arguments to customize the agent.
	* @returns An instance of the ChatConversationalAgent class.
	*/
	static fromLLMAndTools(llm, tools, args) {
		ChatConversationalAgent.validateTools(tools);
		const outputParser = args?.outputParser ?? ChatConversationalAgent.getDefaultOutputParser({
			llm,
			toolNames: tools.map((tool) => tool.name)
		});
		const prompt = ChatConversationalAgent.createPrompt(tools, {
			...args,
			outputParser
		});
		const chain = new require_llm_chain.LLMChain({
			prompt,
			llm,
			callbacks: args?.callbacks ?? args?.callbackManager
		});
		return new ChatConversationalAgent({
			llmChain: chain,
			outputParser,
			allowedTools: tools.map((t) => t.name)
		});
	}
};

//#endregion
exports.ChatConversationalAgent = ChatConversationalAgent;
//# sourceMappingURL=index.cjs.map