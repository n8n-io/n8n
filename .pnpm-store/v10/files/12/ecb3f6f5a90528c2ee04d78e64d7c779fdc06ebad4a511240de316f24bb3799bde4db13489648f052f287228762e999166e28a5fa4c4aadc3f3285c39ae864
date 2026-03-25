"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrivateKey = void 0;
var utils_1 = require("@noble/ciphers/utils");
var types_js_1 = require("../types.js");
var index_js_1 = require("../utils/index.js");
var PublicKey_js_1 = require("./PublicKey.js");
var PrivateKey = /** @class */ (function () {
    function PrivateKey(secret, curve) {
        this.curve = curve;
        if (secret === undefined) {
            this.data = (0, index_js_1.getValidSecret)(curve);
        }
        else if ((0, index_js_1.isValidPrivateKey)(secret, curve)) {
            this.data = secret;
        }
        else {
            throw new Error("Invalid private key");
        }
        this.publicKey = new PublicKey_js_1.PublicKey((0, index_js_1.getPublicKey)(this.data, curve), curve);
    }
    PrivateKey.fromHex = function (hex, curve) {
        return new PrivateKey((0, index_js_1.decodeHex)(hex), curve);
    };
    Object.defineProperty(PrivateKey.prototype, "secret", {
        /**
         * @description
         * In version 0.4.18, `Buffer` is returned when available, otherwise `Uint8Array`.
         * From version 0.5.0, `Uint8Array` will be returned instead of `Buffer`.
         */
        get: function () {
            // TODO: Uint8Array only
            return types_js_1.IS_BUFFER_SUPPORTED ? Buffer.from(this.data) : this.data;
        },
        enumerable: false,
        configurable: true
    });
    PrivateKey.prototype.toHex = function () {
        return (0, utils_1.bytesToHex)(this.data);
    };
    /**
     * Derives a shared secret from ephemeral private key (this) and receiver's public key (pk).
     * @description The shared key is 32 bytes, derived with `HKDF-SHA256(senderPoint || sharedPoint)`. See implementation for details.
     *
     * There are some variations in different ECIES implementations:
     * which key derivation function to use, compressed or uncompressed `senderPoint`/`sharedPoint`, whether to include `senderPoint`, etc.
     *
     * Because the entropy of `senderPoint`, `sharedPoint` is enough high[1], we don't need salt to derive keys.
     *
     * [1]: Two reasons: the public keys are "random" bytes (albeit secp256k1 public keys are **not uniformly** random), and ephemeral keys are generated in every encryption.
     *
     * @param pk - Receiver's public key.
     * @param compressed - (default: `false`) Whether to use compressed or uncompressed public keys in the key derivation (secp256k1 only).
     * @returns Shared secret, derived with HKDF-SHA256.
     */
    PrivateKey.prototype.encapsulate = function (pk, compressed) {
        if (compressed === void 0) { compressed = false; }
        var senderPoint = this.publicKey.toBytes(compressed);
        var sharedPoint = this.multiply(pk, compressed);
        return (0, index_js_1.getSharedKey)(senderPoint, sharedPoint);
    };
    PrivateKey.prototype.multiply = function (pk, compressed) {
        if (compressed === void 0) { compressed = false; }
        return (0, index_js_1.getSharedPoint)(this.data, pk.toBytes(true), compressed, this.curve);
    };
    PrivateKey.prototype.equals = function (other) {
        return (0, utils_1.equalBytes)(this.data, other.data);
    };
    return PrivateKey;
}());
exports.PrivateKey = PrivateKey;
