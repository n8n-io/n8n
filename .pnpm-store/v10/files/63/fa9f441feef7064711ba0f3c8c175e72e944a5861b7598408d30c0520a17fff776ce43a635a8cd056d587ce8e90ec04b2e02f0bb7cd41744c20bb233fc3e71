"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const calculateSlot = require("cluster-key-slot");
const commands_1 = require("@ioredis/commands");
const standard_as_callback_1 = require("standard-as-callback");
const util_1 = require("util");
const Command_1 = require("./Command");
const utils_1 = require("./utils");
const Commander_1 = require("./utils/Commander");
/*
  This function derives from the cluster-key-slot implementation.
  Instead of checking that all keys have the same slot, it checks that all slots are served by the same set of nodes.
  If this is satisfied, it returns the first key's slot.
*/
function generateMultiWithNodes(redis, keys) {
    const slot = calculateSlot(keys[0]);
    const target = redis._groupsBySlot[slot];
    for (let i = 1; i < keys.length; i++) {
        if (redis._groupsBySlot[calculateSlot(keys[i])] !== target) {
            return -1;
        }
    }
    return slot;
}
class Pipeline extends Commander_1.default {
    constructor(redis) {
        super();
        this.redis = redis;
        this.isPipeline = true;
        this.replyPending = 0;
        this._queue = [];
        this._result = [];
        this._transactions = 0;
        this._shaToScript = {};
        this.isCluster =
            this.redis.constructor.name === "Cluster" || this.redis.isCluster;
        this.options = redis.options;
        Object.keys(redis.scriptsSet).forEach((name) => {
            const script = redis.scriptsSet[name];
            this._shaToScript[script.sha] = script;
            this[name] = redis[name];
            this[name + "Buffer"] = redis[name + "Buffer"];
        });
        redis.addedBuiltinSet.forEach((name) => {
            this[name] = redis[name];
            this[name + "Buffer"] = redis[name + "Buffer"];
        });
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
        const _this = this;
        Object.defineProperty(this, "length", {
            get: function () {
                return _this._queue.length;
            },
        });
    }
    fillResult(value, position) {
        if (this._queue[position].name === "exec" && Array.isArray(value[1])) {
            const execLength = value[1].length;
            for (let i = 0; i < execLength; i++) {
                if (value[1][i] instanceof Error) {
                    continue;
                }
                const cmd = this._queue[position - (execLength - i)];
                try {
                    value[1][i] = cmd.transformReply(value[1][i]);
                }
                catch (err) {
                    value[1][i] = err;
                }
            }
        }
        this._result[position] = value;
        if (--this.replyPending) {
            return;
        }
        if (this.isCluster) {
            let retriable = true;
            let commonError;
            for (let i = 0; i < this._result.length; ++i) {
                const error = this._result[i][0];
                const command = this._queue[i];
                if (error) {
                    if (command.name === "exec" &&
                        error.message ===
                            "EXECABORT Transaction discarded because of previous errors.") {
                        continue;
                    }
                    if (!commonError) {
                        commonError = {
                            name: error.name,
                            message: error.message,
                        };
                    }
                    else if (commonError.name !== error.name ||
                        commonError.message !== error.message) {
                        retriable = false;
                        break;
                    }
                }
                else if (!command.inTransaction) {
                    const isReadOnly = (0, commands_1.exists)(command.name) && (0, commands_1.hasFlag)(command.name, "readonly");
                    if (!isReadOnly) {
                        retriable = false;
                        break;
                    }
                }
            }
            if (commonError && retriable) {
                const _this = this;
                const errv = commonError.message.split(" ");
                const queue = this._queue;
                let inTransaction = false;
                this._queue = [];
                for (let i = 0; i < queue.length; ++i) {
                    if (errv[0] === "ASK" &&
                        !inTransaction &&
                        queue[i].name !== "asking" &&
                        (!queue[i - 1] || queue[i - 1].name !== "asking")) {
                        const asking = new Command_1.default("asking");
                        asking.ignore = true;
                        this.sendCommand(asking);
                    }
                    queue[i].initPromise();
                    this.sendCommand(queue[i]);
                    inTransaction = queue[i].inTransaction;
                }
                let matched = true;
                if (typeof this.leftRedirections === "undefined") {
                    this.leftRedirections = {};
                }
                const exec = function () {
                    _this.exec();
                };
                const cluster = this.redis;
                cluster.handleError(commonError, this.leftRedirections, {
                    moved: function (_slot, key) {
                        _this.preferKey = key;
                        cluster.slots[errv[1]] = [key];
                        cluster._groupsBySlot[errv[1]] =
                            cluster._groupsIds[cluster.slots[errv[1]].join(";")];
                        cluster.refreshSlotsCache();
                        _this.exec();
                    },
                    ask: function (_slot, key) {
                        _this.preferKey = key;
                        _this.exec();
                    },
                    tryagain: exec,
                    clusterDown: exec,
                    connectionClosed: exec,
                    maxRedirections: () => {
                        matched = false;
                    },
                    defaults: () => {
                        matched = false;
                    },
                });
                if (matched) {
                    return;
                }
            }
        }
        let ignoredCount = 0;
        for (let i = 0; i < this._queue.length - ignoredCount; ++i) {
            if (this._queue[i + ignoredCount].ignore) {
                ignoredCount += 1;
            }
            this._result[i] = this._result[i + ignoredCount];
        }
        this.resolve(this._result.slice(0, this._result.length - ignoredCount));
    }
    sendCommand(command) {
        if (this._transactions > 0) {
            command.inTransaction = true;
        }
        const position = this._queue.length;
        command.pipelineIndex = position;
        command.promise
            .then((result) => {
            this.fillResult([null, result], position);
        })
            .catch((error) => {
            this.fillResult([error], position);
        });
        this._queue.push(command);
        return this;
    }
    addBatch(commands) {
        let command, commandName, args;
        for (let i = 0; i < commands.length; ++i) {
            command = commands[i];
            commandName = command[0];
            args = command.slice(1);
            this[commandName].apply(this, args);
        }
        return this;
    }
}
exports.default = Pipeline;
// @ts-expect-error
const multi = Pipeline.prototype.multi;
// @ts-expect-error
Pipeline.prototype.multi = function () {
    this._transactions += 1;
    return multi.apply(this, arguments);
};
// @ts-expect-error
const execBuffer = Pipeline.prototype.execBuffer;
// @ts-expect-error
Pipeline.prototype.execBuffer = (0, util_1.deprecate)(function () {
    if (this._transactions > 0) {
        this._transactions -= 1;
    }
    return execBuffer.apply(this, arguments);
}, "Pipeline#execBuffer: Use Pipeline#exec instead");
// NOTE: To avoid an unhandled promise rejection, this will unconditionally always return this.promise,
// which always has the rejection handled by standard-as-callback
// adding the provided rejection callback.
//
// If a different promise instance were returned, that promise would cause its own unhandled promise rejection
// errors, even if that promise unconditionally resolved to **the resolved value of** this.promise.
Pipeline.prototype.exec = function (callback) {
    // Wait for the cluster to be connected, since we need nodes information before continuing
    if (this.isCluster && !this.redis.slots.length) {
        if (this.redis.status === "wait")
            this.redis.connect().catch(utils_1.noop);
        if (callback && !this.nodeifiedPromise) {
            this.nodeifiedPromise = true;
            (0, standard_as_callback_1.default)(this.promise, callback);
        }
        this.redis.delayUntilReady((err) => {
            if (err) {
                this.reject(err);
                return;
            }
            this.exec(callback);
        });
        return this.promise;
    }
    if (this._transactions > 0) {
        this._transactions -= 1;
        return execBuffer.apply(this, arguments);
    }
    if (!this.nodeifiedPromise) {
        this.nodeifiedPromise = true;
        (0, standard_as_callback_1.default)(this.promise, callback);
    }
    if (!this._queue.length) {
        this.resolve([]);
    }
    let pipelineSlot;
    if (this.isCluster) {
        // List of the first key for each command
        const sampleKeys = [];
        for (let i = 0; i < this._queue.length; i++) {
            const keys = this._queue[i].getKeys();
            if (keys.length) {
                sampleKeys.push(keys[0]);
            }
            // For each command, check that the keys belong to the same slot
            if (keys.length && calculateSlot.generateMulti(keys) < 0) {
                this.reject(new Error("All the keys in a pipeline command should belong to the same slot"));
                return this.promise;
            }
        }
        if (sampleKeys.length) {
            pipelineSlot = generateMultiWithNodes(this.redis, sampleKeys);
            if (pipelineSlot < 0) {
                this.reject(new Error("All keys in the pipeline should belong to the same slots allocation group"));
                return this.promise;
            }
        }
        else {
            // Send the pipeline to a random node
            pipelineSlot = (Math.random() * 16384) | 0;
        }
    }
    const _this = this;
    execPipeline();
    return this.promise;
    function execPipeline() {
        let writePending = (_this.replyPending = _this._queue.length);
        let node;
        if (_this.isCluster) {
            node = {
                slot: pipelineSlot,
                redis: _this.redis.connectionPool.nodes.all[_this.preferKey],
            };
        }
        let data = "";
        let buffers;
        const stream = {
            isPipeline: true,
            destination: _this.isCluster ? node : { redis: _this.redis },
            write(writable) {
                if (typeof writable !== "string") {
                    if (!buffers) {
                        buffers = [];
                    }
                    if (data) {
                        buffers.push(Buffer.from(data, "utf8"));
                        data = "";
                    }
                    buffers.push(writable);
                }
                else {
                    data += writable;
                }
                if (!--writePending) {
                    if (buffers) {
                        if (data) {
                            buffers.push(Buffer.from(data, "utf8"));
                        }
                        stream.destination.redis.stream.write(Buffer.concat(buffers));
                    }
                    else {
                        stream.destination.redis.stream.write(data);
                    }
                    // Reset writePending for resending
                    writePending = _this._queue.length;
                    data = "";
                    buffers = undefined;
                }
            },
        };
        for (let i = 0; i < _this._queue.length; ++i) {
            _this.redis.sendCommand(_this._queue[i], stream, node);
        }
        return _this.promise;
    }
};
