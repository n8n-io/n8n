import { __toESM } from "../../../../../../../_virtual/rolldown_runtime.js";
import { require_dist } from "../../../../../p-queue@6.6.2/node_modules/p-queue/dist/index.js";
import pRetry from "p-retry";

//#region ../../node_modules/.pnpm/langsmith@0.3.74_@opentelemetry+api@1.9.0_openai@5.12.2_ws@8.18.3_bufferutil@4.0.9_utf-8-validate@6.0.5__zod@3.25.76_/node_modules/langsmith/dist/utils/async_caller.js
var import_dist = /* @__PURE__ */ __toESM(require_dist(), 1);
const STATUS_RETRYABLE = [
	429,
	500,
	502,
	503,
	504
];
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
	constructor(params) {
		Object.defineProperty(this, "maxConcurrency", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: void 0
		});
		Object.defineProperty(this, "maxRetries", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: void 0
		});
		Object.defineProperty(this, "queue", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: void 0
		});
		Object.defineProperty(this, "onFailedResponseHook", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: void 0
		});
		this.maxConcurrency = params.maxConcurrency ?? Infinity;
		this.maxRetries = params.maxRetries ?? 6;
		if ("default" in import_dist.default) this.queue = new import_dist.default.default({ concurrency: this.maxConcurrency });
		else this.queue = new import_dist.default({ concurrency: this.maxConcurrency });
		this.onFailedResponseHook = params?.onFailedResponseHook;
	}
	call(callable, ...args) {
		const onFailedResponseHook = this.onFailedResponseHook;
		return this.queue.add(() => pRetry(() => callable(...args).catch((error) => {
			if (error instanceof Error) throw error;
			else throw new Error(error);
		}), {
			async onFailedAttempt(error) {
				if (error.message.startsWith("Cancel") || error.message.startsWith("TimeoutError") || error.name === "TimeoutError" || error.message.startsWith("AbortError")) throw error;
				if (error?.code === "ECONNABORTED") throw error;
				const response = error?.response;
				if (onFailedResponseHook) {
					const handled = await onFailedResponseHook(response);
					if (handled) return;
				}
				const status = response?.status ?? error?.status;
				if (status) {
					if (!STATUS_RETRYABLE.includes(+status)) throw error;
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
};

//#endregion
export { AsyncCaller };
//# sourceMappingURL=async_caller.js.map