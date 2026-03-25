const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_types = require('../types.cjs');
const require_fix = require('../../output_parsers/fix.cjs');
const require_prompt = require('./prompt.cjs');
const __langchain_core_prompts = require_rolldown_runtime.__toESM(require("@langchain/core/prompts"));
const __langchain_core_output_parsers = require_rolldown_runtime.__toESM(require("@langchain/core/output_parsers"));

//#region src/agents/structured_chat/outputParser.ts
/**
* A class that provides a custom implementation for parsing the output of
* a StructuredChatAgent action. It extends the `AgentActionOutputParser`
* class and extracts the action and action input from the text output,
* returning an `AgentAction` or `AgentFinish` object.
*/
var StructuredChatOutputParser = class extends require_types.AgentActionOutputParser {
	lc_namespace = [
		"langchain",
		"agents",
		"structured_chat"
	];
	toolNames;
	constructor(fields) {
		super(...arguments);
		this.toolNames = fields.toolNames;
	}
	/**
	* Parses the given text and returns an `AgentAction` or `AgentFinish`
	* object. If an `OutputFixingParser` is provided, it is used for parsing;
	* otherwise, the base parser is used.
	* @param text The text to parse.
	* @param callbacks Optional callbacks for asynchronous operations.
	* @returns A Promise that resolves to an `AgentAction` or `AgentFinish` object.
	*/
	async parse(text) {
		try {
			const regex = /```(?:json)?(.*)(```)/gs;
			const actionMatch = regex.exec(text);
			if (actionMatch === null) throw new __langchain_core_output_parsers.OutputParserException(`Could not parse an action. The agent action must be within a markdown code block, and "action" must be a provided tool or "Final Answer"`);
			const response = JSON.parse(actionMatch[1].trim());
			const { action, action_input } = response;
			if (action === "Final Answer") return {
				returnValues: { output: action_input },
				log: text
			};
			return {
				tool: action,
				toolInput: action_input || {},
				log: text
			};
		} catch (e) {
			throw new __langchain_core_output_parsers.OutputParserException(`Failed to parse. Text: "${text}". Error: ${e}`);
		}
	}
	/**
	* Returns the format instructions for parsing the output of an agent
	* action in the style of the StructuredChatAgent.
	* @returns A string representing the format instructions.
	*/
	getFormatInstructions() {
		return (0, __langchain_core_prompts.renderTemplate)(require_prompt.AGENT_ACTION_FORMAT_INSTRUCTIONS, "f-string", { tool_names: this.toolNames.join(", ") });
	}
};
/**
* A class that provides a wrapper around the `StructuredChatOutputParser`
* and `OutputFixingParser` classes. It extends the
* `AgentActionOutputParser` class and allows for retrying the output
* parsing using the `OutputFixingParser` if it is provided.
* @example
* ```typescript
* const outputParser = new StructuredChatOutputParserWithRetries.fromLLM(
*   new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 }),
*   {
*     toolNames: ["calculator", "random-number-generator"],
*   },
* );
* const result = await outputParser.parse(
*  "What is a random number between 5 and 10 raised to the second power?"
* );
* ```
*/
var StructuredChatOutputParserWithRetries = class StructuredChatOutputParserWithRetries extends require_types.AgentActionOutputParser {
	lc_namespace = [
		"langchain",
		"agents",
		"structured_chat"
	];
	baseParser;
	outputFixingParser;
	toolNames = [];
	constructor(fields) {
		super(fields);
		this.toolNames = fields.toolNames ?? this.toolNames;
		this.baseParser = fields?.baseParser ?? new StructuredChatOutputParser({ toolNames: this.toolNames });
		this.outputFixingParser = fields?.outputFixingParser;
	}
	/**
	* Parses the given text and returns an `AgentAction` or `AgentFinish`
	* object. Throws an `OutputParserException` if the parsing fails.
	* @param text The text to parse.
	* @returns A Promise that resolves to an `AgentAction` or `AgentFinish` object.
	*/
	async parse(text, callbacks) {
		if (this.outputFixingParser !== void 0) return this.outputFixingParser.parse(text, callbacks);
		return this.baseParser.parse(text);
	}
	/**
	* Returns the format instructions for parsing the output of an agent
	* action in the style of the StructuredChatAgent.
	* @returns A string representing the format instructions.
	*/
	getFormatInstructions() {
		return (0, __langchain_core_prompts.renderTemplate)(require_prompt.FORMAT_INSTRUCTIONS, "f-string", { tool_names: this.toolNames.join(", ") });
	}
	/**
	* Creates a new `StructuredChatOutputParserWithRetries` instance from a
	* `BaseLanguageModel` and options. The options can include a base parser
	* and tool names.
	* @param llm A `BaseLanguageModel` instance.
	* @param options Options for creating a `StructuredChatOutputParserWithRetries` instance.
	* @returns A new `StructuredChatOutputParserWithRetries` instance.
	*/
	static fromLLM(llm, options) {
		const baseParser = options.baseParser ?? new StructuredChatOutputParser({ toolNames: options.toolNames ?? [] });
		const outputFixingParser = require_fix.OutputFixingParser.fromLLM(llm, baseParser);
		return new StructuredChatOutputParserWithRetries({
			baseParser,
			outputFixingParser,
			toolNames: options.toolNames
		});
	}
};

//#endregion
exports.StructuredChatOutputParser = StructuredChatOutputParser;
exports.StructuredChatOutputParserWithRetries = StructuredChatOutputParserWithRetries;
//# sourceMappingURL=outputParser.cjs.map