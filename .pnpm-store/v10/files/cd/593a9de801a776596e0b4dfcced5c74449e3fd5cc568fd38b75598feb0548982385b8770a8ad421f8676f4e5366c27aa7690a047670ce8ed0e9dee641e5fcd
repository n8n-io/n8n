import { Sha1 as WebCryptoSha1 } from "./webCryptoSha1";
import { supportsWebCrypto } from "@aws-crypto/supports-web-crypto";
import { locateWindow } from "@aws-sdk/util-locate-window";
import { convertToBuffer } from "@aws-crypto/util";
var Sha1 = /** @class */ (function () {
    function Sha1(secret) {
        if (supportsWebCrypto(locateWindow())) {
            this.hash = new WebCryptoSha1(secret);
        }
        else {
            throw new Error("SHA1 not supported");
        }
    }
    Sha1.prototype.update = function (data, encoding) {
        this.hash.update(convertToBuffer(data));
    };
    Sha1.prototype.digest = function () {
        return this.hash.digest();
    };
    Sha1.prototype.reset = function () {
        this.hash.reset();
    };
    return Sha1;
}());
export { Sha1 };
//# sourceMappingURL=crossPlatformSha1.js.map