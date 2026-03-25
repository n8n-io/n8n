const require_runtime = require("../_virtual/_rolldown/runtime.cjs");
const require_tracer = require("./tracer.cjs");
const require_globals = require("./async_local_storage/globals.cjs");
let p_queue = require("p-queue");
p_queue = require_runtime.__toESM(p_queue);
//#region src/singletons/callbacks.ts
let queue;
/**
* Creates a queue using the p-queue library. The queue is configured to
* auto-start and has a concurrency of 1, meaning it will process tasks
* one at a time.
*/
function createQueue() {
	return new ("default" in p_queue.default ? p_queue.default.default : p_queue.default)({
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
		const asyncLocalStorageInstance = require_globals.getGlobalAsyncLocalStorageInstance();
		if (asyncLocalStorageInstance !== void 0) await asyncLocalStorageInstance.run(void 0, async () => promiseFn());
		else await promiseFn();
	} else {
		queue = getQueue();
		queue.add(async () => {
			const asyncLocalStorageInstance = require_globals.getGlobalAsyncLocalStorageInstance();
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
	const defaultClient = require_tracer.getDefaultLangChainClientSingleton();
	await Promise.allSettled([typeof queue !== "undefined" ? queue.onIdle() : Promise.resolve(), defaultClient.awaitPendingTraceBatches()]);
}
//#endregion
exports.awaitAllCallbacks = awaitAllCallbacks;
exports.consumeCallback = consumeCallback;

//# sourceMappingURL=callbacks.cjs.map