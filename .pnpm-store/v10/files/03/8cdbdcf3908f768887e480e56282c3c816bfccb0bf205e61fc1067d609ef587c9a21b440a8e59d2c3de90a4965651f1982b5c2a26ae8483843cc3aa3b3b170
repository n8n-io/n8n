import { encode as b64u } from '../../util/base64url.js';
import sign from '../../lib/sign.js';
import isDisjoint from '../../lib/is_disjoint.js';
import { JWSInvalid } from '../../util/errors.js';
import { encoder, decoder, concat } from '../../lib/buffer_utils.js';
import checkKeyType from '../../lib/check_key_type.js';
import validateCrit from '../../lib/validate_crit.js';
import normalizeKey from '../../lib/normalize_key.js';
export class FlattenedSign {
    #payload;
    #protectedHeader;
    #unprotectedHeader;
    constructor(payload) {
        if (!(payload instanceof Uint8Array)) {
            throw new TypeError('payload must be an instance of Uint8Array');
        }
        this.#payload = payload;
    }
    setProtectedHeader(protectedHeader) {
        if (this.#protectedHeader) {
            throw new TypeError('setProtectedHeader can only be called once');
        }
        this.#protectedHeader = protectedHeader;
        return this;
    }
    setUnprotectedHeader(unprotectedHeader) {
        if (this.#unprotectedHeader) {
            throw new TypeError('setUnprotectedHeader can only be called once');
        }
        this.#unprotectedHeader = unprotectedHeader;
        return this;
    }
    async sign(key, options) {
        if (!this.#protectedHeader && !this.#unprotectedHeader) {
            throw new JWSInvalid('either setProtectedHeader or setUnprotectedHeader must be called before #sign()');
        }
        if (!isDisjoint(this.#protectedHeader, this.#unprotectedHeader)) {
            throw new JWSInvalid('JWS Protected and JWS Unprotected Header Parameter names must be disjoint');
        }
        const joseHeader = {
            ...this.#protectedHeader,
            ...this.#unprotectedHeader,
        };
        const extensions = validateCrit(JWSInvalid, new Map([['b64', true]]), options?.crit, this.#protectedHeader, joseHeader);
        let b64 = true;
        if (extensions.has('b64')) {
            b64 = this.#protectedHeader.b64;
            if (typeof b64 !== 'boolean') {
                throw new JWSInvalid('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
            }
        }
        const { alg } = joseHeader;
        if (typeof alg !== 'string' || !alg) {
            throw new JWSInvalid('JWS "alg" (Algorithm) Header Parameter missing or invalid');
        }
        checkKeyType(alg, key, 'sign');
        let payload = this.#payload;
        if (b64) {
            payload = encoder.encode(b64u(payload));
        }
        let protectedHeader;
        if (this.#protectedHeader) {
            protectedHeader = encoder.encode(b64u(JSON.stringify(this.#protectedHeader)));
        }
        else {
            protectedHeader = encoder.encode('');
        }
        const data = concat(protectedHeader, encoder.encode('.'), payload);
        const k = await normalizeKey(key, alg);
        const signature = await sign(alg, k, data);
        const jws = {
            signature: b64u(signature),
            payload: '',
        };
        if (b64) {
            jws.payload = decoder.decode(payload);
        }
        if (this.#unprotectedHeader) {
            jws.header = this.#unprotectedHeader;
        }
        if (this.#protectedHeader) {
            jws.protected = decoder.decode(protectedHeader);
        }
        return jws;
    }
}
