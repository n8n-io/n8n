"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
const HRANDFIELD_COUNT_1 = require("./HRANDFIELD_COUNT");
var HRANDFIELD_COUNT_2 = require("./HRANDFIELD_COUNT");
Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function () { return HRANDFIELD_COUNT_2.FIRST_KEY_INDEX; } });
Object.defineProperty(exports, "IS_READ_ONLY", { enumerable: true, get: function () { return HRANDFIELD_COUNT_2.IS_READ_ONLY; } });
function transformArguments(key, count) {
    return [
        ...(0, HRANDFIELD_COUNT_1.transformArguments)(key, count),
        'WITHVALUES'
    ];
}
exports.transformArguments = transformArguments;
var generic_transformers_1 = require("./generic-transformers");
Object.defineProperty(exports, "transformReply", { enumerable: true, get: function () { return generic_transformers_1.transformTuplesReply; } });
