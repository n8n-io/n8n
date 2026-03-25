"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const redis_errors_1 = require("redis-errors");
class MaxRetriesPerRequestError extends redis_errors_1.AbortError {
    constructor(maxRetriesPerRequest) {
        const message = `Reached the max retries per request limit (which is ${maxRetriesPerRequest}). Refer to "maxRetriesPerRequest" option for details.`;
        super(message);
        Error.captureStackTrace(this, this.constructor);
    }
    get name() {
        return this.constructor.name;
    }
}
exports.default = MaxRetriesPerRequestError;
