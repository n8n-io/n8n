let _langchain_core_singletons = require("@langchain/core/singletons");
let node_async_hooks = require("node:async_hooks");

//#region src/setup/async_local_storage.ts
function initializeAsyncLocalStorageSingleton() {
	_langchain_core_singletons.AsyncLocalStorageProviderSingleton.initializeGlobalInstance(new node_async_hooks.AsyncLocalStorage());
}

//#endregion
exports.initializeAsyncLocalStorageSingleton = initializeAsyncLocalStorageSingleton;
//# sourceMappingURL=async_local_storage.cjs.map