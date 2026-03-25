const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_types = require('../types.cjs');
const require_prompt = require('./prompt.cjs');
const __langchain_core_output_parsers = require_rolldown_runtime.__toESM(require("@langchain/core/output_parsers"));

//#region src/agents/mrkl/outputParser.ts
const FINAL_ANSWER_ACTION = "Final Answer:";
/**
* A class that extends `AgentActionOutputParser` to provide a custom
* implementation for parsing the output of a ZeroShotAgent action.
*/
var ZeroShotAgentOutputParser = class extends require_types.AgentActionOutputParser {
	lc_namespace = [
		"langchain",
		"agents",
		"mrkl"
	];
	finishToolName;
	constructor(fields) {
		super(fields);
		this.finishToolName = fields?.finishToolName || FINAL_ANSWER_ACTION;
	}
	/**
	* Parses the text output of an agent action, extracting the tool, tool
	* input, and output.
	* @param text The text output of an agent action.
	* @returns An object containing the tool, tool input, and output extracted from the text, along with the original text as a log.
	*/
	async parse(text) {
		if (text.includes(this.finishToolName)) {
			const parts = text.split(this.finishToolName);
			const output = parts[parts.length - 1].trim();
			return {
				returnValues: { output },
				log: text
			};
		}
		const match = /Action:([\s\S]*?)(?:\nAction Input:([\s\S]*?))?$/.exec(text);
		if (!match) throw new __langchain_core_output_parsers.OutputParserException(`Could not parse LLM output: ${text}`);
		return {
			tool: match[1].trim(),
			toolInput: match[2] ? match[2].trim().replace(/^("+)(.*?)(\1)$/, "$2") : "",
			log: text
		};
	}
	/**
	* Returns the format instructions for parsing the output of an agent
	* action in the style of the ZeroShotAgent.
	* @returns The format instructions for parsing the output.
	*/
	getFormatInstructions() {
		return require_prompt.FORMAT_INSTRUCTIONS;
	}
};

//#endregion
exports.ZeroShotAgentOutputParser = ZeroShotAgentOutputParser;
//# sourceMappingURL=outputParser.cjs.map