"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addTransactionSupport = void 0;
const utils_1 = require("./utils");
const standard_as_callback_1 = require("standard-as-callback");
const Pipeline_1 = require("./Pipeline");
function addTransactionSupport(redis) {
    redis.pipeline = function (commands) {
        const pipeline = new Pipeline_1.default(this);
        if (Array.isArray(commands)) {
            pipeline.addBatch(commands);
        }
        return pipeline;
    };
    const { multi } = redis;
    redis.multi = function (commands, options) {
        if (typeof options === "undefined" && !Array.isArray(commands)) {
            options = commands;
            commands = null;
        }
        if (options && options.pipeline === false) {
            return multi.call(this);
        }
        const pipeline = new Pipeline_1.default(this);
        // @ts-expect-error
        pipeline.multi();
        if (Array.isArray(commands)) {
            pipeline.addBatch(commands);
        }
        const exec = pipeline.exec;
        pipeline.exec = function (callback) {
            // Wait for the cluster to be connected, since we need nodes information before continuing
            if (this.isCluster && !this.redis.slots.length) {
                if (this.redis.status === "wait")
                    this.redis.connect().catch(utils_1.noop);
                return (0, standard_as_callback_1.default)(new Promise((resolve, reject) => {
                    this.redis.delayUntilReady((err) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        this.exec(pipeline).then(resolve, reject);
                    });
                }), callback);
            }
            if (this._transactions > 0) {
                exec.call(pipeline);
            }
            // Returns directly when the pipeline
            // has been called multiple times (retries).
            if (this.nodeifiedPromise) {
                return exec.call(pipeline);
            }
            const promise = exec.call(pipeline);
            return (0, standard_as_callback_1.default)(promise.then(function (result) {
                const execResult = result[result.length - 1];
                if (typeof execResult === "undefined") {
                    throw new Error("Pipeline cannot be used to send any commands when the `exec()` has been called on it.");
                }
                if (execResult[0]) {
                    execResult[0].previousErrors = [];
                    for (let i = 0; i < result.length - 1; ++i) {
                        if (result[i][0]) {
                            execResult[0].previousErrors.push(result[i][0]);
                        }
                    }
                    throw execResult[0];
                }
                return (0, utils_1.wrapMultiResult)(execResult[1]);
            }), callback);
        };
        // @ts-expect-error
        const { execBuffer } = pipeline;
        // @ts-expect-error
        pipeline.execBuffer = function (callback) {
            if (this._transactions > 0) {
                execBuffer.call(pipeline);
            }
            return pipeline.exec(callback);
        };
        return pipeline;
    };
    const { exec } = redis;
    redis.exec = function (callback) {
        return (0, standard_as_callback_1.default)(exec.call(this).then(function (results) {
            if (Array.isArray(results)) {
                results = (0, utils_1.wrapMultiResult)(results);
            }
            return results;
        }), callback);
    };
}
exports.addTransactionSupport = addTransactionSupport;
