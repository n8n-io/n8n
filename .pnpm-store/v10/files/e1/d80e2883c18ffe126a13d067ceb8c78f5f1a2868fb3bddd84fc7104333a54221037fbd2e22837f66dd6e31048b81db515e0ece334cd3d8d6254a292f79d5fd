import { encode as b64u } from '../../util/base64url.js';
import { unprotected } from '../../lib/private_symbols.js';
import encrypt from '../../lib/encrypt.js';
import encryptKeyManagement from '../../lib/encrypt_key_management.js';
import { JOSENotSupported, JWEInvalid } from '../../util/errors.js';
import isDisjoint from '../../lib/is_disjoint.js';
import { encoder, decoder, concat } from '../../lib/buffer_utils.js';
import validateCrit from '../../lib/validate_crit.js';
import normalizeKey from '../../lib/normalize_key.js';
import checkKeyType from '../../lib/check_key_type.js';
export class FlattenedEncrypt {
    #plaintext;
    #protectedHeader;
    #sharedUnprotectedHeader;
    #unprotectedHeader;
    #aad;
    #cek;
    #iv;
    #keyManagementParameters;
    constructor(plaintext) {
        if (!(plaintext instanceof Uint8Array)) {
            throw new TypeError('plaintext must be an instance of Uint8Array');
        }
        this.#plaintext = plaintext;
    }
    setKeyManagementParameters(parameters) {
        if (this.#keyManagementParameters) {
            throw new TypeError('setKeyManagementParameters can only be called once');
        }
        this.#keyManagementParameters = parameters;
        return this;
    }
    setProtectedHeader(protectedHeader) {
        if (this.#protectedHeader) {
            throw new TypeError('setProtectedHeader can only be called once');
        }
        this.#protectedHeader = protectedHeader;
        return this;
    }
    setSharedUnprotectedHeader(sharedUnprotectedHeader) {
        if (this.#sharedUnprotectedHeader) {
            throw new TypeError('setSharedUnprotectedHeader can only be called once');
        }
        this.#sharedUnprotectedHeader = sharedUnprotectedHeader;
        return this;
    }
    setUnprotectedHeader(unprotectedHeader) {
        if (this.#unprotectedHeader) {
            throw new TypeError('setUnprotectedHeader can only be called once');
        }
        this.#unprotectedHeader = unprotectedHeader;
        return this;
    }
    setAdditionalAuthenticatedData(aad) {
        this.#aad = aad;
        return this;
    }
    setContentEncryptionKey(cek) {
        if (this.#cek) {
            throw new TypeError('setContentEncryptionKey can only be called once');
        }
        this.#cek = cek;
        return this;
    }
    setInitializationVector(iv) {
        if (this.#iv) {
            throw new TypeError('setInitializationVector can only be called once');
        }
        this.#iv = iv;
        return this;
    }
    async encrypt(key, options) {
        if (!this.#protectedHeader && !this.#unprotectedHeader && !this.#sharedUnprotectedHeader) {
            throw new JWEInvalid('either setProtectedHeader, setUnprotectedHeader, or sharedUnprotectedHeader must be called before #encrypt()');
        }
        if (!isDisjoint(this.#protectedHeader, this.#unprotectedHeader, this.#sharedUnprotectedHeader)) {
            throw new JWEInvalid('JWE Protected, JWE Shared Unprotected and JWE Per-Recipient Header Parameter names must be disjoint');
        }
        const joseHeader = {
            ...this.#protectedHeader,
            ...this.#unprotectedHeader,
            ...this.#sharedUnprotectedHeader,
        };
        validateCrit(JWEInvalid, new Map(), options?.crit, this.#protectedHeader, joseHeader);
        if (joseHeader.zip !== undefined) {
            throw new JOSENotSupported('JWE "zip" (Compression Algorithm) Header Parameter is not supported.');
        }
        const { alg, enc } = joseHeader;
        if (typeof alg !== 'string' || !alg) {
            throw new JWEInvalid('JWE "alg" (Algorithm) Header Parameter missing or invalid');
        }
        if (typeof enc !== 'string' || !enc) {
            throw new JWEInvalid('JWE "enc" (Encryption Algorithm) Header Parameter missing or invalid');
        }
        let encryptedKey;
        if (this.#cek && (alg === 'dir' || alg === 'ECDH-ES')) {
            throw new TypeError(`setContentEncryptionKey cannot be called with JWE "alg" (Algorithm) Header ${alg}`);
        }
        checkKeyType(alg === 'dir' ? enc : alg, key, 'encrypt');
        let cek;
        {
            let parameters;
            const k = await normalizeKey(key, alg);
            ({ cek, encryptedKey, parameters } = await encryptKeyManagement(alg, enc, k, this.#cek, this.#keyManagementParameters));
            if (parameters) {
                if (options && unprotected in options) {
                    if (!this.#unprotectedHeader) {
                        this.setUnprotectedHeader(parameters);
                    }
                    else {
                        this.#unprotectedHeader = { ...this.#unprotectedHeader, ...parameters };
                    }
                }
                else if (!this.#protectedHeader) {
                    this.setProtectedHeader(parameters);
                }
                else {
                    this.#protectedHeader = { ...this.#protectedHeader, ...parameters };
                }
            }
        }
        let additionalData;
        let protectedHeader;
        let aadMember;
        if (this.#protectedHeader) {
            protectedHeader = encoder.encode(b64u(JSON.stringify(this.#protectedHeader)));
        }
        else {
            protectedHeader = encoder.encode('');
        }
        if (this.#aad) {
            aadMember = b64u(this.#aad);
            additionalData = concat(protectedHeader, encoder.encode('.'), encoder.encode(aadMember));
        }
        else {
            additionalData = protectedHeader;
        }
        const { ciphertext, tag, iv } = await encrypt(enc, this.#plaintext, cek, this.#iv, additionalData);
        const jwe = {
            ciphertext: b64u(ciphertext),
        };
        if (iv) {
            jwe.iv = b64u(iv);
        }
        if (tag) {
            jwe.tag = b64u(tag);
        }
        if (encryptedKey) {
            jwe.encrypted_key = b64u(encryptedKey);
        }
        if (aadMember) {
            jwe.aad = aadMember;
        }
        if (this.#protectedHeader) {
            jwe.protected = decoder.decode(protectedHeader);
        }
        if (this.#sharedUnprotectedHeader) {
            jwe.unprotected = this.#sharedUnprotectedHeader;
        }
        if (this.#unprotectedHeader) {
            jwe.header = this.#unprotectedHeader;
        }
        return jwe;
    }
}
