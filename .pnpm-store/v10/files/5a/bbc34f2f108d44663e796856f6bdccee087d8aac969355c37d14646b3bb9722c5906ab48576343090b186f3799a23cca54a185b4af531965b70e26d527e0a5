import { fromUtf8 } from "@smithy/util-utf8";
import { isEmptyData } from "./isEmptyData";
import { EMPTY_DATA_SHA_1, SHA_1_HASH, SHA_1_HMAC_ALGO } from "./constants";
import { locateWindow } from "@aws-sdk/util-locate-window";
var Sha1 = /** @class */ (function () {
    function Sha1(secret) {
        this.toHash = new Uint8Array(0);
        if (secret !== void 0) {
            this.key = new Promise(function (resolve, reject) {
                locateWindow()
                    .crypto.subtle.importKey("raw", convertToBuffer(secret), SHA_1_HMAC_ALGO, false, ["sign"])
                    .then(resolve, reject);
            });
            this.key.catch(function () { });
        }
    }
    Sha1.prototype.update = function (data) {
        if (isEmptyData(data)) {
            return;
        }
        var update = convertToBuffer(data);
        var typedArray = new Uint8Array(this.toHash.byteLength + update.byteLength);
        typedArray.set(this.toHash, 0);
        typedArray.set(update, this.toHash.byteLength);
        this.toHash = typedArray;
    };
    Sha1.prototype.digest = function () {
        var _this = this;
        if (this.key) {
            return this.key.then(function (key) {
                return locateWindow()
                    .crypto.subtle.sign(SHA_1_HMAC_ALGO, key, _this.toHash)
                    .then(function (data) { return new Uint8Array(data); });
            });
        }
        if (isEmptyData(this.toHash)) {
            return Promise.resolve(EMPTY_DATA_SHA_1);
        }
        return Promise.resolve()
            .then(function () { return locateWindow().crypto.subtle.digest(SHA_1_HASH, _this.toHash); })
            .then(function (data) { return Promise.resolve(new Uint8Array(data)); });
    };
    Sha1.prototype.reset = function () {
        this.toHash = new Uint8Array(0);
    };
    return Sha1;
}());
export { Sha1 };
function convertToBuffer(data) {
    if (typeof data === "string") {
        return fromUtf8(data);
    }
    if (ArrayBuffer.isView(data)) {
        return new Uint8Array(data.buffer, data.byteOffset, data.byteLength / Uint8Array.BYTES_PER_ELEMENT);
    }
    return new Uint8Array(data);
}
//# sourceMappingURL=webCryptoSha1.js.map