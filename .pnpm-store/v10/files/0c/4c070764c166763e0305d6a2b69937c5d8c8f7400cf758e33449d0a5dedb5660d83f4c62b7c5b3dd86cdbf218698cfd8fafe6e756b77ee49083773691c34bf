Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
require("../../_virtual/_rolldown/runtime.cjs");
const require_index = require("../../singletons/async_local_storage/index.cjs");
require("../../singletons/index.cjs");
const require_config = require("../../runnables/config.cjs");
const require_callbacks_dispatch_web = require("./web.cjs");
let node_async_hooks = require("node:async_hooks");
//#region src/callbacks/dispatch/index.ts
require_index.AsyncLocalStorageProviderSingleton.initializeGlobalInstance(new node_async_hooks.AsyncLocalStorage());
/**
* Dispatch a custom event.
*
* Note: this method is only supported in non-web environments
* due to usage of async_hooks to infer config.
*
* If you are using this method in the browser, please import and use
* from "@langchain/core/callbacks/dispatch/web".
*
* @param name The name of the custom event.
* @param payload The data for the custom event.
*   Ideally should be JSON serializable to avoid serialization issues downstream, but not enforced.
* @param config Optional config object.
*
* @example
* ```typescript
* import { dispatchCustomEvent } from "@langchain/core/callbacks/dispatch";
*
* const foo = RunnableLambda.from(async (input: string) => {
*   await dispatchCustomEvent("my_custom_event", { arbitraryField: "someval" });
*   return input;
* });
*
* const callbacks = [{
*   handleCustomEvent: (eventName: string, payload: any) => {
*     // Logs "my_custom_event" and { arbitraryField: "someval" }
*     console.log(eventName, payload);
*   }
* }];
*
* await foo.invoke("hi", { callbacks })
* ```
*/
async function dispatchCustomEvent(eventName, payload, config) {
	await require_callbacks_dispatch_web.dispatchCustomEvent(eventName, payload, require_config.ensureConfig(config));
}
//#endregion
exports.dispatchCustomEvent = dispatchCustomEvent;

//# sourceMappingURL=index.cjs.map