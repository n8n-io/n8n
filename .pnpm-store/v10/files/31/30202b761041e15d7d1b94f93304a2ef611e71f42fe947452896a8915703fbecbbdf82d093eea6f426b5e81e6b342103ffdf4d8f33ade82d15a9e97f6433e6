"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformDoublesReply = exports.transformDoubleReply = exports.pushCompressionArgument = void 0;
const ADD = require("./ADD");
const BYRANK = require("./BYRANK");
const BYREVRANK = require("./BYREVRANK");
const CDF = require("./CDF");
const CREATE = require("./CREATE");
const INFO = require("./INFO");
const MAX = require("./MAX");
const MERGE = require("./MERGE");
const MIN = require("./MIN");
const QUANTILE = require("./QUANTILE");
const RANK = require("./RANK");
const RESET = require("./RESET");
const REVRANK = require("./REVRANK");
const TRIMMED_MEAN = require("./TRIMMED_MEAN");
exports.default = {
    ADD,
    add: ADD,
    BYRANK,
    byRank: BYRANK,
    BYREVRANK,
    byRevRank: BYREVRANK,
    CDF,
    cdf: CDF,
    CREATE,
    create: CREATE,
    INFO,
    info: INFO,
    MAX,
    max: MAX,
    MERGE,
    merge: MERGE,
    MIN,
    min: MIN,
    QUANTILE,
    quantile: QUANTILE,
    RANK,
    rank: RANK,
    RESET,
    reset: RESET,
    REVRANK,
    revRank: REVRANK,
    TRIMMED_MEAN,
    trimmedMean: TRIMMED_MEAN
};
function pushCompressionArgument(args, options) {
    if (options?.COMPRESSION) {
        args.push('COMPRESSION', options.COMPRESSION.toString());
    }
    return args;
}
exports.pushCompressionArgument = pushCompressionArgument;
function transformDoubleReply(reply) {
    switch (reply) {
        case 'inf':
            return Infinity;
        case '-inf':
            return -Infinity;
        case 'nan':
            return NaN;
        default:
            return parseFloat(reply);
    }
}
exports.transformDoubleReply = transformDoubleReply;
function transformDoublesReply(reply) {
    return reply.map(transformDoubleReply);
}
exports.transformDoublesReply = transformDoublesReply;
