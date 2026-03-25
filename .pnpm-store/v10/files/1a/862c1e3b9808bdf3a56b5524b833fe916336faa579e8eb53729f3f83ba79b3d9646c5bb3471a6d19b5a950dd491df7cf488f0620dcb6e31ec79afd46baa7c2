import { isEmptyData, convertToBuffer } from "@aws-crypto/util";
import { EMPTY_DATA_SHA_256, SHA_256_HASH, SHA_256_HMAC_ALGO, } from "./constants";
import { locateWindow } from "@aws-sdk/util-locate-window";
var Sha256 = /** @class */ (function () {
    function Sha256(secret) {
        this.toHash = new Uint8Array(0);
        this.secret = secret;
        this.reset();
    }
    Sha256.prototype.update = function (data) {
        if (isEmptyData(data)) {
            return;
        }
        var update = convertToBuffer(data);
        var typedArray = new Uint8Array(this.toHash.byteLength + update.byteLength);
        typedArray.set(this.toHash, 0);
        typedArray.set(update, this.toHash.byteLength);
        this.toHash = typedArray;
    };
    Sha256.prototype.digest = function () {
        var _this = this;
        if (this.key) {
            return this.key.then(function (key) {
                return locateWindow()
                    .crypto.subtle.sign(SHA_256_HMAC_ALGO, key, _this.toHash)
                    .then(function (data) { return new Uint8Array(data); });
            });
        }
        if (isEmptyData(this.toHash)) {
            return Promise.resolve(EMPTY_DATA_SHA_256);
        }
        return Promise.resolve()
            .then(function () {
            return locateWindow().crypto.subtle.digest(SHA_256_HASH, _this.toHash);
        })
            .then(function (data) { return Promise.resolve(new Uint8Array(data)); });
    };
    Sha256.prototype.reset = function () {
        var _this = this;
        this.toHash = new Uint8Array(0);
        if (this.secret && this.secret !== void 0) {
            this.key = new Promise(function (resolve, reject) {
                locateWindow()
                    .crypto.subtle.importKey("raw", convertToBuffer(_this.secret), SHA_256_HMAC_ALGO, false, ["sign"])
                    .then(resolve, reject);
            });
            this.key.catch(function () { });
        }
    };
    return Sha256;
}());
export { Sha256 };
//# sourceMappingURL=webCryptoSha256.js.map