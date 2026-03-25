import { AgentMultiActionOutputParser } from "../types.js";
import { OutputParserException } from "@langchain/core/output_parsers";
import { isBaseMessage } from "@langchain/core/messages";

//#region src/agents/openai_tools/output_parser.ts
/**
* @example
* ```typescript
* const prompt = ChatPromptTemplate.fromMessages([
*   ["ai", "You are a helpful assistant"],
*   ["human", "{input}"],
*   new MessagesPlaceholder("agent_scratchpad"),
* ]);
*
* const runnableAgent = RunnableSequence.from([
*   {
*     input: (i: { input: string; steps: ToolsAgentStep[] }) => i.input,
*     agent_scratchpad: (i: { input: string; steps: ToolsAgentStep[] }) =>
*       formatToOpenAIToolMessages(i.steps),
*   },
*   prompt,
*   new ChatOpenAI({
*     model: "gpt-3.5-turbo-1106",
*     temperature: 0,
*   }).bindTools(tools),
*   new OpenAIToolsAgentOutputParser(),
* ]).withConfig({ runName: "OpenAIToolsAgent" });
*
* const result = await runnableAgent.invoke({
*   input:
*     "What is the sum of the current temperature in San Francisco, New York, and Tokyo?",
* });
* ```
*/
var OpenAIToolsAgentOutputParser = class extends AgentMultiActionOutputParser {
	lc_namespace = [
		"langchain",
		"agents",
		"openai"
	];
	static lc_name() {
		return "OpenAIToolsAgentOutputParser";
	}
	async parse(text) {
		throw new Error(`OpenAIFunctionsAgentOutputParser can only parse messages.\nPassed input: ${text}`);
	}
	async parseResult(generations) {
		if ("message" in generations[0] && isBaseMessage(generations[0].message)) return this.parseAIMessage(generations[0].message);
		throw new Error("parseResult on OpenAIFunctionsAgentOutputParser only works on ChatGeneration output");
	}
	/**
	* Parses the output message into a ToolsAgentAction[] or AgentFinish
	* object.
	* @param message The BaseMessage to parse.
	* @returns A ToolsAgentAction[] or AgentFinish object.
	*/
	parseAIMessage(message) {
		if (message.content && typeof message.content !== "string") throw new Error("This agent cannot parse non-string model responses.");
		if (message.additional_kwargs.tool_calls) {
			const toolCalls = message.additional_kwargs.tool_calls;
			try {
				return toolCalls.map((toolCall, i) => {
					if (toolCall.type === "function") {
						const toolInput = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {};
						const messageLog = i === 0 ? [message] : [];
						return {
							tool: toolCall.function.name,
							toolInput,
							toolCallId: toolCall.id,
							log: `Invoking "${toolCall.function.name}" with ${toolCall.function.arguments ?? "{}"}\n${message.content}`,
							messageLog
						};
					}
					return void 0;
				}).filter(Boolean);
			} catch (error) {
				throw new OutputParserException(`Failed to parse tool arguments from chat model response. Text: "${JSON.stringify(toolCalls)}". ${error}`);
			}
		} else return {
			returnValues: { output: message.content },
			log: message.content
		};
	}
	getFormatInstructions() {
		throw new Error("getFormatInstructions not implemented inside OpenAIToolsAgentOutputParser.");
	}
};

//#endregion
export { OpenAIToolsAgentOutputParser };
//# sourceMappingURL=output_parser.js.map