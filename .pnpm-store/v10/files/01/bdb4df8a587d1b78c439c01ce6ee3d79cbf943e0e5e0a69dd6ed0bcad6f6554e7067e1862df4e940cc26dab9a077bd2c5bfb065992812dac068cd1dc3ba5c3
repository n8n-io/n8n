const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');

//#region src/agents/format_scratchpad/log.ts
var log_exports = {};
require_rolldown_runtime.__export(log_exports, { formatLogToString: () => formatLogToString });
/**
* Construct the scratchpad that lets the agent continue its thought process.
* @param intermediateSteps
* @param observationPrefix
* @param llmPrefix
* @returns a string with the formatted observations and agent logs
*/
function formatLogToString(intermediateSteps, observationPrefix = "Observation: ", llmPrefix = "Thought: ") {
	const formattedSteps = intermediateSteps.reduce((thoughts, { action, observation }) => thoughts + [
		action.log,
		`\n${observationPrefix}${observation}`,
		llmPrefix
	].join("\n"), "");
	return formattedSteps;
}

//#endregion
exports.formatLogToString = formatLogToString;
Object.defineProperty(exports, 'log_exports', {
  enumerable: true,
  get: function () {
    return log_exports;
  }
});
//# sourceMappingURL=log.cjs.map