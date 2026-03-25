const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_constants = require('../../constants.cjs');
const __langchain_core_singletons = require_rolldown_runtime.__toESM(require("@langchain/core/singletons"));

//#region src/pregel/utils/config.ts
const COPIABLE_KEYS = [
	"tags",
	"metadata",
	"callbacks",
	"configurable"
];
const CONFIG_KEYS = [
	"tags",
	"metadata",
	"callbacks",
	"runName",
	"maxConcurrency",
	"recursionLimit",
	"configurable",
	"runId",
	"outputKeys",
	"streamMode",
	"store",
	"writer",
	"interrupt",
	"context",
	"interruptBefore",
	"interruptAfter",
	"checkpointDuring",
	"durability",
	"signal"
];
const DEFAULT_RECURSION_LIMIT = 25;
function ensureLangGraphConfig(...configs) {
	const empty = {
		tags: [],
		metadata: {},
		callbacks: void 0,
		recursionLimit: DEFAULT_RECURSION_LIMIT,
		configurable: {}
	};
	const implicitConfig = __langchain_core_singletons.AsyncLocalStorageProviderSingleton.getRunnableConfig();
	if (implicitConfig !== void 0) {
		for (const [k, v] of Object.entries(implicitConfig)) if (v !== void 0) if (COPIABLE_KEYS.includes(k)) {
			let copiedValue;
			if (Array.isArray(v)) copiedValue = [...v];
			else if (typeof v === "object") if (k === "callbacks" && "copy" in v && typeof v.copy === "function") copiedValue = v.copy();
			else copiedValue = { ...v };
			else copiedValue = v;
			empty[k] = copiedValue;
		} else empty[k] = v;
	}
	for (const config of configs) {
		if (config === void 0) continue;
		for (const [k, v] of Object.entries(config)) if (v !== void 0 && CONFIG_KEYS.includes(k)) empty[k] = v;
	}
	for (const [key, value] of Object.entries(empty.configurable)) {
		empty.metadata = empty.metadata ?? {};
		if (!key.startsWith("__") && (typeof value === "string" || typeof value === "number" || typeof value === "boolean") && !(key in empty.metadata)) empty.metadata[key] = value;
	}
	return empty;
}
/**
* A helper utility function that returns the {@link BaseStore} that was set when the graph was initialized
*
* @returns a reference to the {@link BaseStore} that was set when the graph was initialized
*/
function getStore(config) {
	const runConfig = config ?? __langchain_core_singletons.AsyncLocalStorageProviderSingleton.getRunnableConfig();
	if (runConfig === void 0) throw new Error(["Config not retrievable. This is likely because you are running in an environment without support for AsyncLocalStorage.", "If you're running `getStore` in such environment, pass the `config` from the node function directly."].join("\n"));
	return runConfig?.store;
}
/**
* A helper utility function that returns the {@link LangGraphRunnableConfig#writer} if "custom" stream mode is enabled, otherwise undefined.
*
* @returns a reference to the {@link LangGraphRunnableConfig#writer} if "custom" stream mode is enabled, otherwise undefined
*/
function getWriter(config) {
	const runConfig = config ?? __langchain_core_singletons.AsyncLocalStorageProviderSingleton.getRunnableConfig();
	if (runConfig === void 0) throw new Error(["Config not retrievable. This is likely because you are running in an environment without support for AsyncLocalStorage.", "If you're running `getWriter` in such environment, pass the `config` from the node function directly."].join("\n"));
	return runConfig?.writer || runConfig?.configurable?.writer;
}
/**
* A helper utility function that returns the {@link LangGraphRunnableConfig} that was set when the graph was initialized.
*
* Note: This only works when running in an environment that supports node:async_hooks and AsyncLocalStorage. If you're running this in a
* web environment, access the LangGraphRunnableConfig from the node function directly.
*
* @returns the {@link LangGraphRunnableConfig} that was set when the graph was initialized
*/
function getConfig() {
	return __langchain_core_singletons.AsyncLocalStorageProviderSingleton.getRunnableConfig();
}
/**
* A helper utility function that returns the input for the currently executing task
*
* @returns the input for the currently executing task
*/
function getCurrentTaskInput(config) {
	const runConfig = config ?? __langchain_core_singletons.AsyncLocalStorageProviderSingleton.getRunnableConfig();
	if (runConfig === void 0) throw new Error(["Config not retrievable. This is likely because you are running in an environment without support for AsyncLocalStorage.", "If you're running `getCurrentTaskInput` in such environment, pass the `config` from the node function directly."].join("\n"));
	if (runConfig.configurable?.[require_constants.CONFIG_KEY_SCRATCHPAD]?.currentTaskInput === void 0) throw new Error("BUG: internal scratchpad not initialized.");
	return runConfig.configurable[require_constants.CONFIG_KEY_SCRATCHPAD].currentTaskInput;
}
function recastCheckpointNamespace(namespace) {
	return namespace.split(require_constants.CHECKPOINT_NAMESPACE_SEPARATOR).filter((part) => !part.match(/^\d+$/)).map((part) => part.split(require_constants.CHECKPOINT_NAMESPACE_END)[0]).join(require_constants.CHECKPOINT_NAMESPACE_SEPARATOR);
}
function getParentCheckpointNamespace(namespace) {
	const parts = namespace.split(require_constants.CHECKPOINT_NAMESPACE_SEPARATOR);
	while (parts.length > 1 && parts[parts.length - 1].match(/^\d+$/)) parts.pop();
	return parts.slice(0, -1).join(require_constants.CHECKPOINT_NAMESPACE_SEPARATOR);
}

//#endregion
exports.ensureLangGraphConfig = ensureLangGraphConfig;
exports.getConfig = getConfig;
exports.getCurrentTaskInput = getCurrentTaskInput;
exports.getParentCheckpointNamespace = getParentCheckpointNamespace;
exports.getStore = getStore;
exports.getWriter = getWriter;
exports.recastCheckpointNamespace = recastCheckpointNamespace;
//# sourceMappingURL=config.cjs.map