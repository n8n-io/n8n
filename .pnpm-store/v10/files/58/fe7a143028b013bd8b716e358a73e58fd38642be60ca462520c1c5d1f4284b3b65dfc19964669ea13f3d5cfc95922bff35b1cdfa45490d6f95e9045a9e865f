Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require_runtime = require("../_virtual/_rolldown/runtime.cjs");
const require_signal = require("./signal.cjs");
const require_index = require("./p-retry/index.cjs");
let p_queue = require("p-queue");
p_queue = require_runtime.__toESM(p_queue);
//#region src/utils/async_caller.ts
var async_caller_exports = /* @__PURE__ */ require_runtime.__exportAll({ AsyncCaller: () => AsyncCaller });
const STATUS_NO_RETRY = [
	400,
	401,
	402,
	403,
	404,
	405,
	406,
	407,
	409
];
/**
* The default failed attempt handler for the AsyncCaller.
* @param error - The error to handle.
* @returns void
*/
const defaultFailedAttemptHandler = (error) => {
	if (typeof error !== "object" || error === null) return;
	if ("message" in error && typeof error.message === "string" && (error.message.startsWith("Cancel") || error.message.startsWith("AbortError")) || "name" in error && typeof error.name === "string" && error.name === "AbortError") throw error;
	if ("code" in error && typeof error.code === "string" && error.code === "ECONNABORTED") throw error;
	const responseStatus = "response" in error && typeof error.response === "object" && error.response !== null && "status" in error.response && typeof error.response.status === "number" ? error.response.status : void 0;
	const directStatus = "status" in error && typeof error.status === "number" ? error.status : void 0;
	const status = responseStatus ?? directStatus;
	if (status && STATUS_NO_RETRY.includes(+status)) throw error;
	if (("error" in error && typeof error.error === "object" && error.error !== null && "code" in error.error && typeof error.error.code === "string" ? error.error.code : void 0) === "insufficient_quota") {
		const err = new Error("message" in error && typeof error.message === "string" ? error.message : "Insufficient quota");
		err.name = "InsufficientQuotaError";
		throw err;
	}
};
/**
* A class that can be used to make async calls with concurrency and retry logic.
*
* This is useful for making calls to any kind of "expensive" external resource,
* be it because it's rate-limited, subject to network issues, etc.
*
* Concurrent calls are limited by the `maxConcurrency` parameter, which defaults
* to `Infinity`. This means that by default, all calls will be made in parallel.
*
* Retries are limited by the `maxRetries` parameter, which defaults to 6. This
* means that by default, each call will be retried up to 6 times, with an
* exponential backoff between each attempt.
*/
var AsyncCaller = class {
	maxConcurrency;
	maxRetries;
	onFailedAttempt;
	queue;
	constructor(params) {
		this.maxConcurrency = params.maxConcurrency ?? Infinity;
		this.maxRetries = params.maxRetries ?? 6;
		this.onFailedAttempt = params.onFailedAttempt ?? defaultFailedAttemptHandler;
		this.queue = new ("default" in p_queue.default ? p_queue.default.default : p_queue.default)({ concurrency: this.maxConcurrency });
	}
	async call(callable, ...args) {
		return this.queue.add(() => require_index.default(() => callable(...args).catch((error) => {
			if (error instanceof Error) throw error;
			else throw new Error(error);
		}), {
			onFailedAttempt: ({ error }) => this.onFailedAttempt?.(error),
			retries: this.maxRetries,
			randomize: true
		}), { throwOnTimeout: true });
	}
	callWithOptions(options, callable, ...args) {
		if (options.signal) {
			let listener;
			return Promise.race([this.call(callable, ...args), new Promise((_, reject) => {
				listener = () => {
					reject(require_signal.getAbortSignalError(options.signal));
				};
				options.signal?.addEventListener("abort", listener, { once: true });
			})]).finally(() => {
				if (options.signal && listener) options.signal.removeEventListener("abort", listener);
			});
		}
		return this.call(callable, ...args);
	}
	fetch(...args) {
		return this.call(() => fetch(...args).then((res) => res.ok ? res : Promise.reject(res)));
	}
};
//#endregion
exports.AsyncCaller = AsyncCaller;
Object.defineProperty(exports, "async_caller_exports", {
	enumerable: true,
	get: function() {
		return async_caller_exports;
	}
});

//# sourceMappingURL=async_caller.cjs.map