import * as aeskw from './aeskw.js';
import * as ecdhes from './ecdhes.js';
import * as pbes2kw from './pbes2kw.js';
import * as rsaes from './rsaes.js';
import { encode as b64u } from '../util/base64url.js';
import { normalizeKey } from './normalize_key.js';
import { JOSENotSupported, JWEInvalid } from '../util/errors.js';
import { decodeBase64url } from './helpers.js';
import { generateCek, cekLength } from './content_encryption.js';
import { importJWK } from '../key/import.js';
import { exportJWK } from '../key/export.js';
import { isObject } from './type_checks.js';
import { wrap as aesGcmKwWrap, unwrap as aesGcmKwUnwrap } from './aesgcmkw.js';
import { assertCryptoKey } from './is_key_like.js';
const unsupportedAlgHeader = 'Invalid or unsupported "alg" (JWE Algorithm) header value';
function assertEncryptedKey(encryptedKey) {
    if (encryptedKey === undefined)
        throw new JWEInvalid('JWE Encrypted Key missing');
}
export async function decryptKeyManagement(alg, key, encryptedKey, joseHeader, options) {
    switch (alg) {
        case 'dir': {
            if (encryptedKey !== undefined)
                throw new JWEInvalid('Encountered unexpected JWE Encrypted Key');
            return key;
        }
        case 'ECDH-ES':
            if (encryptedKey !== undefined)
                throw new JWEInvalid('Encountered unexpected JWE Encrypted Key');
        case 'ECDH-ES+A128KW':
        case 'ECDH-ES+A192KW':
        case 'ECDH-ES+A256KW': {
            if (!isObject(joseHeader.epk))
                throw new JWEInvalid(`JOSE Header "epk" (Ephemeral Public Key) missing or invalid`);
            assertCryptoKey(key);
            if (!ecdhes.allowed(key))
                throw new JOSENotSupported('ECDH with the provided key is not allowed or not supported by your javascript runtime');
            const epk = await importJWK(joseHeader.epk, alg);
            assertCryptoKey(epk);
            let partyUInfo;
            let partyVInfo;
            if (joseHeader.apu !== undefined) {
                if (typeof joseHeader.apu !== 'string')
                    throw new JWEInvalid(`JOSE Header "apu" (Agreement PartyUInfo) invalid`);
                partyUInfo = decodeBase64url(joseHeader.apu, 'apu', JWEInvalid);
            }
            if (joseHeader.apv !== undefined) {
                if (typeof joseHeader.apv !== 'string')
                    throw new JWEInvalid(`JOSE Header "apv" (Agreement PartyVInfo) invalid`);
                partyVInfo = decodeBase64url(joseHeader.apv, 'apv', JWEInvalid);
            }
            const sharedSecret = await ecdhes.deriveKey(epk, key, alg === 'ECDH-ES' ? joseHeader.enc : alg, alg === 'ECDH-ES' ? cekLength(joseHeader.enc) : parseInt(alg.slice(-5, -2), 10), partyUInfo, partyVInfo);
            if (alg === 'ECDH-ES')
                return sharedSecret;
            assertEncryptedKey(encryptedKey);
            return aeskw.unwrap(alg.slice(-6), sharedSecret, encryptedKey);
        }
        case 'RSA-OAEP':
        case 'RSA-OAEP-256':
        case 'RSA-OAEP-384':
        case 'RSA-OAEP-512': {
            assertEncryptedKey(encryptedKey);
            assertCryptoKey(key);
            return rsaes.decrypt(alg, key, encryptedKey);
        }
        case 'PBES2-HS256+A128KW':
        case 'PBES2-HS384+A192KW':
        case 'PBES2-HS512+A256KW': {
            assertEncryptedKey(encryptedKey);
            if (typeof joseHeader.p2c !== 'number')
                throw new JWEInvalid(`JOSE Header "p2c" (PBES2 Count) missing or invalid`);
            const p2cLimit = options?.maxPBES2Count || 10_000;
            if (joseHeader.p2c > p2cLimit)
                throw new JWEInvalid(`JOSE Header "p2c" (PBES2 Count) out is of acceptable bounds`);
            if (typeof joseHeader.p2s !== 'string')
                throw new JWEInvalid(`JOSE Header "p2s" (PBES2 Salt) missing or invalid`);
            let p2s;
            p2s = decodeBase64url(joseHeader.p2s, 'p2s', JWEInvalid);
            return pbes2kw.unwrap(alg, key, encryptedKey, joseHeader.p2c, p2s);
        }
        case 'A128KW':
        case 'A192KW':
        case 'A256KW': {
            assertEncryptedKey(encryptedKey);
            return aeskw.unwrap(alg, key, encryptedKey);
        }
        case 'A128GCMKW':
        case 'A192GCMKW':
        case 'A256GCMKW': {
            assertEncryptedKey(encryptedKey);
            if (typeof joseHeader.iv !== 'string')
                throw new JWEInvalid(`JOSE Header "iv" (Initialization Vector) missing or invalid`);
            if (typeof joseHeader.tag !== 'string')
                throw new JWEInvalid(`JOSE Header "tag" (Authentication Tag) missing or invalid`);
            let iv;
            iv = decodeBase64url(joseHeader.iv, 'iv', JWEInvalid);
            let tag;
            tag = decodeBase64url(joseHeader.tag, 'tag', JWEInvalid);
            return aesGcmKwUnwrap(alg, key, encryptedKey, iv, tag);
        }
        default: {
            throw new JOSENotSupported(unsupportedAlgHeader);
        }
    }
}
export async function encryptKeyManagement(alg, enc, key, providedCek, providedParameters = {}) {
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
            ({ encryptedKey, ...parameters } = await aesGcmKwWrap(alg, key, cek, iv));
            break;
        }
        default: {
            throw new JOSENotSupported(unsupportedAlgHeader);
        }
    }
    return { cek, encryptedKey, parameters };
}
