"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hexToPublicKey = exports.convertPublicKeyFormat = exports.getSharedPoint = exports.getPublicKey = exports.isValidPrivateKey = exports.getValidSecret = void 0;
var webcrypto_1 = require("@noble/ciphers/webcrypto");
var ed25519_1 = require("@noble/curves/ed25519");
var secp256k1_1 = require("@noble/curves/secp256k1");
var config_js_1 = require("../config.js");
var consts_js_1 = require("../consts.js");
var hex_js_1 = require("./hex.js");
var getValidSecret = function (curve) {
    var key;
    do {
        key = (0, webcrypto_1.randomBytes)(consts_js_1.SECRET_KEY_LENGTH);
    } while (!(0, exports.isValidPrivateKey)(key, curve));
    return key;
};
exports.getValidSecret = getValidSecret;
var isValidPrivateKey = function (secret, curve) {
    // on secp256k1: only key ∈ (0, group order) is valid
    // on curve25519: any 32-byte key is valid
    return _exec(curve, function (curve) { return curve.utils.isValidSecretKey(secret); }, function () { return true; }, function () { return true; });
};
exports.isValidPrivateKey = isValidPrivateKey;
var getPublicKey = function (secret, curve) {
    return _exec(curve, function (curve) { return curve.getPublicKey(secret); }, function (curve) { return curve.getPublicKey(secret); }, function (curve) { return curve.getPublicKey(secret); });
};
exports.getPublicKey = getPublicKey;
var getSharedPoint = function (sk, pk, compressed, curve) {
    return _exec(curve, function (curve) { return curve.getSharedSecret(sk, pk, compressed); }, function (curve) { return curve.getSharedSecret(sk, pk); }, function (curve) { return getSharedPointOnEd25519(curve, sk, pk); });
};
exports.getSharedPoint = getSharedPoint;
var convertPublicKeyFormat = function (pk, compressed, curve) {
    // only for secp256k1
    return _exec(curve, function (curve) {
        return curve.getSharedSecret(Uint8Array.from(Array(31).fill(0).concat([1])), // 1 as private key
        pk, compressed);
    }, function () { return pk; }, function () { return pk; });
};
exports.convertPublicKeyFormat = convertPublicKeyFormat;
var hexToPublicKey = function (hex, curve) {
    var decoded = (0, hex_js_1.decodeHex)(hex);
    return _exec(curve, function () { return compatEthPublicKey(decoded); }, function () { return decoded; }, function () { return decoded; });
};
exports.hexToPublicKey = hexToPublicKey;
function _exec(curve, secp256k1Callback, x25519Callback, ed25519Callback) {
    var _curve = curve || config_js_1.ECIES_CONFIG.ellipticCurve; // TODO: remove after 0.5.0
    /* v8 ignore else -- @preserve */
    if (_curve === "secp256k1") {
        return secp256k1Callback(secp256k1_1.secp256k1);
    }
    else if (_curve === "x25519") {
        return x25519Callback(ed25519_1.x25519);
    }
    else if (_curve === "ed25519") {
        return ed25519Callback(ed25519_1.ed25519);
    }
    else {
        throw new Error("Not implemented");
    }
}
var compatEthPublicKey = function (pk) {
    if (pk.length === consts_js_1.ETH_PUBLIC_KEY_SIZE) {
        var fixed = new Uint8Array(1 + pk.length);
        fixed.set([0x04]);
        fixed.set(pk, 1);
        return fixed;
    }
    return pk;
};
var getSharedPointOnEd25519 = function (curve, sk, pk) {
    // Note: scalar is hashed from sk
    var scalar = curve.utils.getExtendedPublicKey(sk).scalar;
    var point = curve.Point.fromBytes(pk).multiply(scalar);
    return point.toBytes();
};
