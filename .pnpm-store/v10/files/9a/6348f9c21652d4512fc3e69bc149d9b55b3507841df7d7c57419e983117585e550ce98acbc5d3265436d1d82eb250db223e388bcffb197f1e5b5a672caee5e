"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCrc32ChecksumAlgorithmFunction = void 0;
const tslib_1 = require("tslib");
const crc32_1 = require("@aws-crypto/crc32");
const util_1 = require("@aws-crypto/util");
const zlib = tslib_1.__importStar(require("zlib"));
class NodeCrc32 {
    checksum = 0;
    update(data) {
        this.checksum = zlib.crc32(data, this.checksum);
    }
    async digest() {
        return (0, util_1.numToUint8)(this.checksum);
    }
    reset() {
        this.checksum = 0;
    }
}
const getCrc32ChecksumAlgorithmFunction = () => {
    if (typeof zlib.crc32 === "undefined") {
        return crc32_1.AwsCrc32;
    }
    return NodeCrc32;
};
exports.getCrc32ChecksumAlgorithmFunction = getCrc32ChecksumAlgorithmFunction;
