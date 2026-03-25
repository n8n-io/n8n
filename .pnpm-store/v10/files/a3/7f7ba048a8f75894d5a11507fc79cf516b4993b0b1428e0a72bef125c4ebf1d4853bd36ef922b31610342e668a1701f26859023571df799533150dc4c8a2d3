"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decryptSymmetric128BitHexKeyUTF8 = exports.encryptSymmetric128BitHexKeyUTF8 = exports.decryptSymmetric = exports.encryptSymmetric = exports.createSymmetricKey = exports.decryptAsymmetric = exports.encryptAsymmetric = void 0;
var crypto = __importStar(require("crypto"));
var nacl = __importStar(require("tweetnacl"));
var util = __importStar(require("tweetnacl-util"));
var variables_1 = require("../variables");
/**
 * Return assymmetrically encrypted [plaintext] using [publicKey] where
 * [publicKey] likely belongs to the recipient.
 * @param {Object} obj
 * @param {String} obj.plaintext - plaintext to encrypt
 * @param {String} obj.publicKey - public key of the recipient
 * @param {String} obj.privateKey - private key of the sender (current user)
 * @returns {Object} obj
 * @returns {String} ciphertext - base64-encoded ciphertext
 * @returns {String} nonce - base64-encoded nonce
 */
var encryptAsymmetric = function (_a) {
    var plaintext = _a.plaintext, publicKey = _a.publicKey, privateKey = _a.privateKey;
    var nonce = nacl.randomBytes(24);
    var ciphertext = nacl.box(util.decodeUTF8(plaintext), nonce, util.decodeBase64(publicKey), util.decodeBase64(privateKey));
    return {
        ciphertext: util.encodeBase64(ciphertext),
        nonce: util.encodeBase64(nonce)
    };
};
exports.encryptAsymmetric = encryptAsymmetric;
/**
 * Return assymmetrically decrypted [ciphertext] using [privateKey] where
 * [privateKey] likely belongs to the recipient.
 * @param {Object} obj
 * @param {String} obj.ciphertext - ciphertext to decrypt
 * @param {String} obj.nonce - nonce
 * @param {String} obj.publicKey - public key of the sender
 * @param {String} obj.privateKey - private key of the receiver (current user)
 * @param {String} plaintext - UTF8 plaintext
 */
var decryptAsymmetric = function (_a) {
    var ciphertext = _a.ciphertext, nonce = _a.nonce, publicKey = _a.publicKey, privateKey = _a.privateKey;
    return nacl.box.open(util.decodeBase64(ciphertext), util.decodeBase64(nonce), util.decodeBase64(publicKey), util.decodeBase64(privateKey));
};
exports.decryptAsymmetric = decryptAsymmetric;
/**
 * Return new base64-encoded, 256-bit symmetric key
 * @returns {String} key - new symmetric key
 */
var createSymmetricKey = function () {
    return crypto.randomBytes(variables_1.SYMMETRIC_KEY_BYTES_SIZE).toString('base64');
};
exports.createSymmetricKey = createSymmetricKey;
/**
 * Return symmetrically encrypted [plaintext] using [key].
 * @param {Object} obj
 * @param {String} obj.plaintext - (utf8) plaintext to encrypt
 * @param {String} obj.key - (base64) 256-bit key
 * @returns {Object} obj
 * @returns {String} obj.ciphertext (base64) ciphertext
 * @returns {String} obj.iv (base64) iv
 * @returns {String} obj.tag (base64) tag
 */
var encryptSymmetric = function (_a) {
    var plaintext = _a.plaintext, key = _a.key;
    var iv = crypto.randomBytes(variables_1.IV_BYTES_SIZE);
    var secretKey = crypto.createSecretKey(key, 'base64');
    var cipher = crypto.createCipheriv(variables_1.ALGORITHM_AES_256_GCM, secretKey, iv);
    var ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');
    return {
        ciphertext: ciphertext,
        iv: iv.toString('base64'),
        tag: cipher.getAuthTag().toString('base64')
    };
};
exports.encryptSymmetric = encryptSymmetric;
/**
 * Return symmetrically decrypted [ciphertext] using [iv], [tag],
 * and [key].
 * @param {Object} obj
 * @param {String} obj.ciphertext - ciphertext to decrypt
 * @param {String} obj.iv - (base64) 256-bit iv
 * @param {String} obj.tag - (base64) tag
 * @param {String} obj.key - (base64) 256-bit key
 * @returns {String} cleartext - (utf8) the deciphered ciphertext
 */
var decryptSymmetric = function (_a) {
    var ciphertext = _a.ciphertext, iv = _a.iv, tag = _a.tag, key = _a.key;
    var secretKey = crypto.createSecretKey(key, 'base64');
    var decipher = crypto.createDecipheriv(variables_1.ALGORITHM_AES_256_GCM, secretKey, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    var cleartext = decipher.update(ciphertext, 'base64', 'utf8');
    cleartext += decipher.final('utf8');
    return cleartext;
};
exports.decryptSymmetric = decryptSymmetric;
/**
 * Return symmetrically encrypted [plaintext] using [key].
 *
 * NOTE: THIS FUNCTION SHOULD NOT BE USED FOR ALL FUTURE
 * ENCRYPTION OPERATIONS UNLESS IT TOUCHES OLD FUNCTIONALITY
 * THAT USES IT.
 *
 * @param {Object} obj
 * @param {String} obj.plaintext - (utf8) plaintext to encrypt
 * @param {String} obj.key - (hex) 128-bit key
 * @returns {Object} obj
 * @returns {String} obj.ciphertext (base64) ciphertext
 * @returns {String} obj.iv (base64) iv
 * @returns {String} obj.tag (base64) tag
 */
var encryptSymmetric128BitHexKeyUTF8 = function (_a) {
    var plaintext = _a.plaintext, key = _a.key;
    var ALGORITHM = 'aes-256-gcm';
    var BLOCK_SIZE_BYTES = 16;
    var iv = crypto.randomBytes(BLOCK_SIZE_BYTES);
    var cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    var ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');
    return {
        ciphertext: ciphertext,
        iv: iv.toString('base64'),
        tag: cipher.getAuthTag().toString('base64')
    };
};
exports.encryptSymmetric128BitHexKeyUTF8 = encryptSymmetric128BitHexKeyUTF8;
/**
 * Return symmetrically decrypted [ciphertext] using [iv], [tag],
 * and [key].
 *
 * NOTE: THIS FUNCTION SHOULD NOT BE USED FOR ALL FUTURE
 * DECRYPTION OPERATIONS UNLESS IT TOUCHES OLD FUNCTIONALITY
 * THAT USES IT. USE decryptSymmetric() instead
*/
var decryptSymmetric128BitHexKeyUTF8 = function (_a) {
    var ciphertext = _a.ciphertext, iv = _a.iv, tag = _a.tag, key = _a.key;
    var ALGORITHM = 'aes-256-gcm';
    var decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    var cleartext = decipher.update(ciphertext, 'base64', 'utf8');
    cleartext += decipher.final('utf8');
    return cleartext;
};
exports.decryptSymmetric128BitHexKeyUTF8 = decryptSymmetric128BitHexKeyUTF8;
