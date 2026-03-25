"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
const generic_transformers_1 = require("./generic-transformers");
var GEOSEARCH_1 = require("./GEOSEARCH");
Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function () { return GEOSEARCH_1.FIRST_KEY_INDEX; } });
Object.defineProperty(exports, "IS_READ_ONLY", { enumerable: true, get: function () { return GEOSEARCH_1.IS_READ_ONLY; } });
function transformArguments(destination, source, from, by, options) {
    const args = (0, generic_transformers_1.pushGeoSearchArguments)(['GEOSEARCHSTORE', destination], source, from, by, options);
    if (options?.STOREDIST) {
        args.push('STOREDIST');
    }
    return args;
}
exports.transformArguments = transformArguments;
function transformReply(reply) {
    if (typeof reply !== 'number') {
        throw new TypeError(`https://github.com/redis/redis/issues/9261`);
    }
    return reply;
}
exports.transformReply = transformReply;
