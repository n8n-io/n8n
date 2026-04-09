"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._getFetchImplementation = exports._shouldStreamForGlobalFetchImplementation = exports.clearFetchImplementation = exports.overrideFetchImplementation = void 0;
const env_js_1 = require("../utils/env.cjs");
// Wrap the default fetch call due to issues with illegal invocations
// in some environments:
// https://stackoverflow.com/questions/69876859/why-does-bind-fix-failed-to-execute-fetch-on-window-illegal-invocation-err
// @ts-expect-error Broad typing to support a range of fetch implementations
const DEFAULT_FETCH_IMPLEMENTATION = (...args) => fetch(...args);
let globalFetchSupportsWebStreaming = undefined;
const LANGSMITH_FETCH_IMPLEMENTATION_KEY = Symbol.for("ls:fetch_implementation");
/**
 * Overrides the fetch implementation used for LangSmith calls.
 * You should use this if you need to use an implementation of fetch
 * other than the default global (e.g. for dealing with proxies).
 * @param fetch The new fetch function to use.
 */
const overrideFetchImplementation = (fetch, supportsWebStreaming) => {
    globalThis[LANGSMITH_FETCH_IMPLEMENTATION_KEY] = fetch;
    globalFetchSupportsWebStreaming = supportsWebStreaming;
};
exports.overrideFetchImplementation = overrideFetchImplementation;
const clearFetchImplementation = () => {
    delete globalThis[LANGSMITH_FETCH_IMPLEMENTATION_KEY];
    globalFetchSupportsWebStreaming = undefined;
};
exports.clearFetchImplementation = clearFetchImplementation;
const _shouldStreamForGlobalFetchImplementation = () => {
    const overriddenFetchImpl = globalThis[LANGSMITH_FETCH_IMPLEMENTATION_KEY];
    if (overriddenFetchImpl === undefined) {
        return true;
    }
    return globalFetchSupportsWebStreaming ?? false;
};
exports._shouldStreamForGlobalFetchImplementation = _shouldStreamForGlobalFetchImplementation;
/**
 * @internal
 */
const _getFetchImplementation = (debug) => {
    return async (...args) => {
        if (debug || (0, env_js_1.getLangSmithEnvironmentVariable)("DEBUG") === "true") {
            const [url, options] = args;
            console.log(`→ ${options?.method || "GET"} ${url}`);
        }
        const res = await (globalThis[LANGSMITH_FETCH_IMPLEMENTATION_KEY] ??
            DEFAULT_FETCH_IMPLEMENTATION)(...args);
        if (debug || (0, env_js_1.getLangSmithEnvironmentVariable)("DEBUG") === "true") {
            console.log(`← ${res.status} ${res.statusText} ${res.url}`);
        }
        return res;
    };
};
exports._getFetchImplementation = _getFetchImplementation;
