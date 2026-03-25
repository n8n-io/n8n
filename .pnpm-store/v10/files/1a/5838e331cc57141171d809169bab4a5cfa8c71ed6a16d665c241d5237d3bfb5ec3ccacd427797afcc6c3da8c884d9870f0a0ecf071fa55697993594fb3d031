import { AsyncLocalStorageProviderSingleton } from "@langchain/core/singletons";

//#region src/writer.ts
function writer(chunk) {
	const config = AsyncLocalStorageProviderSingleton.getRunnableConfig();
	if (!config) throw new Error("Called interrupt() outside the context of a graph.");
	const conf = config.configurable;
	if (!conf) throw new Error("No configurable found in config");
	return conf.writer?.(chunk);
}

//#endregion
export { writer };
//# sourceMappingURL=writer.js.map