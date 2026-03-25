"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
exports.FIRST_KEY_INDEX = 1;
exports.IS_READ_ONLY = true;
function transformArguments(key, lowCutPercentile, highCutPercentile) {
    return [
        'TDIGEST.TRIMMED_MEAN',
        key,
        lowCutPercentile.toString(),
        highCutPercentile.toString()
    ];
}
exports.transformArguments = transformArguments;
var _1 = require(".");
Object.defineProperty(exports, "transformReply", { enumerable: true, get: function () { return _1.transformDoubleReply; } });
