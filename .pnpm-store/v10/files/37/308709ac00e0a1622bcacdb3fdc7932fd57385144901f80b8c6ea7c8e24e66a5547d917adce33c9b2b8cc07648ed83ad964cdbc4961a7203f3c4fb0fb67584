import { digest } from '../lib/digest.js';
import { encode as b64u } from '../util/base64url.js';
import { JOSENotSupported, JWKInvalid } from '../util/errors.js';
import { encode } from '../lib/buffer_utils.js';
import { isKeyLike } from '../lib/is_key_like.js';
import { isJWK } from '../lib/is_jwk.js';
import { exportJWK } from '../key/export.js';
import { invalidKeyInput } from '../lib/invalid_key_input.js';
const check = (value, description) => {
    if (typeof value !== 'string' || !value) {
        throw new JWKInvalid(`${description} missing or invalid`);
    }
};
export async function calculateJwkThumbprint(key, digestAlgorithm) {
    let jwk;
    if (isJWK(key)) {
        jwk = key;
    }
    else if (isKeyLike(key)) {
        jwk = await exportJWK(key);
    }
    else {
        throw new TypeError(invalidKeyInput(key, 'CryptoKey', 'KeyObject', 'JSON Web Key'));
    }
    digestAlgorithm ??= 'sha256';
    if (digestAlgorithm !== 'sha256' &&
        digestAlgorithm !== 'sha384' &&
        digestAlgorithm !== 'sha512') {
        throw new TypeError('digestAlgorithm must one of "sha256", "sha384", or "sha512"');
    }
    let components;
    switch (jwk.kty) {
        case 'AKP':
            check(jwk.alg, '"alg" (Algorithm) Parameter');
            check(jwk.pub, '"pub" (Public key) Parameter');
            components = { alg: jwk.alg, kty: jwk.kty, pub: jwk.pub };
            break;
        case 'EC':
            check(jwk.crv, '"crv" (Curve) Parameter');
            check(jwk.x, '"x" (X Coordinate) Parameter');
            check(jwk.y, '"y" (Y Coordinate) Parameter');
            components = { crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y };
            break;
        case 'OKP':
            check(jwk.crv, '"crv" (Subtype of Key Pair) Parameter');
            check(jwk.x, '"x" (Public Key) Parameter');
            components = { crv: jwk.crv, kty: jwk.kty, x: jwk.x };
            break;
        case 'RSA':
            check(jwk.e, '"e" (Exponent) Parameter');
            check(jwk.n, '"n" (Modulus) Parameter');
            components = { e: jwk.e, kty: jwk.kty, n: jwk.n };
            break;
        case 'oct':
            check(jwk.k, '"k" (Key Value) Parameter');
            components = { k: jwk.k, kty: jwk.kty };
            break;
        default:
            throw new JOSENotSupported('"kty" (Key Type) Parameter missing or unsupported');
    }
    const data = encode(JSON.stringify(components));
    return b64u(await digest(digestAlgorithm, data));
}
export async function calculateJwkThumbprintUri(key, digestAlgorithm) {
    digestAlgorithm ??= 'sha256';
    const thumbprint = await calculateJwkThumbprint(key, digestAlgorithm);
    return `urn:ietf:params:oauth:jwk-thumbprint:sha-${digestAlgorithm.slice(-3)}:${thumbprint}`;
}
