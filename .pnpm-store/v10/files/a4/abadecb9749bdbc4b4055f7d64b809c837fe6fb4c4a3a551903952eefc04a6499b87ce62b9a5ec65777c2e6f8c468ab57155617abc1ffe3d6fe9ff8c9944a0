"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
const ZPOPMAX_1 = require("./ZPOPMAX");
var ZPOPMAX_2 = require("./ZPOPMAX");
Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function () { return ZPOPMAX_2.FIRST_KEY_INDEX; } });
function transformArguments(key, count) {
    return [
        ...(0, ZPOPMAX_1.transformArguments)(key),
        count.toString()
    ];
}
exports.transformArguments = transformArguments;
var generic_transformers_1 = require("./generic-transformers");
Object.defineProperty(exports, "transformReply", { enumerable: true, get: function () { return generic_transformers_1.transformSortedSetWithScoresReply; } });
