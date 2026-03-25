let _langchain_core_singletons = require("@langchain/core/singletons");

//#region src/writer.ts
function writer(chunk) {
	const config = _langchain_core_singletons.AsyncLocalStorageProviderSingleton.getRunnableConfig();
	if (!config) throw new Error("Called interrupt() outside the context of a graph.");
	const conf = config.configurable;
	if (!conf) throw new Error("No configurable found in config");
	return conf.writer?.(chunk);
}

//#endregion
exports.writer = writer;
//# sourceMappingURL=writer.cjs.map