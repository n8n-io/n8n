import { __export } from "../../_virtual/rolldown_runtime.js";

//#region src/agents/format_scratchpad/log.ts
var log_exports = {};
__export(log_exports, { formatLogToString: () => formatLogToString });
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
export { formatLogToString, log_exports };
//# sourceMappingURL=log.js.map