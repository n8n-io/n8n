"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryMiddleware = void 0;
const abort_controller_x_1 = require("abort-controller-x");
const nice_grpc_common_1 = require("nice-grpc-common");
const defaultRetryableStatuses = [
    nice_grpc_common_1.Status.UNKNOWN,
    nice_grpc_common_1.Status.INTERNAL,
    nice_grpc_common_1.Status.UNAVAILABLE,
    // Server may return `CANCELLED` if it is shutting down. We can distinguish
    // this from client-initiated cancellations because these are returned as
    // `AbortError`s.
    nice_grpc_common_1.Status.CANCELLED,
];
/**
 * Client middleware that adds automatic retries to unary calls.
 */
const retryMiddleware = async function* retryMiddleware(call, options) {
    var _a;
    const { idempotencyLevel } = call.method.options;
    const isIdempotent = idempotencyLevel === 'IDEMPOTENT' ||
        idempotencyLevel === 'NO_SIDE_EFFECTS';
    const { retry = isIdempotent, retryBaseDelayMs = 1000, retryMaxDelayMs = 30000, retryMaxAttempts = 1, onRetryableError, retryableStatuses = defaultRetryableStatuses, ...restOptions } = options;
    if (call.requestStream || call.responseStream || !retry) {
        return yield* call.next(call.request, restOptions);
    }
    const signal = (_a = options.signal) !== null && _a !== void 0 ? _a : new AbortController().signal;
    for (let attempt = 0;; attempt++) {
        try {
            return yield* call.next(call.request, restOptions);
        }
        catch (error) {
            (0, abort_controller_x_1.rethrowAbortError)(error);
            if (attempt >= retryMaxAttempts ||
                !(error instanceof nice_grpc_common_1.ClientError) ||
                !retryableStatuses.includes(error.code)) {
                throw error;
            }
            // https://aws.amazon.com/ru/blogs/architecture/exponential-backoff-and-jitter/
            const backoff = Math.min(retryMaxDelayMs, Math.pow(2, attempt) * retryBaseDelayMs);
            const delayMs = Math.round((backoff * (1 + Math.random())) / 2);
            onRetryableError === null || onRetryableError === void 0 ? void 0 : onRetryableError(error, attempt, delayMs);
            await (0, abort_controller_x_1.delay)(signal, delayMs);
        }
    }
};
exports.retryMiddleware = retryMiddleware;
//# sourceMappingURL=index.js.map