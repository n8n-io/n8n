"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.constructorFromBucketSize = constructorFromBucketSize;
const PackedHistogram_1 = require("./PackedHistogram");
const Int8Histogram_1 = require("./Int8Histogram");
const Int16Histogram_1 = require("./Int16Histogram");
const Int32Histogram_1 = require("./Int32Histogram");
const Float64Histogram_1 = require("./Float64Histogram");
function constructorFromBucketSize(bitBucketSize) {
    switch (bitBucketSize) {
        case "packed":
            return PackedHistogram_1.default;
        case 8:
            return Int8Histogram_1.default;
        case 16:
            return Int16Histogram_1.default;
        case 32:
            return Int32Histogram_1.default;
        case 64:
            return Float64Histogram_1.default;
        default:
            throw new Error("Incorrect parameter bitBucketSize");
    }
}
//# sourceMappingURL=JsHistogramFactory.js.map