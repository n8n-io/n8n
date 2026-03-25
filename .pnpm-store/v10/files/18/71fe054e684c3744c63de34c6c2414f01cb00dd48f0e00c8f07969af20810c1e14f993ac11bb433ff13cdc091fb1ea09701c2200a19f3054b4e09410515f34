import { getDefaultLangChainClientSingleton } from "./tracer.js";
import { getGlobalAsyncLocalStorageInstance } from "./async_local_storage/globals.js";
import PQueueMod from "p-queue";
//#region src/singletons/callbacks.ts
let queue;
/**
* Creates a queue using the p-queue library. The queue is configured to
* auto-start and has a concurrency of 1, meaning it will process tasks
* one at a time.
*/
function createQueue() {
	return new ("default" in PQueueMod ? PQueueMod.default : PQueueMod)({
		autoStart: true,
		concurrency: 1
	});
}
function getQueue() {
	if (typeof queue === "undefined") queue = createQueue();
	return queue;
}
/**
* Consume a promise, either adding it to the queue or waiting for it to resolve
* @param promiseFn Promise to consume
* @param wait Whether to wait for the promise to resolve or resolve immediately
*/
async function consumeCallback(promiseFn, wait) {
	if (wait === true) {
		const asyncLocalStorageInstance = getGlobalAsyncLocalStorageInstance();
		if (asyncLocalStorageInstance !== void 0) await asyncLocalStorageInstance.run(void 0, async () => promiseFn());
		else await promiseFn();
	} else {
		queue = getQueue();
		queue.add(async () => {
			const asyncLocalStorageInstance = getGlobalAsyncLocalStorageInstance();
			if (asyncLocalStorageInstance !== void 0) await asyncLocalStorageInstance.run(void 0, async () => promiseFn());
			else await promiseFn();
		});
	}
}
/**
* Waits for all promises in the queue to resolve. If the queue is
* undefined, it immediately resolves a promise.
*/
async function awaitAllCallbacks() {
	const defaultClient = getDefaultLangChainClientSingleton();
	await Promise.allSettled([typeof queue !== "undefined" ? queue.onIdle() : Promise.resolve(), defaultClient.awaitPendingTraceBatches()]);
}
//#endregion
export { awaitAllCallbacks, consumeCallback };

//# sourceMappingURL=callbacks.js.map