const require_rolldown_runtime = require('./_virtual/rolldown_runtime.cjs');
const debug = require_rolldown_runtime.__toESM(require("debug"));

//#region src/logging.ts
const packageName = "@langchain/mcp-adapters";
const debugLog = {};
function getDebugLog(instanceName = "client") {
	const key = `${packageName}:${instanceName}`;
	if (!debugLog[key]) debugLog[key] = (0, debug.default)(key);
	return debugLog[key];
}

//#endregion
exports.getDebugLog = getDebugLog;
//# sourceMappingURL=logging.cjs.map