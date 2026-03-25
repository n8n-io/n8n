import { AsyncLocalStorageProviderSingleton } from "@langchain/core/singletons";
import { AsyncLocalStorage } from "node:async_hooks";

//#region src/setup/async_local_storage.ts
function initializeAsyncLocalStorageSingleton() {
	AsyncLocalStorageProviderSingleton.initializeGlobalInstance(new AsyncLocalStorage());
}

//#endregion
export { initializeAsyncLocalStorageSingleton };
//# sourceMappingURL=async_local_storage.js.map