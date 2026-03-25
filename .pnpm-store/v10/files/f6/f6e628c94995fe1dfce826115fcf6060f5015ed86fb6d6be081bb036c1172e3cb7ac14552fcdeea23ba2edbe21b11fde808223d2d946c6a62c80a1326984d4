"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const errors_js_1 = require("../util/errors.js");
const buffer_utils_js_1 = require("./buffer_utils.js");
const epoch_js_1 = require("./epoch.js");
const secs_js_1 = require("./secs.js");
const is_object_js_1 = require("./is_object.js");
const normalizeTyp = (value) => value.toLowerCase().replace(/^application\//, '');
const checkAudiencePresence = (audPayload, audOption) => {
    if (typeof audPayload === 'string') {
        return audOption.includes(audPayload);
    }
    if (Array.isArray(audPayload)) {
        return audOption.some(Set.prototype.has.bind(new Set(audPayload)));
    }
    return false;
};
exports.default = (protectedHeader, encodedPayload, options = {}) => {
    const { typ } = options;
    if (typ &&
        (typeof protectedHeader.typ !== 'string' ||
            normalizeTyp(protectedHeader.typ) !== normalizeTyp(typ))) {
        throw new errors_js_1.JWTClaimValidationFailed('unexpected "typ" JWT header value', 'typ', 'check_failed');
    }
    let payload;
    try {
        payload = JSON.parse(buffer_utils_js_1.decoder.decode(encodedPayload));
    }
    catch {
    }
    if (!(0, is_object_js_1.default)(payload)) {
        throw new errors_js_1.JWTInvalid('JWT Claims Set must be a top-level JSON object');
    }
    const { requiredClaims = [], issuer, subject, audience, maxTokenAge } = options;
    if (maxTokenAge !== undefined)
        requiredClaims.push('iat');
    if (audience !== undefined)
        requiredClaims.push('aud');
    if (subject !== undefined)
        requiredClaims.push('sub');
    if (issuer !== undefined)
        requiredClaims.push('iss');
    for (const claim of new Set(requiredClaims.reverse())) {
        if (!(claim in payload)) {
            throw new errors_js_1.JWTClaimValidationFailed(`missing required "${claim}" claim`, claim, 'missing');
        }
    }
    if (issuer && !(Array.isArray(issuer) ? issuer : [issuer]).includes(payload.iss)) {
        throw new errors_js_1.JWTClaimValidationFailed('unexpected "iss" claim value', 'iss', 'check_failed');
    }
    if (subject && payload.sub !== subject) {
        throw new errors_js_1.JWTClaimValidationFailed('unexpected "sub" claim value', 'sub', 'check_failed');
    }
    if (audience &&
        !checkAudiencePresence(payload.aud, typeof audience === 'string' ? [audience] : audience)) {
        throw new errors_js_1.JWTClaimValidationFailed('unexpected "aud" claim value', 'aud', 'check_failed');
    }
    let tolerance;
    switch (typeof options.clockTolerance) {
        case 'string':
            tolerance = (0, secs_js_1.default)(options.clockTolerance);
            break;
        case 'number':
            tolerance = options.clockTolerance;
            break;
        case 'undefined':
            tolerance = 0;
            break;
        default:
            throw new TypeError('Invalid clockTolerance option type');
    }
    const { currentDate } = options;
    const now = (0, epoch_js_1.default)(currentDate || new Date());
    if ((payload.iat !== undefined || maxTokenAge) && typeof payload.iat !== 'number') {
        throw new errors_js_1.JWTClaimValidationFailed('"iat" claim must be a number', 'iat', 'invalid');
    }
    if (payload.nbf !== undefined) {
        if (typeof payload.nbf !== 'number') {
            throw new errors_js_1.JWTClaimValidationFailed('"nbf" claim must be a number', 'nbf', 'invalid');
        }
        if (payload.nbf > now + tolerance) {
            throw new errors_js_1.JWTClaimValidationFailed('"nbf" claim timestamp check failed', 'nbf', 'check_failed');
        }
    }
    if (payload.exp !== undefined) {
        if (typeof payload.exp !== 'number') {
            throw new errors_js_1.JWTClaimValidationFailed('"exp" claim must be a number', 'exp', 'invalid');
        }
        if (payload.exp <= now - tolerance) {
            throw new errors_js_1.JWTExpired('"exp" claim timestamp check failed', 'exp', 'check_failed');
        }
    }
    if (maxTokenAge) {
        const age = now - payload.iat;
        const max = typeof maxTokenAge === 'number' ? maxTokenAge : (0, secs_js_1.default)(maxTokenAge);
        if (age - tolerance > max) {
            throw new errors_js_1.JWTExpired('"iat" claim timestamp check failed (too far in the past)', 'iat', 'check_failed');
        }
        if (age < 0 - tolerance) {
            throw new errors_js_1.JWTClaimValidationFailed('"iat" claim timestamp check failed (it should be in the past)', 'iat', 'check_failed');
        }
    }
    return payload;
};
