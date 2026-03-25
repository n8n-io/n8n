import { getLangSmithEnvironmentVariable } from "../utils/env.js";

//#region ../../node_modules/.pnpm/langsmith@0.3.74_@opentelemetry+api@1.9.0_openai@5.12.2_ws@8.18.3_bufferutil@4.0.9_utf-8-validate@6.0.5__zod@3.25.76_/node_modules/langsmith/dist/singletons/fetch.js
const DEFAULT_FETCH_IMPLEMENTATION = (...args) => fetch(...args);
const LANGSMITH_FETCH_IMPLEMENTATION_KEY = Symbol.for("ls:fetch_implementation");
const _globalFetchImplementationIsNodeFetch = () => {
	const fetchImpl = globalThis[LANGSMITH_FETCH_IMPLEMENTATION_KEY];
	if (!fetchImpl) return false;
	return typeof fetchImpl === "function" && "Headers" in fetchImpl && "Request" in fetchImpl && "Response" in fetchImpl;
};
/**
* @internal
*/
const _getFetchImplementation = (debug) => {
	return async (...args) => {
		if (debug || getLangSmithEnvironmentVariable("DEBUG") === "true") {
			const [url, options] = args;
			console.log(`→ ${options?.method || "GET"} ${url}`);
		}
		const res = await (globalThis[LANGSMITH_FETCH_IMPLEMENTATION_KEY] ?? DEFAULT_FETCH_IMPLEMENTATION)(...args);
		if (debug || getLangSmithEnvironmentVariable("DEBUG") === "true") console.log(`← ${res.status} ${res.statusText} ${res.url}`);
		return res;
	};
};

//#endregion
export { _getFetchImplementation, _globalFetchImplementationIsNodeFetch };
//# sourceMappingURL=fetch.js.map