"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
const ZUNION_1 = require("./ZUNION");
var ZUNION_2 = require("./ZUNION");
Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function () { return ZUNION_2.FIRST_KEY_INDEX; } });
Object.defineProperty(exports, "IS_READ_ONLY", { enumerable: true, get: function () { return ZUNION_2.IS_READ_ONLY; } });
function transformArguments(...args) {
    return [
        ...(0, ZUNION_1.transformArguments)(...args),
        'WITHSCORES'
    ];
}
exports.transformArguments = transformArguments;
var generic_transformers_1 = require("./generic-transformers");
Object.defineProperty(exports, "transformReply", { enumerable: true, get: function () { return generic_transformers_1.transformSortedSetWithScoresReply; } });
