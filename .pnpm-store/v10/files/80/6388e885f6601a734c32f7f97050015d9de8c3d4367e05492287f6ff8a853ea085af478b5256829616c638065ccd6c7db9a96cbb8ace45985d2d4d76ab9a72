import PQueueMod from "p-queue";

//#region src/singletons/callbacks.d.ts
/**
 * Consume a promise, either adding it to the queue or waiting for it to resolve
 * @param promiseFn Promise to consume
 * @param wait Whether to wait for the promise to resolve or resolve immediately
 */
declare function consumeCallback<T>(promiseFn: () => Promise<T> | T | void, wait: boolean): Promise<void>;
/**
 * Waits for all promises in the queue to resolve. If the queue is
 * undefined, it immediately resolves a promise.
 */
declare function awaitAllCallbacks(): Promise<void>;
//#endregion
export { awaitAllCallbacks, consumeCallback };
//# sourceMappingURL=callbacks.d.ts.map