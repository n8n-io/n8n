"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flattenedVerify = void 0;
const base64url_js_1 = require("../../runtime/base64url.js");
const verify_js_1 = require("../../runtime/verify.js");
const errors_js_1 = require("../../util/errors.js");
const buffer_utils_js_1 = require("../../lib/buffer_utils.js");
const is_disjoint_js_1 = require("../../lib/is_disjoint.js");
const is_object_js_1 = require("../../lib/is_object.js");
const check_key_type_js_1 = require("../../lib/check_key_type.js");
const validate_crit_js_1 = require("../../lib/validate_crit.js");
const validate_algorithms_js_1 = require("../../lib/validate_algorithms.js");
async function flattenedVerify(jws, key, options) {
    var _a;
    if (!(0, is_object_js_1.default)(jws)) {
        throw new errors_js_1.JWSInvalid('Flattened JWS must be an object');
    }
    if (jws.protected === undefined && jws.header === undefined) {
        throw new errors_js_1.JWSInvalid('Flattened JWS must have either of the "protected" or "header" members');
    }
    if (jws.protected !== undefined && typeof jws.protected !== 'string') {
        throw new errors_js_1.JWSInvalid('JWS Protected Header incorrect type');
    }
    if (jws.payload === undefined) {
        throw new errors_js_1.JWSInvalid('JWS Payload missing');
    }
    if (typeof jws.signature !== 'string') {
        throw new errors_js_1.JWSInvalid('JWS Signature missing or incorrect type');
    }
    if (jws.header !== undefined && !(0, is_object_js_1.default)(jws.header)) {
        throw new errors_js_1.JWSInvalid('JWS Unprotected Header incorrect type');
    }
    let parsedProt = {};
    if (jws.protected) {
        try {
            const protectedHeader = (0, base64url_js_1.decode)(jws.protected);
            parsedProt = JSON.parse(buffer_utils_js_1.decoder.decode(protectedHeader));
        }
        catch {
            throw new errors_js_1.JWSInvalid('JWS Protected Header is invalid');
        }
    }
    if (!(0, is_disjoint_js_1.default)(parsedProt, jws.header)) {
        throw new errors_js_1.JWSInvalid('JWS Protected and JWS Unprotected Header Parameter names must be disjoint');
    }
    const joseHeader = {
        ...parsedProt,
        ...jws.header,
    };
    const extensions = (0, validate_crit_js_1.default)(errors_js_1.JWSInvalid, new Map([['b64', true]]), options === null || options === void 0 ? void 0 : options.crit, parsedProt, joseHeader);
    let b64 = true;
    if (extensions.has('b64')) {
        b64 = parsedProt.b64;
        if (typeof b64 !== 'boolean') {
            throw new errors_js_1.JWSInvalid('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
        }
    }
    const { alg } = joseHeader;
    if (typeof alg !== 'string' || !alg) {
        throw new errors_js_1.JWSInvalid('JWS "alg" (Algorithm) Header Parameter missing or invalid');
    }
    const algorithms = options && (0, validate_algorithms_js_1.default)('algorithms', options.algorithms);
    if (algorithms && !algorithms.has(alg)) {
        throw new errors_js_1.JOSEAlgNotAllowed('"alg" (Algorithm) Header Parameter not allowed');
    }
    if (b64) {
        if (typeof jws.payload !== 'string') {
            throw new errors_js_1.JWSInvalid('JWS Payload must be a string');
        }
    }
    else if (typeof jws.payload !== 'string' && !(jws.payload instanceof Uint8Array)) {
        throw new errors_js_1.JWSInvalid('JWS Payload must be a string or an Uint8Array instance');
    }
    let resolvedKey = false;
    if (typeof key === 'function') {
        key = await key(parsedProt, jws);
        resolvedKey = true;
    }
    (0, check_key_type_js_1.default)(alg, key, 'verify');
    const data = (0, buffer_utils_js_1.concat)(buffer_utils_js_1.encoder.encode((_a = jws.protected) !== null && _a !== void 0 ? _a : ''), buffer_utils_js_1.encoder.encode('.'), typeof jws.payload === 'string' ? buffer_utils_js_1.encoder.encode(jws.payload) : jws.payload);
    let signature;
    try {
        signature = (0, base64url_js_1.decode)(jws.signature);
    }
    catch {
        throw new errors_js_1.JWSInvalid('Failed to base64url decode the signature');
    }
    const verified = await (0, verify_js_1.default)(alg, key, signature, data);
    if (!verified) {
        throw new errors_js_1.JWSSignatureVerificationFailed();
    }
    let payload;
    if (b64) {
        try {
            payload = (0, base64url_js_1.decode)(jws.payload);
        }
        catch {
            throw new errors_js_1.JWSInvalid('Failed to base64url decode the payload');
        }
    }
    else if (typeof jws.payload === 'string') {
        payload = buffer_utils_js_1.encoder.encode(jws.payload);
    }
    else {
        payload = jws.payload;
    }
    const result = { payload };
    if (jws.protected !== undefined) {
        result.protectedHeader = parsedProt;
    }
    if (jws.header !== undefined) {
        result.unprotectedHeader = jws.header;
    }
    if (resolvedKey) {
        return { ...result, key };
    }
    return result;
}
exports.flattenedVerify = flattenedVerify;
