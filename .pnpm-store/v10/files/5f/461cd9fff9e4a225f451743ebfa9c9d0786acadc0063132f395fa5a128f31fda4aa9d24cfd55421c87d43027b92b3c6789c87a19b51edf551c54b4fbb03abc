import { invalidKeyInput } from './invalid_key_input.js';
import { encode as b64u } from '../util/base64url.js';
import { isCryptoKey, isKeyObject } from './is_key_like.js';
export async function keyToJWK(key) {
    if (isKeyObject(key)) {
        if (key.type === 'secret') {
            key = key.export();
        }
        else {
            return key.export({ format: 'jwk' });
        }
    }
    if (key instanceof Uint8Array) {
        return {
            kty: 'oct',
            k: b64u(key),
        };
    }
    if (!isCryptoKey(key)) {
        throw new TypeError(invalidKeyInput(key, 'CryptoKey', 'KeyObject', 'Uint8Array'));
    }
    if (!key.extractable) {
        throw new TypeError('non-extractable CryptoKey cannot be exported as a JWK');
    }
    const { ext, key_ops, alg, use, ...jwk } = await crypto.subtle.exportKey('jwk', key);
    if (jwk.kty === 'AKP') {
        ;
        jwk.alg = alg;
    }
    return jwk;
}
