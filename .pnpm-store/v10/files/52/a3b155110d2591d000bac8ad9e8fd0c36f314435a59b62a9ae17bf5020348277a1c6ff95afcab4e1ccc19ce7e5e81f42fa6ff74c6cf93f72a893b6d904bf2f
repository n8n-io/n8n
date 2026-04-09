import { decode as b64u } from '../../util/base64url.js';
import { decrypt } from '../../lib/content_encryption.js';
import { decodeBase64url } from '../../lib/helpers.js';
import { JOSEAlgNotAllowed, JOSENotSupported, JWEInvalid } from '../../util/errors.js';
import { isDisjoint } from '../../lib/type_checks.js';
import { isObject } from '../../lib/type_checks.js';
import { decryptKeyManagement } from '../../lib/key_management.js';
import { decoder, concat, encode } from '../../lib/buffer_utils.js';
import { generateCek } from '../../lib/content_encryption.js';
import { validateCrit } from '../../lib/validate_crit.js';
import { validateAlgorithms } from '../../lib/validate_algorithms.js';
import { normalizeKey } from '../../lib/normalize_key.js';
import { checkKeyType } from '../../lib/check_key_type.js';
import { decompress } from '../../lib/deflate.js';
export async function flattenedDecrypt(jwe, key, options) {
    if (!isObject(jwe)) {
        throw new JWEInvalid('Flattened JWE must be an object');
    }
    if (jwe.protected === undefined && jwe.header === undefined && jwe.unprotected === undefined) {
        throw new JWEInvalid('JOSE Header missing');
    }
    if (jwe.iv !== undefined && typeof jwe.iv !== 'string') {
        throw new JWEInvalid('JWE Initialization Vector incorrect type');
    }
    if (typeof jwe.ciphertext !== 'string') {
        throw new JWEInvalid('JWE Ciphertext missing or incorrect type');
    }
    if (jwe.tag !== undefined && typeof jwe.tag !== 'string') {
        throw new JWEInvalid('JWE Authentication Tag incorrect type');
    }
    if (jwe.protected !== undefined && typeof jwe.protected !== 'string') {
        throw new JWEInvalid('JWE Protected Header incorrect type');
    }
    if (jwe.encrypted_key !== undefined && typeof jwe.encrypted_key !== 'string') {
        throw new JWEInvalid('JWE Encrypted Key incorrect type');
    }
    if (jwe.aad !== undefined && typeof jwe.aad !== 'string') {
        throw new JWEInvalid('JWE AAD incorrect type');
    }
    if (jwe.header !== undefined && !isObject(jwe.header)) {
        throw new JWEInvalid('JWE Shared Unprotected Header incorrect type');
    }
    if (jwe.unprotected !== undefined && !isObject(jwe.unprotected)) {
        throw new JWEInvalid('JWE Per-Recipient Unprotected Header incorrect type');
    }
    let parsedProt;
    if (jwe.protected) {
        try {
            const protectedHeader = b64u(jwe.protected);
            parsedProt = JSON.parse(decoder.decode(protectedHeader));
        }
        catch {
            throw new JWEInvalid('JWE Protected Header is invalid');
        }
    }
    if (!isDisjoint(parsedProt, jwe.header, jwe.unprotected)) {
        throw new JWEInvalid('JWE Protected, JWE Unprotected Header, and JWE Per-Recipient Unprotected Header Parameter names must be disjoint');
    }
    const joseHeader = {
        ...parsedProt,
        ...jwe.header,
        ...jwe.unprotected,
    };
    validateCrit(JWEInvalid, new Map(), options?.crit, parsedProt, joseHeader);
    if (joseHeader.zip !== undefined && joseHeader.zip !== 'DEF') {
        throw new JOSENotSupported('Unsupported JWE "zip" (Compression Algorithm) Header Parameter value.');
    }
    if (joseHeader.zip !== undefined && !parsedProt?.zip) {
        throw new JWEInvalid('JWE "zip" (Compression Algorithm) Header Parameter MUST be in a protected header.');
    }
    const { alg, enc } = joseHeader;
    if (typeof alg !== 'string' || !alg) {
        throw new JWEInvalid('missing JWE Algorithm (alg) in JWE Header');
    }
    if (typeof enc !== 'string' || !enc) {
        throw new JWEInvalid('missing JWE Encryption Algorithm (enc) in JWE Header');
    }
    const keyManagementAlgorithms = options && validateAlgorithms('keyManagementAlgorithms', options.keyManagementAlgorithms);
    const contentEncryptionAlgorithms = options &&
        validateAlgorithms('contentEncryptionAlgorithms', options.contentEncryptionAlgorithms);
    if ((keyManagementAlgorithms && !keyManagementAlgorithms.has(alg)) ||
        (!keyManagementAlgorithms && alg.startsWith('PBES2'))) {
        throw new JOSEAlgNotAllowed('"alg" (Algorithm) Header Parameter value not allowed');
    }
    if (contentEncryptionAlgorithms && !contentEncryptionAlgorithms.has(enc)) {
        throw new JOSEAlgNotAllowed('"enc" (Encryption Algorithm) Header Parameter value not allowed');
    }
    let encryptedKey;
    if (jwe.encrypted_key !== undefined) {
        encryptedKey = decodeBase64url(jwe.encrypted_key, 'encrypted_key', JWEInvalid);
    }
    let resolvedKey = false;
    if (typeof key === 'function') {
        key = await key(parsedProt, jwe);
        resolvedKey = true;
    }
    checkKeyType(alg === 'dir' ? enc : alg, key, 'decrypt');
    const k = await normalizeKey(key, alg);
    let cek;
    try {
        cek = await decryptKeyManagement(alg, k, encryptedKey, joseHeader, options);
    }
    catch (err) {
        if (err instanceof TypeError || err instanceof JWEInvalid || err instanceof JOSENotSupported) {
            throw err;
        }
        cek = generateCek(enc);
    }
    let iv;
    let tag;
    if (jwe.iv !== undefined) {
        iv = decodeBase64url(jwe.iv, 'iv', JWEInvalid);
    }
    if (jwe.tag !== undefined) {
        tag = decodeBase64url(jwe.tag, 'tag', JWEInvalid);
    }
    const protectedHeader = jwe.protected !== undefined ? encode(jwe.protected) : new Uint8Array();
    let additionalData;
    if (jwe.aad !== undefined) {
        additionalData = concat(protectedHeader, encode('.'), encode(jwe.aad));
    }
    else {
        additionalData = protectedHeader;
    }
    const ciphertext = decodeBase64url(jwe.ciphertext, 'ciphertext', JWEInvalid);
    const plaintext = await decrypt(enc, cek, ciphertext, iv, tag, additionalData);
    const result = { plaintext };
    if (joseHeader.zip === 'DEF') {
        const maxDecompressedLength = options?.maxDecompressedLength ?? 250_000;
        if (maxDecompressedLength === 0) {
            throw new JOSENotSupported('JWE "zip" (Compression Algorithm) Header Parameter is not supported.');
        }
        if (maxDecompressedLength !== Infinity &&
            (!Number.isSafeInteger(maxDecompressedLength) || maxDecompressedLength < 1)) {
            throw new TypeError('maxDecompressedLength must be 0, a positive safe integer, or Infinity');
        }
        result.plaintext = await decompress(plaintext, maxDecompressedLength).catch((cause) => {
            if (cause instanceof JWEInvalid)
                throw cause;
            throw new JWEInvalid('Failed to decompress plaintext', { cause });
        });
    }
    if (jwe.protected !== undefined) {
        result.protectedHeader = parsedProt;
    }
    if (jwe.aad !== undefined) {
        result.additionalAuthenticatedData = decodeBase64url(jwe.aad, 'aad', JWEInvalid);
    }
    if (jwe.unprotected !== undefined) {
        result.sharedUnprotectedHeader = jwe.unprotected;
    }
    if (jwe.header !== undefined) {
        result.unprotectedHeader = jwe.header;
    }
    if (resolvedKey) {
        return { ...result, key: k };
    }
    return result;
}
