import { CONFIG_KEY_CALL, RETURN, TAG_HIDDEN } from "../constants.js";
import { RunnableCallable } from "../utils.js";
import { ChannelWrite, PASSTHROUGH } from "./write.js";
import { AsyncLocalStorageProviderSingleton } from "@langchain/core/singletons";
import { RunnableSequence } from "@langchain/core/runnables";

//#region src/pregel/call.ts
/**
* Wraps a user function in a Runnable that writes the returned value to the RETURN channel.
*/
function getRunnableForFunc(name, func) {
	const run = new RunnableCallable({
		func: (input) => func(...input),
		name,
		trace: false,
		recurse: false
	});
	return new RunnableSequence({
		name,
		first: run,
		last: new ChannelWrite([{
			channel: RETURN,
			value: PASSTHROUGH
		}], [TAG_HIDDEN])
	});
}
function getRunnableForEntrypoint(name, func) {
	const run = new RunnableCallable({
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
	const config = AsyncLocalStorageProviderSingleton.getRunnableConfig();
	if (typeof config.configurable?.[CONFIG_KEY_CALL] === "function") return config.configurable[CONFIG_KEY_CALL](func, name, args, {
		retry,
		cache,
		callbacks: config.callbacks
	});
	throw new Error("Async local storage not initialized. Please call initializeAsyncLocalStorageSingleton() before using this function.");
}

//#endregion
export { call, getRunnableForEntrypoint, getRunnableForFunc };
//# sourceMappingURL=call.js.map