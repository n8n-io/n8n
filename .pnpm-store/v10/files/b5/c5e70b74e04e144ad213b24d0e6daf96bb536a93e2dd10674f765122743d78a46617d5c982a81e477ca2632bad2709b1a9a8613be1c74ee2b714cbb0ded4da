"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HmacSha1 = exports.RsaSha512 = exports.RsaSha256 = exports.RsaSha1 = void 0;
const crypto = require("crypto");
const types_1 = require("./types");
class RsaSha1 {
    constructor() {
        this.getSignature = (0, types_1.createOptionalCallbackFunction)((signedInfo, privateKey) => {
            const signer = crypto.createSign("RSA-SHA1");
            signer.update(signedInfo);
            const res = signer.sign(privateKey, "base64");
            return res;
        });
        this.verifySignature = (0, types_1.createOptionalCallbackFunction)((material, key, signatureValue) => {
            const verifier = crypto.createVerify("RSA-SHA1");
            verifier.update(material);
            const res = verifier.verify(key, signatureValue, "base64");
            return res;
        });
        this.getAlgorithmName = () => {
            return "http://www.w3.org/2000/09/xmldsig#rsa-sha1";
        };
    }
}
exports.RsaSha1 = RsaSha1;
class RsaSha256 {
    constructor() {
        this.getSignature = (0, types_1.createOptionalCallbackFunction)((signedInfo, privateKey) => {
            const signer = crypto.createSign("RSA-SHA256");
            signer.update(signedInfo);
            const res = signer.sign(privateKey, "base64");
            return res;
        });
        this.verifySignature = (0, types_1.createOptionalCallbackFunction)((material, key, signatureValue) => {
            const verifier = crypto.createVerify("RSA-SHA256");
            verifier.update(material);
            const res = verifier.verify(key, signatureValue, "base64");
            return res;
        });
        this.getAlgorithmName = () => {
            return "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256";
        };
    }
}
exports.RsaSha256 = RsaSha256;
class RsaSha512 {
    constructor() {
        this.getSignature = (0, types_1.createOptionalCallbackFunction)((signedInfo, privateKey) => {
            const signer = crypto.createSign("RSA-SHA512");
            signer.update(signedInfo);
            const res = signer.sign(privateKey, "base64");
            return res;
        });
        this.verifySignature = (0, types_1.createOptionalCallbackFunction)((material, key, signatureValue) => {
            const verifier = crypto.createVerify("RSA-SHA512");
            verifier.update(material);
            const res = verifier.verify(key, signatureValue, "base64");
            return res;
        });
        this.getAlgorithmName = () => {
            return "http://www.w3.org/2001/04/xmldsig-more#rsa-sha512";
        };
    }
}
exports.RsaSha512 = RsaSha512;
class HmacSha1 {
    constructor() {
        this.getSignature = (0, types_1.createOptionalCallbackFunction)((signedInfo, privateKey) => {
            const signer = crypto.createHmac("SHA1", privateKey);
            signer.update(signedInfo);
            const res = signer.digest("base64");
            return res;
        });
        this.verifySignature = (0, types_1.createOptionalCallbackFunction)((material, key, signatureValue) => {
            const verifier = crypto.createHmac("SHA1", key);
            verifier.update(material);
            const res = verifier.digest("base64");
            return res === signatureValue;
        });
        this.getAlgorithmName = () => {
            return "http://www.w3.org/2000/09/xmldsig#hmac-sha1";
        };
    }
}
exports.HmacSha1 = HmacSha1;
//# sourceMappingURL=signature-algorithms.js.map