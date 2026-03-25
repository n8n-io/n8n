import {createDeferred} from '../utils/deferred.js';

// When using multiple `.readable()`/`.writable()`/`.duplex()`, `final` and `destroy` should wait for other streams
export const initializeConcurrentStreams = () => ({
	readableDestroy: new WeakMap(),
	writableFinal: new WeakMap(),
	writableDestroy: new WeakMap(),
});

// Each file descriptor + `waitName` has its own array of promises.
// Each promise is a single `.readable()`/`.writable()`/`.duplex()` call.
export const addConcurrentStream = (concurrentStreams, stream, waitName) => {
	const weakMap = concurrentStreams[waitName];
	if (!weakMap.has(stream)) {
		weakMap.set(stream, []);
	}

	const promises = weakMap.get(stream);
	const promise = createDeferred();
	promises.push(promise);
	const resolve = promise.resolve.bind(promise);
	return {resolve, promises};
};

// Wait for other streams, but stop waiting when subprocess ends
export const waitForConcurrentStreams = async ({resolve, promises}, subprocess) => {
	resolve();
	const [isSubprocessExit] = await Promise.race([
		Promise.allSettled([true, subprocess]),
		Promise.all([false, ...promises]),
	]);
	return !isSubprocessExit;
};
