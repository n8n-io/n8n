import { __export } from "../../_virtual/rolldown_runtime.js";
import { AgentActionOutputParser } from "../types.js";
import { OutputParserException } from "@langchain/core/output_parsers";

//#region src/agents/xml/output_parser.ts
var output_parser_exports = {};
__export(output_parser_exports, { XMLAgentOutputParser: () => XMLAgentOutputParser });
/**
* @example
* ```typescript
* const prompt = ChatPromptTemplate.fromMessages([
*   HumanMessagePromptTemplate.fromTemplate(AGENT_INSTRUCTIONS),
*   new MessagesPlaceholder("agent_scratchpad"),
* ]);
* const runnableAgent = RunnableSequence.from([
*   ...rest of runnable
*   prompt,
*   new ChatAnthropic({ modelName: "claude-2", temperature: 0 }).withConfig({
*     stop: ["</tool_input>", "</final_answer>"],
*   }),
*   new XMLAgentOutputParser(),
* ]);
* const result = await executor.invoke({
*   input: "What is the weather in Honolulu?",
*   tools: [],
* });
* ```
*/
var XMLAgentOutputParser = class extends AgentActionOutputParser {
	lc_namespace = [
		"langchain",
		"agents",
		"xml"
	];
	static lc_name() {
		return "XMLAgentOutputParser";
	}
	/**
	* Parses the output text from the agent and returns an AgentAction or
	* AgentFinish object.
	* @param text The output text from the agent.
	* @returns An AgentAction or AgentFinish object.
	*/
	async parse(text) {
		if (text.includes("</tool>")) {
			const _toolMatch = text.match(/<tool>([^<]*)<\/tool>/);
			const _tool = _toolMatch ? _toolMatch[1] : "";
			const _toolInputMatch = text.match(/<tool_input>([^<]*?)(?:<\/tool_input>|$)/);
			const _toolInput = _toolInputMatch ? _toolInputMatch[1] : "";
			return {
				tool: _tool,
				toolInput: _toolInput,
				log: text
			};
		} else if (text.includes("<final_answer>")) {
			const answerMatch = text.match(/<final_answer>([^<]*?)(?:<\/final_answer>|$)/);
			const answer = answerMatch ? answerMatch[1] : "";
			return {
				returnValues: { output: answer },
				log: text
			};
		} else throw new OutputParserException(`Could not parse LLM output: ${text}`);
	}
	getFormatInstructions() {
		throw new Error("getFormatInstructions not implemented inside OpenAIFunctionsAgentOutputParser.");
	}
};

//#endregion
export { XMLAgentOutputParser, output_parser_exports };
//# sourceMappingURL=output_parser.js.map