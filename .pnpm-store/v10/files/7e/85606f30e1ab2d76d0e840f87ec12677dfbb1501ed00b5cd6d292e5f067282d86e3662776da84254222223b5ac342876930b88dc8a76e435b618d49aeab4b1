// Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { __awaiter, __generator } from "tslib";
import { convertToBuffer, isEmptyData, numToUint8 } from "@aws-crypto/util";
import { Crc32c } from "./index";
var AwsCrc32c = /** @class */ (function () {
    function AwsCrc32c() {
        this.crc32c = new Crc32c();
    }
    AwsCrc32c.prototype.update = function (toHash) {
        if (isEmptyData(toHash))
            return;
        this.crc32c.update(convertToBuffer(toHash));
    };
    AwsCrc32c.prototype.digest = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, numToUint8(this.crc32c.digest())];
            });
        });
    };
    AwsCrc32c.prototype.reset = function () {
        this.crc32c = new Crc32c();
    };
    return AwsCrc32c;
}());
export { AwsCrc32c };
//# sourceMappingURL=aws_crc32c.js.map