"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryOptions = void 0;
const nice_grpc_1 = require("nice-grpc");
exports.retryOptions = {
    retry: true,
    retryMaxAttempts: 5,
    retryableStatuses: [nice_grpc_1.Status.UNAVAILABLE],
    onRetryableError(error, attempt, delayMs) {
        console.warn(error, `Attempt ${attempt} failed. Retrying in ${delayMs}ms.`);
    },
};
