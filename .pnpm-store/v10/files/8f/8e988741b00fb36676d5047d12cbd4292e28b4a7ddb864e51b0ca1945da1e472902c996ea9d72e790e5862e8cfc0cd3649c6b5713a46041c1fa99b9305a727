const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));

//#region src/agents/format_scratchpad/tool_calling.ts
/**
* Convert agent action and observation into a function message.
* @param agentAction - The tool invocation request from the agent
* @param observation - The result of the tool invocation
* @returns FunctionMessage that corresponds to the original tool invocation
*/
function _createToolMessage(step) {
	return new __langchain_core_messages.ToolMessage({
		tool_call_id: step.action.toolCallId,
		content: step.observation,
		additional_kwargs: { name: step.action.tool }
	});
}
function formatToToolMessages(steps) {
	return steps.flatMap(({ action, observation }) => {
		if ("messageLog" in action && action.messageLog !== void 0) {
			const log = action.messageLog;
			return log.concat(_createToolMessage({
				action,
				observation
			}));
		} else return [new __langchain_core_messages.AIMessage(action.log)];
	});
}

//#endregion
exports.formatToToolMessages = formatToToolMessages;
//# sourceMappingURL=tool_calling.cjs.map