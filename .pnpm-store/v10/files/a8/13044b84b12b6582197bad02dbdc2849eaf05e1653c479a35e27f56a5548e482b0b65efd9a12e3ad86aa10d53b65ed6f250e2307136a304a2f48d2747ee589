"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
const ZRANGEBYSCORE_1 = require("./ZRANGEBYSCORE");
var ZRANGEBYSCORE_2 = require("./ZRANGEBYSCORE");
Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function () { return ZRANGEBYSCORE_2.FIRST_KEY_INDEX; } });
Object.defineProperty(exports, "IS_READ_ONLY", { enumerable: true, get: function () { return ZRANGEBYSCORE_2.IS_READ_ONLY; } });
function transformArguments(key, min, max, options) {
    return [
        ...(0, ZRANGEBYSCORE_1.transformArguments)(key, min, max, options),
        'WITHSCORES'
    ];
}
exports.transformArguments = transformArguments;
var generic_transformers_1 = require("./generic-transformers");
Object.defineProperty(exports, "transformReply", { enumerable: true, get: function () { return generic_transformers_1.transformSortedSetWithScoresReply; } });
