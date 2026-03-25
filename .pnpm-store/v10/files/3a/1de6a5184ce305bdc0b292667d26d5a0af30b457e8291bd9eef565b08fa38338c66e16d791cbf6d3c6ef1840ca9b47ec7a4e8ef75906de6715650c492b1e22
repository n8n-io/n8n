const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_types = require('../types.cjs');
const require_prompt = require('./prompt.cjs');
const __langchain_core_output_parsers = require_rolldown_runtime.__toESM(require("@langchain/core/output_parsers"));

//#region src/agents/chat/outputParser.ts
const FINAL_ANSWER_ACTION = "Final Answer:";
/**
* A class that extends the AgentActionOutputParser to parse the output of
* the ChatAgent in LangChain. It checks if the output text contains the
* final answer action or a JSON response, and parses it accordingly.
* @example
* ```typescript
* const prompt = ChatPromptTemplate.fromMessages([
*   [
*     "ai",
*     `{PREFIX}
* {FORMAT_INSTRUCTIONS}
* {SUFFIX}`,
*   ],
*   ["human", "Question: {input}"],
* ]);
* const runnableAgent = RunnableSequence.from([
*   {
*     input: (i: { input: string; steps: AgentStep[] }) => i.input,
*     agent_scratchpad: (i: { input: string; steps: AgentStep[] }) =>
*       formatLogToString(i.steps),
*   },
*   prompt,
*   new OpenAI({ temperature: 0 }),
*   new ChatAgentOutputParser(),
* ]);
*
* const executor = AgentExecutor.fromAgentAndTools({
*   agent: runnableAgent,
*   tools: [new SerpAPI(), new Calculator()],
* });
*
* const result = await executor.invoke({
*   input:
*     "Who is Olivia Wilde's boyfriend? What is his current age raised to the 0.23 power?",
* });
* ```
*/
var ChatAgentOutputParser = class extends require_types.AgentActionOutputParser {
	lc_namespace = [
		"langchain",
		"agents",
		"chat"
	];
	/**
	* Parses the output text from the MRKL chain into an agent action or
	* agent finish. If the text contains the final answer action or does not
	* contain an action, it returns an AgentFinish with the output and log.
	* If the text contains a JSON response, it returns the tool, toolInput,
	* and log.
	* @param text The output text from the MRKL chain.
	* @returns An object that satisfies the AgentFinish interface or an object with the tool, toolInput, and log.
	*/
	async parse(text) {
		if (text.includes(FINAL_ANSWER_ACTION) || !text.includes(`"action":`)) {
			const parts = text.split(FINAL_ANSWER_ACTION);
			const output = parts[parts.length - 1].trim();
			return {
				returnValues: { output },
				log: text
			};
		}
		const action = text.includes("```") ? text.trim().split(/```(?:json)?/)[1] : text.trim();
		try {
			const response = JSON.parse(action.trim());
			return {
				tool: response.action,
				toolInput: response.action_input,
				log: text
			};
		} catch {
			throw new __langchain_core_output_parsers.OutputParserException(`Unable to parse JSON response from chat agent.\n\n${text}`);
		}
	}
	/**
	* Returns the format instructions used in the output parser for the
	* ChatAgent class.
	* @returns The format instructions as a string.
	*/
	getFormatInstructions() {
		return require_prompt.FORMAT_INSTRUCTIONS;
	}
};

//#endregion
exports.ChatAgentOutputParser = ChatAgentOutputParser;
//# sourceMappingURL=outputParser.cjs.map