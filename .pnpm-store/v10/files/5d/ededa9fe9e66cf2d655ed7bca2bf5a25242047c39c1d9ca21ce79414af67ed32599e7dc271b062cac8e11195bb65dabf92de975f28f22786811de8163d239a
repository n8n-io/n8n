Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
require("./_virtual/_rolldown/runtime.cjs");
const require_context = require("./singletons/async_local_storage/context.cjs");
const require_index = require("./singletons/async_local_storage/index.cjs");
require("./singletons/index.cjs");
let node_async_hooks = require("node:async_hooks");
//#region src/context.ts
/**
* This file exists as a convenient public entrypoint for functionality
* related to context variables.
*
* Because it automatically initializes AsyncLocalStorage, internal
* functionality SHOULD NEVER import from this file outside of tests.
*/
require_index.AsyncLocalStorageProviderSingleton.initializeGlobalInstance(new node_async_hooks.AsyncLocalStorage());
const foo = "bar";
//#endregion
exports.foo = foo;
exports.getContextVariable = require_context.getContextVariable;
exports.registerConfigureHook = require_context.registerConfigureHook;
exports.setContextVariable = require_context.setContextVariable;

//# sourceMappingURL=context.cjs.map