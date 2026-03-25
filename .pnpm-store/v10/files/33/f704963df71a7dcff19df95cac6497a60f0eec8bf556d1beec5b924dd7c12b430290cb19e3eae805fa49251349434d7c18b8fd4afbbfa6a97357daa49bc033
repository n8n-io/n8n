import { getSafeTimers } from '@vitest/utils/timers';
import { c as createBirpc } from './index.Chj8NDwU.js';
import { g as getWorkerState } from './utils.DvEY5TfP.js';

const { get } = Reflect;
function withSafeTimers(fn) {
	const { setTimeout, clearTimeout, nextTick, setImmediate, clearImmediate } = getSafeTimers();
	const currentSetTimeout = globalThis.setTimeout;
	const currentClearTimeout = globalThis.clearTimeout;
	const currentSetImmediate = globalThis.setImmediate;
	const currentClearImmediate = globalThis.clearImmediate;
	const currentNextTick = globalThis.process?.nextTick;
	try {
		globalThis.setTimeout = setTimeout;
		globalThis.clearTimeout = clearTimeout;
		if (setImmediate) globalThis.setImmediate = setImmediate;
		if (clearImmediate) globalThis.clearImmediate = clearImmediate;
		if (globalThis.process && nextTick) globalThis.process.nextTick = nextTick;
		return fn();
	} finally {
		globalThis.setTimeout = currentSetTimeout;
		globalThis.clearTimeout = currentClearTimeout;
		globalThis.setImmediate = currentSetImmediate;
		globalThis.clearImmediate = currentClearImmediate;
		if (globalThis.process && nextTick) nextTick(() => {
			globalThis.process.nextTick = currentNextTick;
		});
	}
}
const promises = /* @__PURE__ */ new Set();
async function rpcDone() {
	if (!promises.size) return;
	const awaitable = Array.from(promises);
	return Promise.all(awaitable);
}
const onCancelCallbacks = [];
function onCancel(callback) {
	onCancelCallbacks.push(callback);
}
function createRuntimeRpc(options) {
	return createSafeRpc(createBirpc({ async onCancel(reason) {
		await Promise.all(onCancelCallbacks.map((fn) => fn(reason)));
	} }, {
		eventNames: [
			"onUserConsoleLog",
			"onCollected",
			"onCancel"
		],
		timeout: -1,
		...options
	}));
}
function createSafeRpc(rpc) {
	return new Proxy(rpc, { get(target, p, handler) {
		// keep $rejectPendingCalls as sync function
		if (p === "$rejectPendingCalls") return rpc.$rejectPendingCalls;
		const sendCall = get(target, p, handler);
		const safeSendCall = (...args) => withSafeTimers(async () => {
			const result = sendCall(...args);
			promises.add(result);
			try {
				return await result;
			} finally {
				promises.delete(result);
			}
		});
		safeSendCall.asEvent = sendCall.asEvent;
		return safeSendCall;
	} });
}
function rpc() {
	const { rpc } = getWorkerState();
	return rpc;
}

export { rpcDone as a, createRuntimeRpc as c, onCancel as o, rpc as r };
