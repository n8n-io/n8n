import { Agent } from "../agent.js";
import { LLMChain } from "../../chains/llm_chain.js";
import { DEFAULT_PREFIX, DEFAULT_SUFFIX, PREFIX_END, TEMPLATE_TOOL_RESPONSE } from "./prompt.js";
import { ChatConversationalAgentOutputParserWithRetries } from "./outputParser.js";
import { ChatPromptTemplate, HumanMessagePromptTemplate, MessagesPlaceholder, SystemMessagePromptTemplate, renderTemplate } from "@langchain/core/prompts";
import { AIMessage, HumanMessage } from "@langchain/core/messages";

//#region src/agents/chat_convo/index.ts
/**
* Agent for the MRKL chain.
* @augments Agent
*/
var ChatConversationalAgent = class ChatConversationalAgent extends Agent {
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
			thoughts.push(new AIMessage(step.action.log));
			thoughts.push(new HumanMessage(renderTemplate(TEMPLATE_TOOL_RESPONSE, "f-string", { observation: step.observation })));
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
		if (fields?.llm) return ChatConversationalAgentOutputParserWithRetries.fromLLM(fields.llm, { toolNames: fields.toolNames });
		return new ChatConversationalAgentOutputParserWithRetries({ toolNames: fields?.toolNames });
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
		const systemMessage = (args?.systemMessage ?? DEFAULT_PREFIX) + PREFIX_END;
		const humanMessage = args?.humanMessage ?? DEFAULT_SUFFIX;
		const toolStrings = tools.map((tool) => `${tool.name}: ${tool.description}`).join("\n");
		const toolNames = tools.map((tool) => tool.name);
		const outputParser = args?.outputParser ?? ChatConversationalAgent.getDefaultOutputParser({ toolNames });
		const formatInstructions = outputParser.getFormatInstructions({ toolNames });
		const renderedHumanMessage = renderTemplate(humanMessage, "f-string", {
			format_instructions: formatInstructions,
			tools: toolStrings
		});
		const messages = [
			SystemMessagePromptTemplate.fromTemplate(systemMessage),
			new MessagesPlaceholder("chat_history"),
			HumanMessagePromptTemplate.fromTemplate(renderedHumanMessage),
			new MessagesPlaceholder("agent_scratchpad")
		];
		return ChatPromptTemplate.fromMessages(messages);
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
		const chain = new LLMChain({
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
export { ChatConversationalAgent };
//# sourceMappingURL=index.js.map