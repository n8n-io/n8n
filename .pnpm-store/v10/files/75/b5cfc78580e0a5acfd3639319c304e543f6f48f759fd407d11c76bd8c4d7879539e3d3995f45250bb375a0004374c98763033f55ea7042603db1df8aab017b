"use strict";
// Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwsCrc32c = void 0;
var tslib_1 = require("tslib");
var util_1 = require("@aws-crypto/util");
var index_1 = require("./index");
var AwsCrc32c = /** @class */ (function () {
    function AwsCrc32c() {
        this.crc32c = new index_1.Crc32c();
    }
    AwsCrc32c.prototype.update = function (toHash) {
        if ((0, util_1.isEmptyData)(toHash))
            return;
        this.crc32c.update((0, util_1.convertToBuffer)(toHash));
    };
    AwsCrc32c.prototype.digest = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                return [2 /*return*/, (0, util_1.numToUint8)(this.crc32c.digest())];
            });
        });
    };
    AwsCrc32c.prototype.reset = function () {
        this.crc32c = new index_1.Crc32c();
    };
    return AwsCrc32c;
}());
exports.AwsCrc32c = AwsCrc32c;
//# sourceMappingURL=aws_crc32c.js.map