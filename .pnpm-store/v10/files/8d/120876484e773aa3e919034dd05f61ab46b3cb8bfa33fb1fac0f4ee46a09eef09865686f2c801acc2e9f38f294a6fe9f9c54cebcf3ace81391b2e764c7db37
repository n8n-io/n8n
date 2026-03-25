import { __export } from "../../_virtual/rolldown_runtime.js";
import { AgentActionOutputParser } from "../types.js";
import { FORMAT_INSTRUCTIONS } from "./prompt.js";
import { renderTemplate } from "@langchain/core/prompts";
import { OutputParserException } from "@langchain/core/output_parsers";

//#region src/agents/react/output_parser.ts
var output_parser_exports = {};
__export(output_parser_exports, { ReActSingleInputOutputParser: () => ReActSingleInputOutputParser });
const FINAL_ANSWER_ACTION = "Final Answer:";
const FINAL_ANSWER_AND_PARSABLE_ACTION_ERROR_MESSAGE = "Parsing LLM output produced both a final answer and a parse-able action:";
/**
* Parses ReAct-style LLM calls that have a single tool input.
*
* Expects output to be in one of two formats.
*
* If the output signals that an action should be taken,
* should be in the below format. This will result in an AgentAction
* being returned.
*
* ```
* Thought: agent thought here
* Action: search
* Action Input: what is the temperature in SF?
* ```
*
* If the output signals that a final answer should be given,
* should be in the below format. This will result in an AgentFinish
* being returned.
*
* ```
* Thought: agent thought here
* Final Answer: The temperature is 100 degrees
* ```
* @example
* ```typescript
*
* const runnableAgent = RunnableSequence.from([
*   ...rest of runnable
*   new ReActSingleInputOutputParser({ toolNames: ["SerpAPI", "Calculator"] }),
* ]);
* const agent = AgentExecutor.fromAgentAndTools({
*   agent: runnableAgent,
*   tools: [new SerpAPI(), new Calculator()],
* });
* const result = await agent.invoke({
*   input: "whats the weather in pomfret?",
* });
* ```
*/
var ReActSingleInputOutputParser = class extends AgentActionOutputParser {
	lc_namespace = [
		"langchain",
		"agents",
		"react"
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
		const includesAnswer = text.includes(FINAL_ANSWER_ACTION);
		const regex = /Action\s*\d*\s*:[\s]*(.*?)[\s]*Action\s*\d*\s*Input\s*\d*\s*:[\s]*(.*)/;
		const actionMatch = text.match(regex);
		if (actionMatch) {
			if (includesAnswer) throw new OutputParserException(`${FINAL_ANSWER_AND_PARSABLE_ACTION_ERROR_MESSAGE}: ${text}`);
			const action = actionMatch[1];
			const actionInput = actionMatch[2];
			const toolInput = actionInput.trim().replace(/^"|"$/g, "");
			return {
				tool: action,
				toolInput,
				log: text
			};
		}
		if (includesAnswer) {
			const finalAnswerText = text.split(FINAL_ANSWER_ACTION)[1].trim();
			return {
				returnValues: { output: finalAnswerText },
				log: text
			};
		}
		throw new OutputParserException(`Could not parse LLM output: ${text}`);
	}
	/**
	* Returns the format instructions as a string. If the 'raw' option is
	* true, returns the raw FORMAT_INSTRUCTIONS.
	* @param options Options for getting the format instructions.
	* @returns Format instructions as a string.
	*/
	getFormatInstructions() {
		return renderTemplate(FORMAT_INSTRUCTIONS, "f-string", { tool_names: this.toolNames.join(", ") });
	}
};

//#endregion
export { ReActSingleInputOutputParser, output_parser_exports };
//# sourceMappingURL=output_parser.js.map