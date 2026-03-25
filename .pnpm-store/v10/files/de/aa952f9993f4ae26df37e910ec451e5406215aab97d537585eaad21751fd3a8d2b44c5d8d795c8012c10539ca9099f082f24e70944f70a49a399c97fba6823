import { __export } from "../../_virtual/rolldown_runtime.js";
import { TEMPLATE_TOOL_RESPONSE } from "../chat_convo/prompt.js";
import { renderTemplate } from "@langchain/core/prompts";
import { AIMessage, FunctionMessage, HumanMessage } from "@langchain/core/messages";

//#region src/agents/format_scratchpad/openai_functions.ts
var openai_functions_exports = {};
__export(openai_functions_exports, {
	formatForOpenAIFunctions: () => formatForOpenAIFunctions,
	formatToOpenAIFunctionMessages: () => formatToOpenAIFunctionMessages
});
/**
* Format a list of AgentSteps into a list of BaseMessage instances for
* agents that use OpenAI's API. Helpful for passing in previous agent
* step context into new iterations.
*
* @param steps A list of AgentSteps to format.
* @returns A list of BaseMessages.
*/
function formatForOpenAIFunctions(steps) {
	const thoughts = [];
	for (const step of steps) {
		thoughts.push(new AIMessage(step.action.log));
		thoughts.push(new HumanMessage(renderTemplate(TEMPLATE_TOOL_RESPONSE, "f-string", { observation: step.observation })));
	}
	return thoughts;
}
/**
* Format a list of AgentSteps into a list of BaseMessage instances for
* agents that use OpenAI's API. Helpful for passing in previous agent
* step context into new iterations.
*
* @param steps A list of AgentSteps to format.
* @returns A list of BaseMessages.
*/
function formatToOpenAIFunctionMessages(steps) {
	return steps.flatMap(({ action, observation }) => {
		if ("messageLog" in action && action.messageLog !== void 0) {
			const log = action.messageLog;
			return log.concat(new FunctionMessage(observation, action.tool));
		} else return [new AIMessage(action.log)];
	});
}

//#endregion
export { formatForOpenAIFunctions, formatToOpenAIFunctionMessages, openai_functions_exports };
//# sourceMappingURL=openai_functions.js.map