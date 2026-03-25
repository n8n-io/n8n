const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_constants = require('../constants.cjs');
const require_utils = require('../utils.cjs');
const require_write = require('./write.cjs');
const __langchain_core_singletons = require_rolldown_runtime.__toESM(require("@langchain/core/singletons"));
const __langchain_core_runnables = require_rolldown_runtime.__toESM(require("@langchain/core/runnables"));

//#region src/pregel/call.ts
/**
* Wraps a user function in a Runnable that writes the returned value to the RETURN channel.
*/
function getRunnableForFunc(name, func) {
	const run = new require_utils.RunnableCallable({
		func: (input) => func(...input),
		name,
		trace: false,
		recurse: false
	});
	return new __langchain_core_runnables.RunnableSequence({
		name,
		first: run,
		last: new require_write.ChannelWrite([{
			channel: require_constants.RETURN,
			value: require_write.PASSTHROUGH
		}], [require_constants.TAG_HIDDEN])
	});
}
function getRunnableForEntrypoint(name, func) {
	const run = new require_utils.RunnableCallable({
		func: (input, config) => {
			return func(input, config);
		},
		name,
		trace: false,
		recurse: false
	});
	return run;
}
function call({ func, name, cache, retry }, ...args) {
	const config = __langchain_core_singletons.AsyncLocalStorageProviderSingleton.getRunnableConfig();
	if (typeof config.configurable?.[require_constants.CONFIG_KEY_CALL] === "function") return config.configurable[require_constants.CONFIG_KEY_CALL](func, name, args, {
		retry,
		cache,
		callbacks: config.callbacks
	});
	throw new Error("Async local storage not initialized. Please call initializeAsyncLocalStorageSingleton() before using this function.");
}

//#endregion
exports.call = call;
exports.getRunnableForEntrypoint = getRunnableForEntrypoint;
exports.getRunnableForFunc = getRunnableForFunc;
//# sourceMappingURL=call.cjs.map