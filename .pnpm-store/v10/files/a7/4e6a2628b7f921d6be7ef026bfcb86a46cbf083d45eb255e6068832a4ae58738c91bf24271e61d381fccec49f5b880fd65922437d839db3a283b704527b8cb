"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ephemeralKeySize = exports.symmetricNonceLength = exports.symmetricAlgorithm = exports.isHkdfKeyCompressed = exports.isEphemeralKeyCompressed = exports.ellipticCurve = exports.ECIES_CONFIG = exports.Config = void 0;
var consts_js_1 = require("./consts.js");
var Config = /** @class */ (function () {
    function Config() {
        this.ellipticCurve = "secp256k1";
        this.isEphemeralKeyCompressed = false; // secp256k1 only
        this.isHkdfKeyCompressed = false; // secp256k1 only
        this.symmetricAlgorithm = "aes-256-gcm";
        this.symmetricNonceLength = 16; // aes-256-gcm only
    }
    Object.defineProperty(Config.prototype, "ephemeralKeySize", {
        get: function () {
            var mapping = {
                secp256k1: this.isEphemeralKeyCompressed
                    ? consts_js_1.COMPRESSED_PUBLIC_KEY_SIZE
                    : consts_js_1.UNCOMPRESSED_PUBLIC_KEY_SIZE,
                x25519: consts_js_1.CURVE25519_PUBLIC_KEY_SIZE,
                ed25519: consts_js_1.CURVE25519_PUBLIC_KEY_SIZE,
            };
            /* v8 ignore else -- @preserve */
            if (this.ellipticCurve in mapping) {
                return mapping[this.ellipticCurve];
            }
            else {
                throw new Error("Not implemented");
            }
        },
        enumerable: false,
        configurable: true
    });
    return Config;
}());
exports.Config = Config;
exports.ECIES_CONFIG = new Config();
// TODO: remove these after 0.5.0
/** @deprecated - use individual attribute instead */
var ellipticCurve = function () { return exports.ECIES_CONFIG.ellipticCurve; };
exports.ellipticCurve = ellipticCurve;
/** @deprecated - use individual attribute instead */
var isEphemeralKeyCompressed = function () { return exports.ECIES_CONFIG.isEphemeralKeyCompressed; };
exports.isEphemeralKeyCompressed = isEphemeralKeyCompressed;
/** @deprecated - use individual attribute instead */
var isHkdfKeyCompressed = function () { return exports.ECIES_CONFIG.isHkdfKeyCompressed; };
exports.isHkdfKeyCompressed = isHkdfKeyCompressed;
/** @deprecated - use individual attribute instead */
var symmetricAlgorithm = function () { return exports.ECIES_CONFIG.symmetricAlgorithm; };
exports.symmetricAlgorithm = symmetricAlgorithm;
/** @deprecated - use individual attribute instead */
var symmetricNonceLength = function () { return exports.ECIES_CONFIG.symmetricNonceLength; };
exports.symmetricNonceLength = symmetricNonceLength;
/** @deprecated - use individual attribute instead */
var ephemeralKeySize = function () { return exports.ECIES_CONFIG.ephemeralKeySize; };
exports.ephemeralKeySize = ephemeralKeySize;
