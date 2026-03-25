"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
const ZINTER_1 = require("./ZINTER");
var ZINTER_2 = require("./ZINTER");
Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function () { return ZINTER_2.FIRST_KEY_INDEX; } });
Object.defineProperty(exports, "IS_READ_ONLY", { enumerable: true, get: function () { return ZINTER_2.IS_READ_ONLY; } });
function transformArguments(...args) {
    return [
        ...(0, ZINTER_1.transformArguments)(...args),
        'WITHSCORES'
    ];
}
exports.transformArguments = transformArguments;
var generic_transformers_1 = require("./generic-transformers");
Object.defineProperty(exports, "transformReply", { enumerable: true, get: function () { return generic_transformers_1.transformSortedSetWithScoresReply; } });
