
//#region src/singletons/fetch.ts
const DEFAULT_FETCH_IMPLEMENTATION = (...args) => fetch(...args);
const LANGSMITH_FETCH_IMPLEMENTATION_KEY = Symbol.for("lg:fetch_implementation");
/**
* Overrides the fetch implementation used for LangSmith calls.
* You should use this if you need to use an implementation of fetch
* other than the default global (e.g. for dealing with proxies).
* @param fetch The new fetch function to use.
*/
const overrideFetchImplementation = (fetch$1) => {
	globalThis[LANGSMITH_FETCH_IMPLEMENTATION_KEY] = fetch$1;
};
/**
* @internal
*/
const _getFetchImplementation = () => {
	return globalThis[LANGSMITH_FETCH_IMPLEMENTATION_KEY] ?? DEFAULT_FETCH_IMPLEMENTATION;
};

//#endregion
exports._getFetchImplementation = _getFetchImplementation;
exports.overrideFetchImplementation = overrideFetchImplementation;
//# sourceMappingURL=fetch.cjs.map