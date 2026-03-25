import * as b64u from '../util/base64url.js';
import { decoder } from '../lib/buffer_utils.js';
import { JWTInvalid } from '../util/errors.js';
import { validateClaimsSet, JWTClaimsBuilder } from '../lib/jwt_claims_set.js';
export class UnsecuredJWT {
    #jwt;
    constructor(payload = {}) {
        this.#jwt = new JWTClaimsBuilder(payload);
    }
    encode() {
        const header = b64u.encode(JSON.stringify({ alg: 'none' }));
        const payload = b64u.encode(this.#jwt.data());
        return `${header}.${payload}.`;
    }
    setIssuer(issuer) {
        this.#jwt.iss = issuer;
        return this;
    }
    setSubject(subject) {
        this.#jwt.sub = subject;
        return this;
    }
    setAudience(audience) {
        this.#jwt.aud = audience;
        return this;
    }
    setJti(jwtId) {
        this.#jwt.jti = jwtId;
        return this;
    }
    setNotBefore(input) {
        this.#jwt.nbf = input;
        return this;
    }
    setExpirationTime(input) {
        this.#jwt.exp = input;
        return this;
    }
    setIssuedAt(input) {
        this.#jwt.iat = input;
        return this;
    }
    static decode(jwt, options) {
        if (typeof jwt !== 'string') {
            throw new JWTInvalid('Unsecured JWT must be a string');
        }
        const { 0: encodedHeader, 1: encodedPayload, 2: signature, length } = jwt.split('.');
        if (length !== 3 || signature !== '') {
            throw new JWTInvalid('Invalid Unsecured JWT');
        }
        let header;
        try {
            header = JSON.parse(decoder.decode(b64u.decode(encodedHeader)));
            if (header.alg !== 'none')
                throw new Error();
        }
        catch {
            throw new JWTInvalid('Invalid Unsecured JWT');
        }
        const payload = validateClaimsSet(header, b64u.decode(encodedPayload), options);
        return { payload, header };
    }
}
