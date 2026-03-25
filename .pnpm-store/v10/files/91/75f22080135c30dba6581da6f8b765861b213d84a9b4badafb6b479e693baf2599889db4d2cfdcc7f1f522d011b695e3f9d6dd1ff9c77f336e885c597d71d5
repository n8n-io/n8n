const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const __langchain_core_prompts = require_rolldown_runtime.__toESM(require("@langchain/core/prompts"));
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));

//#region src/agents/format_scratchpad/log_to_message.ts
var log_to_message_exports = {};
require_rolldown_runtime.__export(log_to_message_exports, { formatLogToMessage: () => formatLogToMessage });
function formatLogToMessage(intermediateSteps, templateToolResponse = "{observation}") {
	const matches = [...templateToolResponse.matchAll(/{([^}]*)}/g)];
	const stringsInsideBrackets = matches.map((match) => match[1]);
	if (stringsInsideBrackets.length > 1) throw new Error(`templateToolResponse must contain one input variable: ${templateToolResponse}`);
	const thoughts = [];
	for (const step of intermediateSteps) {
		thoughts.push(new __langchain_core_messages.AIMessage(step.action.log));
		thoughts.push(new __langchain_core_messages.HumanMessage((0, __langchain_core_prompts.renderTemplate)(templateToolResponse, "f-string", { [stringsInsideBrackets[0]]: step.observation })));
	}
	return thoughts;
}

//#endregion
exports.formatLogToMessage = formatLogToMessage;
Object.defineProperty(exports, 'log_to_message_exports', {
  enumerable: true,
  get: function () {
    return log_to_message_exports;
  }
});
//# sourceMappingURL=log_to_message.cjs.map