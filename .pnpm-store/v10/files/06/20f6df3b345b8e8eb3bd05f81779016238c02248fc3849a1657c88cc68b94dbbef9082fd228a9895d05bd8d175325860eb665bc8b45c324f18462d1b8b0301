import debug from "debug";

//#region src/logging.ts
const packageName = "@langchain/mcp-adapters";
const debugLog = {};
function getDebugLog(instanceName = "client") {
	const key = `${packageName}:${instanceName}`;
	if (!debugLog[key]) debugLog[key] = debug(key);
	return debugLog[key];
}

//#endregion
export { getDebugLog };
//# sourceMappingURL=logging.js.map