const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_types = require('../types.cjs');
const __langchain_core_output_parsers = require_rolldown_runtime.__toESM(require("@langchain/core/output_parsers"));
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));

//#region src/agents/openai_functions/output_parser.ts
/**
* @example
* ```typescript
*
* const prompt = ChatPromptTemplate.fromMessages([
*   ["ai", "You are a helpful assistant"],
*   ["human", "{input}"],
*   new MessagesPlaceholder("agent_scratchpad"),
* ]);
*
* const modelWithFunctions = new ChatOpenAI({
*   model: "gpt-4",
*   temperature: 0,
* }).bindTools(tools);
*
* const runnableAgent = RunnableSequence.from([
*   {
*     input: (i) => i.input,
*     agent_scratchpad: (i) => formatAgentSteps(i.steps),
*   },
*   prompt,
*   modelWithFunctions,
*   new OpenAIFunctionsAgentOutputParser(),
* ]);
*
* const result = await runnableAgent.invoke({
*   input: "What is the weather in New York?",
*   steps: agentSteps,
* });
*
* ```
*/
var OpenAIFunctionsAgentOutputParser = class extends require_types.AgentActionOutputParser {
	lc_namespace = [
		"langchain",
		"agents",
		"openai"
	];
	static lc_name() {
		return "OpenAIFunctionsAgentOutputParser";
	}
	async parse(text) {
		throw new Error(`OpenAIFunctionsAgentOutputParser can only parse messages.\nPassed input: ${text}`);
	}
	async parseResult(generations) {
		if ("message" in generations[0] && (0, __langchain_core_messages.isBaseMessage)(generations[0].message)) return this.parseAIMessage(generations[0].message);
		throw new Error("parseResult on OpenAIFunctionsAgentOutputParser only works on ChatGeneration output");
	}
	/**
	* Parses the output message into a FunctionsAgentAction or AgentFinish
	* object.
	* @param message The BaseMessage to parse.
	* @returns A FunctionsAgentAction or AgentFinish object.
	*/
	parseAIMessage(message) {
		if (message.content && typeof message.content !== "string") throw new Error("This agent cannot parse non-string model responses.");
		if (message.additional_kwargs.function_call) {
			const function_call = message.additional_kwargs.function_call;
			try {
				const toolInput = function_call.arguments ? JSON.parse(function_call.arguments) : {};
				return {
					tool: function_call.name,
					toolInput,
					log: `Invoking "${function_call.name}" with ${function_call.arguments ?? "{}"}\n${message.content}`,
					messageLog: [message]
				};
			} catch (error) {
				throw new __langchain_core_output_parsers.OutputParserException(`Failed to parse function arguments from chat model response. Text: "${function_call.arguments}". ${error}`);
			}
		} else return {
			returnValues: { output: message.content },
			log: message.content
		};
	}
	getFormatInstructions() {
		throw new Error("getFormatInstructions not implemented inside OpenAIFunctionsAgentOutputParser.");
	}
};

//#endregion
exports.OpenAIFunctionsAgentOutputParser = OpenAIFunctionsAgentOutputParser;
//# sourceMappingURL=output_parser.cjs.map