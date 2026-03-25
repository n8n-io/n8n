import { Sha256 as WebCryptoSha256 } from "./webCryptoSha256";
import { Sha256 as JsSha256 } from "@aws-crypto/sha256-js";
import { supportsWebCrypto } from "@aws-crypto/supports-web-crypto";
import { locateWindow } from "@aws-sdk/util-locate-window";
import { convertToBuffer } from "@aws-crypto/util";
var Sha256 = /** @class */ (function () {
    function Sha256(secret) {
        if (supportsWebCrypto(locateWindow())) {
            this.hash = new WebCryptoSha256(secret);
        }
        else {
            this.hash = new JsSha256(secret);
        }
    }
    Sha256.prototype.update = function (data, encoding) {
        this.hash.update(convertToBuffer(data));
    };
    Sha256.prototype.digest = function () {
        return this.hash.digest();
    };
    Sha256.prototype.reset = function () {
        this.hash.reset();
    };
    return Sha256;
}());
export { Sha256 };
//# sourceMappingURL=crossPlatformSha256.js.map