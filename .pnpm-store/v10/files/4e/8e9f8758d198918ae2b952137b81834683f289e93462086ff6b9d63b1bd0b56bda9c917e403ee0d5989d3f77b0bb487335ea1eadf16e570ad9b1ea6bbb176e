const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_prompt = require('../chat_convo/prompt.cjs');
const __langchain_core_prompts = require_rolldown_runtime.__toESM(require("@langchain/core/prompts"));
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));

//#region src/agents/format_scratchpad/openai_functions.ts
var openai_functions_exports = {};
require_rolldown_runtime.__export(openai_functions_exports, {
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
		thoughts.push(new __langchain_core_messages.AIMessage(step.action.log));
		thoughts.push(new __langchain_core_messages.HumanMessage((0, __langchain_core_prompts.renderTemplate)(require_prompt.TEMPLATE_TOOL_RESPONSE, "f-string", { observation: step.observation })));
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
			return log.concat(new __langchain_core_messages.FunctionMessage(observation, action.tool));
		} else return [new __langchain_core_messages.AIMessage(action.log)];
	});
}

//#endregion
exports.formatForOpenAIFunctions = formatForOpenAIFunctions;
exports.formatToOpenAIFunctionMessages = formatToOpenAIFunctionMessages;
Object.defineProperty(exports, 'openai_functions_exports', {
  enumerable: true,
  get: function () {
    return openai_functions_exports;
  }
});
//# sourceMappingURL=openai_functions.cjs.map