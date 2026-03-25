"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sha1 = void 0;
var webCryptoSha1_1 = require("./webCryptoSha1");
var supports_web_crypto_1 = require("@aws-crypto/supports-web-crypto");
var util_locate_window_1 = require("@aws-sdk/util-locate-window");
var util_1 = require("@aws-crypto/util");
var Sha1 = /** @class */ (function () {
    function Sha1(secret) {
        if ((0, supports_web_crypto_1.supportsWebCrypto)((0, util_locate_window_1.locateWindow)())) {
            this.hash = new webCryptoSha1_1.Sha1(secret);
        }
        else {
            throw new Error("SHA1 not supported");
        }
    }
    Sha1.prototype.update = function (data, encoding) {
        this.hash.update((0, util_1.convertToBuffer)(data));
    };
    Sha1.prototype.digest = function () {
        return this.hash.digest();
    };
    Sha1.prototype.reset = function () {
        this.hash.reset();
    };
    return Sha1;
}());
exports.Sha1 = Sha1;
//# sourceMappingURL=crossPlatformSha1.js.map