const require_utils_env = require("./env.cjs");
//#region src/utils/callbacks.ts
const isTracingEnabled = (tracingEnabled) => {
	if (tracingEnabled !== void 0) return tracingEnabled;
	return !![
		"LANGSMITH_TRACING_V2",
		"LANGCHAIN_TRACING_V2",
		"LANGSMITH_TRACING",
		"LANGCHAIN_TRACING"
	].find((envVar) => require_utils_env.getEnvironmentVariable(envVar) === "true");
};
//#endregion
exports.isTracingEnabled = isTracingEnabled;

//# sourceMappingURL=callbacks.cjs.map