// Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { __awaiter, __generator } from "tslib";
import { convertToBuffer, isEmptyData, numToUint8 } from "@aws-crypto/util";
import { Crc32 } from "./index";
var AwsCrc32 = /** @class */ (function () {
    function AwsCrc32() {
        this.crc32 = new Crc32();
    }
    AwsCrc32.prototype.update = function (toHash) {
        if (isEmptyData(toHash))
            return;
        this.crc32.update(convertToBuffer(toHash));
    };
    AwsCrc32.prototype.digest = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, numToUint8(this.crc32.digest())];
            });
        });
    };
    AwsCrc32.prototype.reset = function () {
        this.crc32 = new Crc32();
    };
    return AwsCrc32;
}());
export { AwsCrc32 };
//# sourceMappingURL=aws_crc32.js.map