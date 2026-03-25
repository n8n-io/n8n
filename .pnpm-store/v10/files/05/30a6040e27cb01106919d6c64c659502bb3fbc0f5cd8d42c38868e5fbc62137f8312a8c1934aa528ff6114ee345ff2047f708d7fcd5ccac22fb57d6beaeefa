//#region src/singletons/async_local_storage/globals.ts
const TRACING_ALS_KEY = Symbol.for("ls:tracing_async_local_storage");
const _CONTEXT_VARIABLES_KEY = Symbol.for("lc:context_variables");
const setGlobalAsyncLocalStorageInstance = (instance) => {
	globalThis[TRACING_ALS_KEY] = instance;
};
const getGlobalAsyncLocalStorageInstance = () => {
	return globalThis[TRACING_ALS_KEY];
};
//#endregion
exports._CONTEXT_VARIABLES_KEY = _CONTEXT_VARIABLES_KEY;
exports.getGlobalAsyncLocalStorageInstance = getGlobalAsyncLocalStorageInstance;
exports.setGlobalAsyncLocalStorageInstance = setGlobalAsyncLocalStorageInstance;

//# sourceMappingURL=globals.cjs.map