"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.print = exports.ReplyError = exports.SentinelIterator = exports.SentinelConnector = exports.AbstractConnector = exports.Pipeline = exports.ScanStream = exports.Command = exports.Cluster = exports.Redis = exports.default = void 0;
exports = module.exports = require("./Redis").default;
var Redis_1 = require("./Redis");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return Redis_1.default; } });
var Redis_2 = require("./Redis");
Object.defineProperty(exports, "Redis", { enumerable: true, get: function () { return Redis_2.default; } });
var cluster_1 = require("./cluster");
Object.defineProperty(exports, "Cluster", { enumerable: true, get: function () { return cluster_1.default; } });
/**
 * @ignore
 */
var Command_1 = require("./Command");
Object.defineProperty(exports, "Command", { enumerable: true, get: function () { return Command_1.default; } });
/**
 * @ignore
 */
var ScanStream_1 = require("./ScanStream");
Object.defineProperty(exports, "ScanStream", { enumerable: true, get: function () { return ScanStream_1.default; } });
/**
 * @ignore
 */
var Pipeline_1 = require("./Pipeline");
Object.defineProperty(exports, "Pipeline", { enumerable: true, get: function () { return Pipeline_1.default; } });
/**
 * @ignore
 */
var AbstractConnector_1 = require("./connectors/AbstractConnector");
Object.defineProperty(exports, "AbstractConnector", { enumerable: true, get: function () { return AbstractConnector_1.default; } });
/**
 * @ignore
 */
var SentinelConnector_1 = require("./connectors/SentinelConnector");
Object.defineProperty(exports, "SentinelConnector", { enumerable: true, get: function () { return SentinelConnector_1.default; } });
Object.defineProperty(exports, "SentinelIterator", { enumerable: true, get: function () { return SentinelConnector_1.SentinelIterator; } });
// No TS typings
exports.ReplyError = require("redis-errors").ReplyError;
/**
 * @ignore
 */
Object.defineProperty(exports, "Promise", {
    get() {
        console.warn("ioredis v5 does not support plugging third-party Promise library anymore. Native Promise will be used.");
        return Promise;
    },
    set(_lib) {
        console.warn("ioredis v5 does not support plugging third-party Promise library anymore. Native Promise will be used.");
    },
});
/**
 * @ignore
 */
function print(err, reply) {
    if (err) {
        console.log("Error: " + err);
    }
    else {
        console.log("Reply: " + reply);
    }
}
exports.print = print;
