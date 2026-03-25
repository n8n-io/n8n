"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const redis_errors_1 = require("redis-errors");
class ClusterAllFailedError extends redis_errors_1.RedisError {
    constructor(message, lastNodeError) {
        super(message);
        this.lastNodeError = lastNodeError;
        Error.captureStackTrace(this, this.constructor);
    }
    get name() {
        return this.constructor.name;
    }
}
exports.default = ClusterAllFailedError;
ClusterAllFailedError.defaultMessage = "Failed to refresh slots cache.";
