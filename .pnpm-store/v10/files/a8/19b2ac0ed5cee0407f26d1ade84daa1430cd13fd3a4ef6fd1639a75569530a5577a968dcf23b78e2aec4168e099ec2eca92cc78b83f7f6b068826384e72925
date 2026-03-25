const require_rolldown_runtime = require('./_virtual/rolldown_runtime.cjs');
const __langchain_core_singletons = require_rolldown_runtime.__toESM(require("@langchain/core/singletons"));

//#region src/writer.ts
function writer(chunk) {
	const config = __langchain_core_singletons.AsyncLocalStorageProviderSingleton.getRunnableConfig();
	if (!config) throw new Error("Called interrupt() outside the context of a graph.");
	const conf = config.configurable;
	if (!conf) throw new Error("No configurable found in config");
	return conf.writer?.(chunk);
}

//#endregion
exports.writer = writer;
//# sourceMappingURL=writer.cjs.map