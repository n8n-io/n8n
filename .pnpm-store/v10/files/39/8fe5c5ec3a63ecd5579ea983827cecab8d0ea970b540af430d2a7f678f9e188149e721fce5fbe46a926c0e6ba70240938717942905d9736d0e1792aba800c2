import { AwsCrc32 } from "@aws-crypto/crc32";
import { numToUint8 } from "@aws-crypto/util";
import * as zlib from "zlib";
class NodeCrc32 {
    checksum = 0;
    update(data) {
        this.checksum = zlib.crc32(data, this.checksum);
    }
    async digest() {
        return numToUint8(this.checksum);
    }
    reset() {
        this.checksum = 0;
    }
}
export const getCrc32ChecksumAlgorithmFunction = () => {
    if (typeof zlib.crc32 === "undefined") {
        return AwsCrc32;
    }
    return NodeCrc32;
};
