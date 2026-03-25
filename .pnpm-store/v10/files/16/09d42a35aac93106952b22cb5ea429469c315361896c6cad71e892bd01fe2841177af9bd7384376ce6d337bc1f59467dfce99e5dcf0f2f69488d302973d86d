"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROOT = exports.AsyncLocalStorageProviderSingleton = void 0;
exports.getCurrentRunTree = getCurrentRunTree;
exports.withRunTree = withRunTree;
exports.isTraceableFunction = isTraceableFunction;
class MockAsyncLocalStorage {
    getStore() {
        return undefined;
    }
    run(_, callback) {
        return callback();
    }
}
const TRACING_ALS_KEY = Symbol.for("ls:tracing_async_local_storage");
const mockAsyncLocalStorage = new MockAsyncLocalStorage();
class AsyncLocalStorageProvider {
    getInstance() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return globalThis[TRACING_ALS_KEY] ?? mockAsyncLocalStorage;
    }
    initializeGlobalInstance(instance) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (globalThis[TRACING_ALS_KEY] === undefined) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            globalThis[TRACING_ALS_KEY] = instance;
        }
    }
}
exports.AsyncLocalStorageProviderSingleton = new AsyncLocalStorageProvider();
function getCurrentRunTree(permitAbsentRunTree = false) {
    const runTree = exports.AsyncLocalStorageProviderSingleton.getInstance().getStore();
    if (!permitAbsentRunTree && runTree === undefined) {
        throw new Error("Could not get the current run tree.\n\nPlease make sure you are calling this method within a traceable function and that tracing is enabled.");
    }
    return runTree;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withRunTree(runTree, fn) {
    const storage = exports.AsyncLocalStorageProviderSingleton.getInstance();
    return new Promise((resolve, reject) => {
        storage.run(runTree, () => void Promise.resolve(fn()).then(resolve).catch(reject));
    });
}
exports.ROOT = Symbol.for("langsmith:traceable:root");
function isTraceableFunction(x
// eslint-disable-next-line @typescript-eslint/no-explicit-any
) {
    return typeof x === "function" && "langsmith:traceable" in x;
}
