import { getEnvironmentVariable } from "./env.js";
//#region src/utils/callbacks.ts
const isTracingEnabled = (tracingEnabled) => {
	if (tracingEnabled !== void 0) return tracingEnabled;
	return !![
		"LANGSMITH_TRACING_V2",
		"LANGCHAIN_TRACING_V2",
		"LANGSMITH_TRACING",
		"LANGCHAIN_TRACING"
	].find((envVar) => getEnvironmentVariable(envVar) === "true");
};
//#endregion
export { isTracingEnabled };

//# sourceMappingURL=callbacks.js.map