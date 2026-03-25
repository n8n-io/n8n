"use strict";
// Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwsCrc32 = void 0;
var tslib_1 = require("tslib");
var util_1 = require("@aws-crypto/util");
var index_1 = require("./index");
var AwsCrc32 = /** @class */ (function () {
    function AwsCrc32() {
        this.crc32 = new index_1.Crc32();
    }
    AwsCrc32.prototype.update = function (toHash) {
        if ((0, util_1.isEmptyData)(toHash))
            return;
        this.crc32.update((0, util_1.convertToBuffer)(toHash));
    };
    AwsCrc32.prototype.digest = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                return [2 /*return*/, (0, util_1.numToUint8)(this.crc32.digest())];
            });
        });
    };
    AwsCrc32.prototype.reset = function () {
        this.crc32 = new index_1.Crc32();
    };
    return AwsCrc32;
}());
exports.AwsCrc32 = AwsCrc32;
//# sourceMappingURL=aws_crc32.js.map