"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicKey = void 0;
var utils_1 = require("@noble/ciphers/utils");
var types_js_1 = require("../types.js");
var index_js_1 = require("../utils/index.js");
var PublicKey = /** @class */ (function () {
    function PublicKey(data, curve) {
        // data can be either compressed or uncompressed if secp256k1
        var compressed = (0, index_js_1.convertPublicKeyFormat)(data, true, curve);
        var uncompressed = (0, index_js_1.convertPublicKeyFormat)(data, false, curve);
        this.data = compressed;
        this.dataUncompressed =
            compressed.length !== uncompressed.length ? uncompressed : null;
    }
    PublicKey.fromHex = function (hex, curve) {
        return new PublicKey((0, index_js_1.hexToPublicKey)(hex, curve), curve);
    };
    Object.defineProperty(PublicKey.prototype, "_uncompressed", {
        get: function () {
            return this.dataUncompressed !== null ? this.dataUncompressed : this.data;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(PublicKey.prototype, "uncompressed", {
        /** @deprecated - use `PublicKey.toBytes(false)` instead. You may also need `Buffer.from`. */
        get: function () {
            // TODO: delete
            return types_js_1.IS_BUFFER_SUPPORTED ? Buffer.from(this._uncompressed) : this._uncompressed;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(PublicKey.prototype, "compressed", {
        /** @deprecated - use `PublicKey.toBytes()` instead. You may also need `Buffer.from`. */
        get: function () {
            // TODO: delete
            return types_js_1.IS_BUFFER_SUPPORTED ? Buffer.from(this.data) : this.data;
        },
        enumerable: false,
        configurable: true
    });
    PublicKey.prototype.toBytes = function (compressed) {
        if (compressed === void 0) { compressed = true; }
        return compressed ? this.data : this._uncompressed;
    };
    PublicKey.prototype.toHex = function (compressed) {
        if (compressed === void 0) { compressed = true; }
        return (0, utils_1.bytesToHex)(this.toBytes(compressed));
    };
    /**
     * Derives a shared secret from receiver's private key (sk) and ephemeral public key (this).
     * Opposite of `encapsulate`.
     * @see PrivateKey.encapsulate
     *
     * @param sk - Receiver's private key.
     * @param compressed - (default: `false`) Whether to use compressed or uncompressed public keys in the key derivation (secp256k1 only).
     * @returns Shared secret, derived with HKDF-SHA256.
     */
    PublicKey.prototype.decapsulate = function (sk, compressed) {
        if (compressed === void 0) { compressed = false; }
        var senderPoint = this.toBytes(compressed);
        var sharedPoint = sk.multiply(this, compressed);
        return (0, index_js_1.getSharedKey)(senderPoint, sharedPoint);
    };
    PublicKey.prototype.equals = function (other) {
        return (0, utils_1.equalBytes)(this.data, other.data);
    };
    return PublicKey;
}());
exports.PublicKey = PublicKey;
