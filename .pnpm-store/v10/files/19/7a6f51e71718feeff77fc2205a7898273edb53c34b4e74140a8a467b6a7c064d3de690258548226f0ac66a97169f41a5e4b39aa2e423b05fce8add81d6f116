"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sha512 = exports.Sha256 = exports.Sha1 = void 0;
const crypto = require("crypto");
class Sha1 {
    constructor() {
        this.getHash = function (xml) {
            const shasum = crypto.createHash("sha1");
            shasum.update(xml, "utf8");
            const res = shasum.digest("base64");
            return res;
        };
        this.getAlgorithmName = function () {
            return "http://www.w3.org/2000/09/xmldsig#sha1";
        };
    }
}
exports.Sha1 = Sha1;
class Sha256 {
    constructor() {
        this.getHash = function (xml) {
            const shasum = crypto.createHash("sha256");
            shasum.update(xml, "utf8");
            const res = shasum.digest("base64");
            return res;
        };
        this.getAlgorithmName = function () {
            return "http://www.w3.org/2001/04/xmlenc#sha256";
        };
    }
}
exports.Sha256 = Sha256;
class Sha512 {
    constructor() {
        this.getHash = function (xml) {
            const shasum = crypto.createHash("sha512");
            shasum.update(xml, "utf8");
            const res = shasum.digest("base64");
            return res;
        };
        this.getAlgorithmName = function () {
            return "http://www.w3.org/2001/04/xmlenc#sha512";
        };
    }
}
exports.Sha512 = Sha512;
//# sourceMappingURL=hash-algorithms.js.map