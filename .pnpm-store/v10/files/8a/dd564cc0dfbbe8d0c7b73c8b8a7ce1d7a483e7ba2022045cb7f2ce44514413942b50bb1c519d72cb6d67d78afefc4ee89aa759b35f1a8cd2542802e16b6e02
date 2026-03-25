import { importJWK } from '../key/import.js';
import { JWKSInvalid, JOSENotSupported, JWKSNoMatchingKey, JWKSMultipleMatchingKeys, } from '../util/errors.js';
import isObject from '../lib/is_object.js';
function getKtyFromAlg(alg) {
    switch (typeof alg === 'string' && alg.slice(0, 2)) {
        case 'RS':
        case 'PS':
            return 'RSA';
        case 'ES':
            return 'EC';
        case 'Ed':
            return 'OKP';
        default:
            throw new JOSENotSupported('Unsupported "alg" value for a JSON Web Key Set');
    }
}
export function isJWKSLike(jwks) {
    return (jwks &&
        typeof jwks === 'object' &&
        Array.isArray(jwks.keys) &&
        jwks.keys.every(isJWKLike));
}
function isJWKLike(key) {
    return isObject(key);
}
function clone(obj) {
    if (typeof structuredClone === 'function') {
        return structuredClone(obj);
    }
    return JSON.parse(JSON.stringify(obj));
}
export class LocalJWKSet {
    constructor(jwks) {
        this._cached = new WeakMap();
        if (!isJWKSLike(jwks)) {
            throw new JWKSInvalid('JSON Web Key Set malformed');
        }
        this._jwks = clone(jwks);
    }
    async getKey(protectedHeader, token) {
        const { alg, kid } = { ...protectedHeader, ...token === null || token === void 0 ? void 0 : token.header };
        const kty = getKtyFromAlg(alg);
        const candidates = this._jwks.keys.filter((jwk) => {
            let candidate = kty === jwk.kty;
            if (candidate && typeof kid === 'string') {
                candidate = kid === jwk.kid;
            }
            if (candidate && typeof jwk.alg === 'string') {
                candidate = alg === jwk.alg;
            }
            if (candidate && typeof jwk.use === 'string') {
                candidate = jwk.use === 'sig';
            }
            if (candidate && Array.isArray(jwk.key_ops)) {
                candidate = jwk.key_ops.includes('verify');
            }
            if (candidate && alg === 'EdDSA') {
                candidate = jwk.crv === 'Ed25519' || jwk.crv === 'Ed448';
            }
            if (candidate) {
                switch (alg) {
                    case 'ES256':
                        candidate = jwk.crv === 'P-256';
                        break;
                    case 'ES256K':
                        candidate = jwk.crv === 'secp256k1';
                        break;
                    case 'ES384':
                        candidate = jwk.crv === 'P-384';
                        break;
                    case 'ES512':
                        candidate = jwk.crv === 'P-521';
                        break;
                }
            }
            return candidate;
        });
        const { 0: jwk, length } = candidates;
        if (length === 0) {
            throw new JWKSNoMatchingKey();
        }
        else if (length !== 1) {
            const error = new JWKSMultipleMatchingKeys();
            const { _cached } = this;
            error[Symbol.asyncIterator] = async function* () {
                for (const jwk of candidates) {
                    try {
                        yield await importWithAlgCache(_cached, jwk, alg);
                    }
                    catch {
                        continue;
                    }
                }
            };
            throw error;
        }
        return importWithAlgCache(this._cached, jwk, alg);
    }
}
async function importWithAlgCache(cache, jwk, alg) {
    const cached = cache.get(jwk) || cache.set(jwk, {}).get(jwk);
    if (cached[alg] === undefined) {
        const key = await importJWK({ ...jwk, ext: true }, alg);
        if (key instanceof Uint8Array || key.type !== 'public') {
            throw new JWKSInvalid('JSON Web Key Set members must be public keys');
        }
        cached[alg] = key;
    }
    return cached[alg];
}
export function createLocalJWKSet(jwks) {
    const set = new LocalJWKSet(jwks);
    return async function (protectedHeader, token) {
        return set.getKey(protectedHeader, token);
    };
}
