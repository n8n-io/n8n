//#region src/utils/signal.ts
/**
* Race a promise with an abort signal. If the signal is aborted, the promise will
* be rejected with the error from the signal. If the promise is rejected, the signal will be aborted.
*
* @param promise - The promise to race.
* @param signal - The abort signal.
* @returns The result of the promise.
*/
async function raceWithSignal(promise, signal) {
	if (signal === void 0) return promise;
	let listener;
	return Promise.race([promise.catch((err) => {
		if (!signal?.aborted) throw err;
		else return;
	}), new Promise((_, reject) => {
		listener = () => {
			reject(getAbortSignalError(signal));
		};
		signal.addEventListener("abort", listener, { once: true });
		if (signal.aborted) reject(getAbortSignalError(signal));
	})]).finally(() => signal.removeEventListener("abort", listener));
}
/**
* Get the error from an abort signal. Since you can set the reason to anything,
* we have to do some type gymnastics to get a proper error message.
*
* @param signal - The abort signal.
* @returns The error from the abort signal.
*/
function getAbortSignalError(signal) {
	if (signal?.reason instanceof Error) return signal.reason;
	if (typeof signal?.reason === "string") return new Error(signal.reason);
	return /* @__PURE__ */ new Error("Aborted");
}
//#endregion
export { getAbortSignalError, raceWithSignal };

//# sourceMappingURL=signal.js.map