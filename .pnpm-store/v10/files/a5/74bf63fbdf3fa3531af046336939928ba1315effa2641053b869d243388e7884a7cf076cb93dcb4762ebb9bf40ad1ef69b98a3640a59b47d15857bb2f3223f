import { FlattenedEncrypt } from '../flattened/encrypt.js';
import { unprotected } from '../../lib/private_symbols.js';
import { JOSENotSupported, JWEInvalid } from '../../util/errors.js';
import generateCek from '../../lib/cek.js';
import isDisjoint from '../../lib/is_disjoint.js';
import encryptKeyManagement from '../../lib/encrypt_key_management.js';
import { encode as b64u } from '../../util/base64url.js';
import validateCrit from '../../lib/validate_crit.js';
import normalizeKey from '../../lib/normalize_key.js';
import checkKeyType from '../../lib/check_key_type.js';
class IndividualRecipient {
    #parent;
    unprotectedHeader;
    key;
    options;
    constructor(enc, key, options) {
        this.#parent = enc;
        this.key = key;
        this.options = options;
    }
    setUnprotectedHeader(unprotectedHeader) {
        if (this.unprotectedHeader) {
            throw new TypeError('setUnprotectedHeader can only be called once');
        }
        this.unprotectedHeader = unprotectedHeader;
        return this;
    }
    addRecipient(...args) {
        return this.#parent.addRecipient(...args);
    }
    encrypt(...args) {
        return this.#parent.encrypt(...args);
    }
    done() {
        return this.#parent;
    }
}
export class GeneralEncrypt {
    #plaintext;
    #recipients = [];
    #protectedHeader;
    #unprotectedHeader;
    #aad;
    constructor(plaintext) {
        this.#plaintext = plaintext;
    }
    addRecipient(key, options) {
        const recipient = new IndividualRecipient(this, key, { crit: options?.crit });
        this.#recipients.push(recipient);
        return recipient;
    }
    setProtectedHeader(protectedHeader) {
        if (this.#protectedHeader) {
            throw new TypeError('setProtectedHeader can only be called once');
        }
        this.#protectedHeader = protectedHeader;
        return this;
    }
    setSharedUnprotectedHeader(sharedUnprotectedHeader) {
        if (this.#unprotectedHeader) {
            throw new TypeError('setSharedUnprotectedHeader can only be called once');
        }
        this.#unprotectedHeader = sharedUnprotectedHeader;
        return this;
    }
    setAdditionalAuthenticatedData(aad) {
        this.#aad = aad;
        return this;
    }
    async encrypt() {
        if (!this.#recipients.length) {
            throw new JWEInvalid('at least one recipient must be added');
        }
        if (this.#recipients.length === 1) {
            const [recipient] = this.#recipients;
            const flattened = await new FlattenedEncrypt(this.#plaintext)
                .setAdditionalAuthenticatedData(this.#aad)
                .setProtectedHeader(this.#protectedHeader)
                .setSharedUnprotectedHeader(this.#unprotectedHeader)
                .setUnprotectedHeader(recipient.unprotectedHeader)
                .encrypt(recipient.key, { ...recipient.options });
            const jwe = {
                ciphertext: flattened.ciphertext,
                iv: flattened.iv,
                recipients: [{}],
                tag: flattened.tag,
            };
            if (flattened.aad)
                jwe.aad = flattened.aad;
            if (flattened.protected)
                jwe.protected = flattened.protected;
            if (flattened.unprotected)
                jwe.unprotected = flattened.unprotected;
            if (flattened.encrypted_key)
                jwe.recipients[0].encrypted_key = flattened.encrypted_key;
            if (flattened.header)
                jwe.recipients[0].header = flattened.header;
            return jwe;
        }
        let enc;
        for (let i = 0; i < this.#recipients.length; i++) {
            const recipient = this.#recipients[i];
            if (!isDisjoint(this.#protectedHeader, this.#unprotectedHeader, recipient.unprotectedHeader)) {
                throw new JWEInvalid('JWE Protected, JWE Shared Unprotected and JWE Per-Recipient Header Parameter names must be disjoint');
            }
            const joseHeader = {
                ...this.#protectedHeader,
                ...this.#unprotectedHeader,
                ...recipient.unprotectedHeader,
            };
            const { alg } = joseHeader;
            if (typeof alg !== 'string' || !alg) {
                throw new JWEInvalid('JWE "alg" (Algorithm) Header Parameter missing or invalid');
            }
            if (alg === 'dir' || alg === 'ECDH-ES') {
                throw new JWEInvalid('"dir" and "ECDH-ES" alg may only be used with a single recipient');
            }
            if (typeof joseHeader.enc !== 'string' || !joseHeader.enc) {
                throw new JWEInvalid('JWE "enc" (Encryption Algorithm) Header Parameter missing or invalid');
            }
            if (!enc) {
                enc = joseHeader.enc;
            }
            else if (enc !== joseHeader.enc) {
                throw new JWEInvalid('JWE "enc" (Encryption Algorithm) Header Parameter must be the same for all recipients');
            }
            validateCrit(JWEInvalid, new Map(), recipient.options.crit, this.#protectedHeader, joseHeader);
            if (joseHeader.zip !== undefined) {
                throw new JOSENotSupported('JWE "zip" (Compression Algorithm) Header Parameter is not supported.');
            }
        }
        const cek = generateCek(enc);
        const jwe = {
            ciphertext: '',
            iv: '',
            recipients: [],
            tag: '',
        };
        for (let i = 0; i < this.#recipients.length; i++) {
            const recipient = this.#recipients[i];
            const target = {};
            jwe.recipients.push(target);
            const joseHeader = {
                ...this.#protectedHeader,
                ...this.#unprotectedHeader,
                ...recipient.unprotectedHeader,
            };
            const p2c = joseHeader.alg.startsWith('PBES2') ? 2048 + i : undefined;
            if (i === 0) {
                const flattened = await new FlattenedEncrypt(this.#plaintext)
                    .setAdditionalAuthenticatedData(this.#aad)
                    .setContentEncryptionKey(cek)
                    .setProtectedHeader(this.#protectedHeader)
                    .setSharedUnprotectedHeader(this.#unprotectedHeader)
                    .setUnprotectedHeader(recipient.unprotectedHeader)
                    .setKeyManagementParameters({ p2c })
                    .encrypt(recipient.key, {
                    ...recipient.options,
                    [unprotected]: true,
                });
                jwe.ciphertext = flattened.ciphertext;
                jwe.iv = flattened.iv;
                jwe.tag = flattened.tag;
                if (flattened.aad)
                    jwe.aad = flattened.aad;
                if (flattened.protected)
                    jwe.protected = flattened.protected;
                if (flattened.unprotected)
                    jwe.unprotected = flattened.unprotected;
                target.encrypted_key = flattened.encrypted_key;
                if (flattened.header)
                    target.header = flattened.header;
                continue;
            }
            const alg = recipient.unprotectedHeader?.alg ||
                this.#protectedHeader?.alg ||
                this.#unprotectedHeader?.alg;
            checkKeyType(alg === 'dir' ? enc : alg, recipient.key, 'encrypt');
            const k = await normalizeKey(recipient.key, alg);
            const { encryptedKey, parameters } = await encryptKeyManagement(alg, enc, k, cek, { p2c });
            target.encrypted_key = b64u(encryptedKey);
            if (recipient.unprotectedHeader || parameters)
                target.header = { ...recipient.unprotectedHeader, ...parameters };
        }
        return jwe;
    }
}
