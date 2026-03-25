import * as aeskw from './aeskw.js';
import * as ecdhes from './ecdhes.js';
import * as pbes2kw from './pbes2kw.js';
import * as rsaes from './rsaes.js';
import { encode as b64u } from '../util/base64url.js';
import normalizeKey from './normalize_key.js';
import generateCek, { bitLength as cekLength } from '../lib/cek.js';
import { JOSENotSupported } from '../util/errors.js';
import { exportJWK } from '../key/export.js';
import { wrap as aesGcmKw } from './aesgcmkw.js';
import { assertCryptoKey } from './is_key_like.js';
export default async (alg, enc, key, providedCek, providedParameters = {}) => {
    let encryptedKey;
    let parameters;
    let cek;
    switch (alg) {
        case 'dir': {
            cek = key;
            break;
        }
        case 'ECDH-ES':
        case 'ECDH-ES+A128KW':
        case 'ECDH-ES+A192KW':
        case 'ECDH-ES+A256KW': {
            assertCryptoKey(key);
            if (!ecdhes.allowed(key)) {
                throw new JOSENotSupported('ECDH with the provided key is not allowed or not supported by your javascript runtime');
            }
            const { apu, apv } = providedParameters;
            let ephemeralKey;
            if (providedParameters.epk) {
                ephemeralKey = (await normalizeKey(providedParameters.epk, alg));
            }
            else {
                ephemeralKey = (await crypto.subtle.generateKey(key.algorithm, true, ['deriveBits'])).privateKey;
            }
            const { x, y, crv, kty } = await exportJWK(ephemeralKey);
            const sharedSecret = await ecdhes.deriveKey(key, ephemeralKey, alg === 'ECDH-ES' ? enc : alg, alg === 'ECDH-ES' ? cekLength(enc) : parseInt(alg.slice(-5, -2), 10), apu, apv);
            parameters = { epk: { x, crv, kty } };
            if (kty === 'EC')
                parameters.epk.y = y;
            if (apu)
                parameters.apu = b64u(apu);
            if (apv)
                parameters.apv = b64u(apv);
            if (alg === 'ECDH-ES') {
                cek = sharedSecret;
                break;
            }
            cek = providedCek || generateCek(enc);
            const kwAlg = alg.slice(-6);
            encryptedKey = await aeskw.wrap(kwAlg, sharedSecret, cek);
            break;
        }
        case 'RSA-OAEP':
        case 'RSA-OAEP-256':
        case 'RSA-OAEP-384':
        case 'RSA-OAEP-512': {
            cek = providedCek || generateCek(enc);
            assertCryptoKey(key);
            encryptedKey = await rsaes.encrypt(alg, key, cek);
            break;
        }
        case 'PBES2-HS256+A128KW':
        case 'PBES2-HS384+A192KW':
        case 'PBES2-HS512+A256KW': {
            cek = providedCek || generateCek(enc);
            const { p2c, p2s } = providedParameters;
            ({ encryptedKey, ...parameters } = await pbes2kw.wrap(alg, key, cek, p2c, p2s));
            break;
        }
        case 'A128KW':
        case 'A192KW':
        case 'A256KW': {
            cek = providedCek || generateCek(enc);
            encryptedKey = await aeskw.wrap(alg, key, cek);
            break;
        }
        case 'A128GCMKW':
        case 'A192GCMKW':
        case 'A256GCMKW': {
            cek = providedCek || generateCek(enc);
            const { iv } = providedParameters;
            ({ encryptedKey, ...parameters } = await aesGcmKw(alg, key, cek, iv));
            break;
        }
        default: {
            throw new JOSENotSupported('Invalid or unsupported "alg" (JWE Algorithm) header value');
        }
    }
    return { cek, encryptedKey, parameters };
};
