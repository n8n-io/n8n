"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
const ZPOPMIN_1 = require("./ZPOPMIN");
var ZPOPMIN_2 = require("./ZPOPMIN");
Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function () { return ZPOPMIN_2.FIRST_KEY_INDEX; } });
function transformArguments(key, count) {
    return [
        ...(0, ZPOPMIN_1.transformArguments)(key),
        count.toString()
    ];
}
exports.transformArguments = transformArguments;
var generic_transformers_1 = require("./generic-transformers");
Object.defineProperty(exports, "transformReply", { enumerable: true, get: function () { return generic_transformers_1.transformSortedSetWithScoresReply; } });
