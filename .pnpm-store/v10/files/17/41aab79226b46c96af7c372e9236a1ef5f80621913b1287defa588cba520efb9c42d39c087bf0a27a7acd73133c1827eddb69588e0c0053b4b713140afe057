import { encode as b64u } from '../../util/base64url.js';
import { unprotected, assertNotSet } from '../../lib/helpers.js';
import { encrypt } from '../../lib/content_encryption.js';
import { encryptKeyManagement } from '../../lib/key_management.js';
import { JOSENotSupported, JWEInvalid } from '../../util/errors.js';
import { isDisjoint } from '../../lib/type_checks.js';
import { concat, encode } from '../../lib/buffer_utils.js';
import { validateCrit } from '../../lib/validate_crit.js';
import { normalizeKey } from '../../lib/normalize_key.js';
import { checkKeyType } from '../../lib/check_key_type.js';
import { compress } from '../../lib/deflate.js';
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
        assertNotSet(this.#keyManagementParameters, 'setKeyManagementParameters');
        this.#keyManagementParameters = parameters;
        return this;
    }
    setProtectedHeader(protectedHeader) {
        assertNotSet(this.#protectedHeader, 'setProtectedHeader');
        this.#protectedHeader = protectedHeader;
        return this;
    }
    setSharedUnprotectedHeader(sharedUnprotectedHeader) {
        assertNotSet(this.#sharedUnprotectedHeader, 'setSharedUnprotectedHeader');
        this.#sharedUnprotectedHeader = sharedUnprotectedHeader;
        return this;
    }
    setUnprotectedHeader(unprotectedHeader) {
        assertNotSet(this.#unprotectedHeader, 'setUnprotectedHeader');
        this.#unprotectedHeader = unprotectedHeader;
        return this;
    }
    setAdditionalAuthenticatedData(aad) {
        this.#aad = aad;
        return this;
    }
    setContentEncryptionKey(cek) {
        assertNotSet(this.#cek, 'setContentEncryptionKey');
        this.#cek = cek;
        return this;
    }
    setInitializationVector(iv) {
        assertNotSet(this.#iv, 'setInitializationVector');
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
        if (joseHeader.zip !== undefined && joseHeader.zip !== 'DEF') {
            throw new JOSENotSupported('Unsupported JWE "zip" (Compression Algorithm) Header Parameter value.');
        }
        if (joseHeader.zip !== undefined && !this.#protectedHeader?.zip) {
            throw new JWEInvalid('JWE "zip" (Compression Algorithm) Header Parameter MUST be in a protected header.');
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
        let protectedHeaderS;
        let protectedHeaderB;
        let aadMember;
        if (this.#protectedHeader) {
            protectedHeaderS = b64u(JSON.stringify(this.#protectedHeader));
            protectedHeaderB = encode(protectedHeaderS);
        }
        else {
            protectedHeaderS = '';
            protectedHeaderB = new Uint8Array();
        }
        if (this.#aad) {
            aadMember = b64u(this.#aad);
            const aadMemberBytes = encode(aadMember);
            additionalData = concat(protectedHeaderB, encode('.'), aadMemberBytes);
        }
        else {
            additionalData = protectedHeaderB;
        }
        let plaintext = this.#plaintext;
        if (joseHeader.zip === 'DEF') {
            plaintext = await compress(plaintext).catch((cause) => {
                throw new JWEInvalid('Failed to compress plaintext', { cause });
            });
        }
        const { ciphertext, tag, iv } = await encrypt(enc, plaintext, cek, this.#iv, additionalData);
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
            jwe.protected = protectedHeaderS;
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
