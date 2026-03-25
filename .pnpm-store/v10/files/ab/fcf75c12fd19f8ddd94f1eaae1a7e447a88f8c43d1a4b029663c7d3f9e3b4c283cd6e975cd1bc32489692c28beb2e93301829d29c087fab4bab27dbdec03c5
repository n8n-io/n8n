import { getLangSmithEnvironmentVariable } from "./utils/env.js";

//#region ../../node_modules/.pnpm/langsmith@0.3.74_@opentelemetry+api@1.9.0_openai@5.12.2_ws@8.18.3_bufferutil@4.0.9_utf-8-validate@6.0.5__zod@3.25.76_/node_modules/langsmith/dist/env.js
const isTracingEnabled = (tracingEnabled) => {
	if (tracingEnabled !== void 0) return tracingEnabled;
	const envVars = ["TRACING_V2", "TRACING"];
	return !!envVars.find((envVar) => getLangSmithEnvironmentVariable(envVar) === "true");
};

//#endregion
export { isTracingEnabled };
//# sourceMappingURL=env.js.map