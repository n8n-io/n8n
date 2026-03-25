"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProduceJWT = void 0;
const epoch_js_1 = require("../lib/epoch.js");
const is_object_js_1 = require("../lib/is_object.js");
const secs_js_1 = require("../lib/secs.js");
class ProduceJWT {
    constructor(payload) {
        if (!(0, is_object_js_1.default)(payload)) {
            throw new TypeError('JWT Claims Set MUST be an object');
        }
        this._payload = payload;
    }
    setIssuer(issuer) {
        this._payload = { ...this._payload, iss: issuer };
        return this;
    }
    setSubject(subject) {
        this._payload = { ...this._payload, sub: subject };
        return this;
    }
    setAudience(audience) {
        this._payload = { ...this._payload, aud: audience };
        return this;
    }
    setJti(jwtId) {
        this._payload = { ...this._payload, jti: jwtId };
        return this;
    }
    setNotBefore(input) {
        if (typeof input === 'number') {
            this._payload = { ...this._payload, nbf: input };
        }
        else {
            this._payload = { ...this._payload, nbf: (0, epoch_js_1.default)(new Date()) + (0, secs_js_1.default)(input) };
        }
        return this;
    }
    setExpirationTime(input) {
        if (typeof input === 'number') {
            this._payload = { ...this._payload, exp: input };
        }
        else {
            this._payload = { ...this._payload, exp: (0, epoch_js_1.default)(new Date()) + (0, secs_js_1.default)(input) };
        }
        return this;
    }
    setIssuedAt(input) {
        if (typeof input === 'undefined') {
            this._payload = { ...this._payload, iat: (0, epoch_js_1.default)(new Date()) };
        }
        else {
            this._payload = { ...this._payload, iat: input };
        }
        return this;
    }
}
exports.ProduceJWT = ProduceJWT;
