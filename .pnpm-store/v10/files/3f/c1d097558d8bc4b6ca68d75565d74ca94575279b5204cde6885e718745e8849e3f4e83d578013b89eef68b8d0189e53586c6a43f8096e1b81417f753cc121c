const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_singletons = require_rolldown_runtime.__toESM(require("@langchain/core/singletons"));
const node_async_hooks = require_rolldown_runtime.__toESM(require("node:async_hooks"));

//#region src/setup/async_local_storage.ts
function initializeAsyncLocalStorageSingleton() {
	__langchain_core_singletons.AsyncLocalStorageProviderSingleton.initializeGlobalInstance(new node_async_hooks.AsyncLocalStorage());
}

//#endregion
exports.initializeAsyncLocalStorageSingleton = initializeAsyncLocalStorageSingleton;
//# sourceMappingURL=async_local_storage.cjs.map