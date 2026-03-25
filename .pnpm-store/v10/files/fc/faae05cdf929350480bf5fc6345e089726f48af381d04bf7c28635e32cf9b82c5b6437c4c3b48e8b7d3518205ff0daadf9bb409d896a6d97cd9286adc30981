const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_fetch = require('../singletons/fetch.cjs');
const p_retry = require_rolldown_runtime.__toESM(require("p-retry"));
const p_queue = require_rolldown_runtime.__toESM(require("p-queue"));

//#region src/utils/async_caller.ts
const STATUS_NO_RETRY = [
	400,
	401,
	402,
	403,
	404,
	405,
	406,
	407,
	408,
	409,
	422
];
/**
* Do not rely on globalThis.Response, rather just
* do duck typing
*/
function isResponse(x) {
	if (x == null || typeof x !== "object") return false;
	return "status" in x && "statusText" in x && "text" in x;
}
/**
* Utility error to properly handle failed requests
*/
var HTTPError = class HTTPError extends Error {
	status;
	text;
	response;
	constructor(status, message, response) {
		super(`HTTP ${status}: ${message}`);
		this.status = status;
		this.text = message;
		this.response = response;
	}
	static async fromResponse(response, options) {
		try {
			return new HTTPError(response.status, await response.text(), options?.includeResponse ? response : void 0);
		} catch {
			return new HTTPError(response.status, response.statusText, options?.includeResponse ? response : void 0);
		}
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
* Retries are limited by the `maxRetries` parameter, which defaults to 5. This
* means that by default, each call will be retried up to 5 times, with an
* exponential backoff between each attempt.
*/
var AsyncCaller = class {
	maxConcurrency;
	maxRetries;
	queue;
	onFailedResponseHook;
	customFetch;
	constructor(params) {
		this.maxConcurrency = params.maxConcurrency ?? Infinity;
		this.maxRetries = params.maxRetries ?? 4;
		if ("default" in p_queue.default) this.queue = new p_queue.default.default({ concurrency: this.maxConcurrency });
		else this.queue = new p_queue.default({ concurrency: this.maxConcurrency });
		this.onFailedResponseHook = params?.onFailedResponseHook;
		this.customFetch = params.fetch;
	}
	call(callable, ...args) {
		const { onFailedResponseHook } = this;
		return this.queue.add(() => (0, p_retry.default)(() => callable(...args).catch(async (error) => {
			if (error instanceof Error) throw error;
			else if (isResponse(error)) throw await HTTPError.fromResponse(error, { includeResponse: !!onFailedResponseHook });
			else throw new Error(error);
		}), {
			async onFailedAttempt(error) {
				if (error.message.startsWith("Cancel") || error.message.startsWith("TimeoutError") || error.message.startsWith("AbortError")) throw error;
				if (error?.code === "ECONNABORTED") throw error;
				if (error instanceof HTTPError) {
					if (STATUS_NO_RETRY.includes(error.status)) throw error;
					if (onFailedResponseHook && error.response) await onFailedResponseHook(error.response);
				}
			},
			retries: this.maxRetries,
			randomize: true
		}), { throwOnTimeout: true });
	}
	callWithOptions(options, callable, ...args) {
		if (options.signal) return Promise.race([this.call(callable, ...args), new Promise((_, reject) => {
			options.signal?.addEventListener("abort", () => {
				reject(/* @__PURE__ */ new Error("AbortError"));
			});
		})]);
		return this.call(callable, ...args);
	}
	fetch(...args) {
		const fetchFn = this.customFetch ?? require_fetch._getFetchImplementation();
		return this.call(() => fetchFn(...args).then((res) => res.ok ? res : Promise.reject(res)));
	}
};

//#endregion
exports.AsyncCaller = AsyncCaller;
//# sourceMappingURL=async_caller.cjs.map