const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_types = require('../types.cjs');
const require_prompt = require('./prompt.cjs');
const require_fix = require('../../output_parsers/fix.cjs');
const __langchain_core_prompts = require_rolldown_runtime.__toESM(require("@langchain/core/prompts"));
const __langchain_core_output_parsers = require_rolldown_runtime.__toESM(require("@langchain/core/output_parsers"));

//#region src/agents/chat_convo/outputParser.ts
/**
* Class that represents an output parser for the ChatConversationalAgent
* class. It extends the AgentActionOutputParser class and provides
* methods for parsing the output of the MRKL chain into agent actions.
*/
var ChatConversationalAgentOutputParser = class extends require_types.AgentActionOutputParser {
	lc_namespace = [
		"langchain",
		"agents",
		"chat_convo"
	];
	toolNames;
	constructor(fields) {
		super(...arguments);
		this.toolNames = fields.toolNames;
	}
	/**
	* Parses the given text into an AgentAction or AgentFinish object. If an
	* output fixing parser is defined, uses it to parse the text.
	* @param text Text to parse.
	* @returns Promise that resolves to an AgentAction or AgentFinish object.
	*/
	async parse(text) {
		let jsonOutput = text.trim();
		if (jsonOutput.includes("```json") || jsonOutput.includes("```")) {
			const testString = jsonOutput.includes("```json") ? "```json" : "```";
			const firstIndex = jsonOutput.indexOf(testString);
			const actionInputIndex = jsonOutput.indexOf("action_input");
			if (actionInputIndex > firstIndex) {
				jsonOutput = jsonOutput.slice(firstIndex + testString.length).trimStart();
				const lastIndex = jsonOutput.lastIndexOf("```");
				if (lastIndex !== -1) jsonOutput = jsonOutput.slice(0, lastIndex).trimEnd();
			}
		}
		try {
			const response = JSON.parse(jsonOutput);
			const { action, action_input } = response;
			if (action === "Final Answer") return {
				returnValues: { output: action_input },
				log: text
			};
			return {
				tool: action,
				toolInput: action_input,
				log: text
			};
		} catch (e) {
			throw new __langchain_core_output_parsers.OutputParserException(`Failed to parse. Text: "${text}". Error: ${e}`);
		}
	}
	/**
	* Returns the format instructions as a string. If the 'raw' option is
	* true, returns the raw FORMAT_INSTRUCTIONS.
	* @param options Options for getting the format instructions.
	* @returns Format instructions as a string.
	*/
	getFormatInstructions() {
		return (0, __langchain_core_prompts.renderTemplate)(require_prompt.FORMAT_INSTRUCTIONS, "f-string", { tool_names: this.toolNames.join(", ") });
	}
};
/**
* Class that represents an output parser with retries for the
* ChatConversationalAgent class. It extends the AgentActionOutputParser
* class and provides methods for parsing the output of the MRKL chain
* into agent actions with retry functionality.
*/
var ChatConversationalAgentOutputParserWithRetries = class ChatConversationalAgentOutputParserWithRetries extends require_types.AgentActionOutputParser {
	lc_namespace = [
		"langchain",
		"agents",
		"chat_convo"
	];
	baseParser;
	outputFixingParser;
	toolNames = [];
	constructor(fields) {
		super(fields);
		this.toolNames = fields.toolNames ?? this.toolNames;
		this.baseParser = fields?.baseParser ?? new ChatConversationalAgentOutputParser({ toolNames: this.toolNames });
		this.outputFixingParser = fields?.outputFixingParser;
	}
	/**
	* Returns the format instructions as a string.
	* @returns Format instructions as a string.
	*/
	getFormatInstructions(options) {
		if (options.raw) return require_prompt.FORMAT_INSTRUCTIONS;
		return (0, __langchain_core_prompts.renderTemplate)(require_prompt.FORMAT_INSTRUCTIONS, "f-string", { tool_names: options.toolNames.join(", ") });
	}
	/**
	* Parses the given text into an AgentAction or AgentFinish object.
	* @param text Text to parse.
	* @returns Promise that resolves to an AgentAction or AgentFinish object.
	*/
	async parse(text) {
		if (this.outputFixingParser !== void 0) return this.outputFixingParser.parse(text);
		return this.baseParser.parse(text);
	}
	/**
	* Static method to create a new
	* ChatConversationalAgentOutputParserWithRetries from a BaseLanguageModelInterface
	* and options. If no base parser is provided in the options, a new
	* ChatConversationalAgentOutputParser is created. An OutputFixingParser
	* is also created from the BaseLanguageModelInterface and the base parser.
	* @param llm BaseLanguageModelInterface instance used to create the OutputFixingParser.
	* @param options Options for creating the ChatConversationalAgentOutputParserWithRetries instance.
	* @returns A new instance of ChatConversationalAgentOutputParserWithRetries.
	*/
	static fromLLM(llm, options) {
		const baseParser = options.baseParser ?? new ChatConversationalAgentOutputParser({ toolNames: options.toolNames ?? [] });
		const outputFixingParser = require_fix.OutputFixingParser.fromLLM(llm, baseParser);
		return new ChatConversationalAgentOutputParserWithRetries({
			baseParser,
			outputFixingParser,
			toolNames: options.toolNames
		});
	}
};

//#endregion
exports.ChatConversationalAgentOutputParser = ChatConversationalAgentOutputParser;
exports.ChatConversationalAgentOutputParserWithRetries = ChatConversationalAgentOutputParserWithRetries;
//# sourceMappingURL=outputParser.cjs.map