/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    createBrowserAuthError,
    BrowserAuthErrorCodes,
} from "../error/BrowserAuthError.js";
import {
    IPerformanceClient,
    PerformanceEvents,
} from "@azure/msal-common/browser";
import { KEY_FORMAT_JWK } from "../utils/BrowserConstants.js";
import { base64Encode, urlEncodeArr } from "../encode/Base64Encode.js";
import { base64Decode, base64DecToArr } from "../encode/Base64Decode.js";

/**
 * This file defines functions used by the browser library to perform cryptography operations such as
 * hashing and encoding. It also has helper functions to validate the availability of specific APIs.
 */

/**
 * See here for more info on RsaHashedKeyGenParams: https://developer.mozilla.org/en-US/docs/Web/API/RsaHashedKeyGenParams
 */
// Algorithms
const PKCS1_V15_KEYGEN_ALG = "RSASSA-PKCS1-v1_5";
const AES_GCM = "AES-GCM";
const HKDF = "HKDF";
// SHA-256 hashing algorithm
const S256_HASH_ALG = "SHA-256";
// MOD length for PoP tokens
const MODULUS_LENGTH = 2048;
// Public Exponent
const PUBLIC_EXPONENT: Uint8Array = new Uint8Array([0x01, 0x00, 0x01]);
// UUID hex digits
const UUID_CHARS = "0123456789abcdef";
// Array to store UINT32 random value
const UINT32_ARR = new Uint32Array(1);

// Key Format
const RAW = "raw";
// Key Usages
const ENCRYPT = "encrypt";
const DECRYPT = "decrypt";
const DERIVE_KEY = "deriveKey";

// Suberror
const SUBTLE_SUBERROR = "crypto_subtle_undefined";

const keygenAlgorithmOptions: RsaHashedKeyGenParams = {
    name: PKCS1_V15_KEYGEN_ALG,
    hash: S256_HASH_ALG,
    modulusLength: MODULUS_LENGTH,
    publicExponent: PUBLIC_EXPONENT,
};

/**
 * Check whether browser crypto is available.
 */
export function validateCryptoAvailable(
    skipValidateSubtleCrypto: boolean
): void {
    if (!window) {
        throw createBrowserAuthError(
            BrowserAuthErrorCodes.nonBrowserEnvironment
        );
    }
    if (!window.crypto) {
        throw createBrowserAuthError(BrowserAuthErrorCodes.cryptoNonExistent);
    }
    if (!skipValidateSubtleCrypto && !window.crypto.subtle) {
        throw createBrowserAuthError(
            BrowserAuthErrorCodes.cryptoNonExistent,
            SUBTLE_SUBERROR
        );
    }
}

/**
 * Returns a sha-256 hash of the given dataString as an ArrayBuffer.
 * @param dataString {string} data string
 * @param performanceClient {?IPerformanceClient}
 * @param correlationId {?string} correlation id
 */
export async function sha256Digest(
    dataString: string,
    performanceClient?: IPerformanceClient,
    correlationId?: string
): Promise<ArrayBuffer> {
    performanceClient?.addQueueMeasurement(
        PerformanceEvents.Sha256Digest,
        correlationId
    );
    const encoder = new TextEncoder();
    const data = encoder.encode(dataString);
    return window.crypto.subtle.digest(
        S256_HASH_ALG,
        data
    ) as Promise<ArrayBuffer>;
}

/**
 * Populates buffer with cryptographically random values.
 * @param dataBuffer
 */
export function getRandomValues(dataBuffer: Uint8Array): Uint8Array {
    return window.crypto.getRandomValues(dataBuffer);
}

/**
 * Returns random Uint32 value.
 * @returns {number}
 */
function getRandomUint32(): number {
    window.crypto.getRandomValues(UINT32_ARR);
    return UINT32_ARR[0];
}

/**
 * Creates a UUID v7 from the current timestamp.
 * Implementation relies on the system clock to guarantee increasing order of generated identifiers.
 * @returns {number}
 */
export function createNewGuid(): string {
    const currentTimestamp = Date.now();
    const baseRand = getRandomUint32() * 0x400 + (getRandomUint32() & 0x3ff);

    // Result byte array
    const bytes = new Uint8Array(16);
    // A 12-bit `rand_a` field value
    const randA = Math.trunc(baseRand / 2 ** 30);
    // The higher 30 bits of 62-bit `rand_b` field value
    const randBHi = baseRand & (2 ** 30 - 1);
    // The lower 32 bits of 62-bit `rand_b` field value
    const randBLo = getRandomUint32();

    bytes[0] = currentTimestamp / 2 ** 40;
    bytes[1] = currentTimestamp / 2 ** 32;
    bytes[2] = currentTimestamp / 2 ** 24;
    bytes[3] = currentTimestamp / 2 ** 16;
    bytes[4] = currentTimestamp / 2 ** 8;
    bytes[5] = currentTimestamp;
    bytes[6] = 0x70 | (randA >>> 8);
    bytes[7] = randA;
    bytes[8] = 0x80 | (randBHi >>> 24);
    bytes[9] = randBHi >>> 16;
    bytes[10] = randBHi >>> 8;
    bytes[11] = randBHi;
    bytes[12] = randBLo >>> 24;
    bytes[13] = randBLo >>> 16;
    bytes[14] = randBLo >>> 8;
    bytes[15] = randBLo;

    let text = "";
    for (let i = 0; i < bytes.length; i++) {
        text += UUID_CHARS.charAt(bytes[i] >>> 4);
        text += UUID_CHARS.charAt(bytes[i] & 0xf);
        if (i === 3 || i === 5 || i === 7 || i === 9) {
            text += "-";
        }
    }
    return text;
}

/**
 * Generates a keypair based on current keygen algorithm config.
 * @param extractable
 * @param usages
 */
export async function generateKeyPair(
    extractable: boolean,
    usages: Array<KeyUsage>
): Promise<CryptoKeyPair> {
    return window.crypto.subtle.generateKey(
        keygenAlgorithmOptions,
        extractable,
        usages
    ) as Promise<CryptoKeyPair>;
}

/**
 * Export key as Json Web Key (JWK)
 * @param key
 */
export async function exportJwk(key: CryptoKey): Promise<JsonWebKey> {
    return window.crypto.subtle.exportKey(
        KEY_FORMAT_JWK,
        key
    ) as Promise<JsonWebKey>;
}

/**
 * Imports key as Json Web Key (JWK), can set extractable and usages.
 * @param key
 * @param extractable
 * @param usages
 */
export async function importJwk(
    key: JsonWebKey,
    extractable: boolean,
    usages: Array<KeyUsage>
): Promise<CryptoKey> {
    return window.crypto.subtle.importKey(
        KEY_FORMAT_JWK,
        key,
        keygenAlgorithmOptions,
        extractable,
        usages
    ) as Promise<CryptoKey>;
}

/**
 * Signs given data with given key
 * @param key
 * @param data
 */
export async function sign(
    key: CryptoKey,
    data: ArrayBuffer
): Promise<ArrayBuffer> {
    return window.crypto.subtle.sign(
        keygenAlgorithmOptions,
        key,
        data
    ) as Promise<ArrayBuffer>;
}

/**
 * Generates Base64 encoded jwk used in the Encrypted Authorize Response (EAR) flow
 */
export async function generateEarKey(): Promise<string> {
    const key = await generateBaseKey();
    const keyStr = urlEncodeArr(new Uint8Array(key));

    const jwk = {
        alg: "dir",
        kty: "oct",
        k: keyStr,
    };

    return base64Encode(JSON.stringify(jwk));
}

/**
 * Parses earJwk for encryption key and returns CryptoKey object
 * @param earJwk
 * @returns
 */
export async function importEarKey(earJwk: string): Promise<CryptoKey> {
    const b64DecodedJwk = base64Decode(earJwk);
    const jwkJson = JSON.parse(b64DecodedJwk);
    const rawKey = jwkJson.k;
    const keyBuffer = base64DecToArr(rawKey);

    return window.crypto.subtle.importKey(RAW, keyBuffer, AES_GCM, false, [
        DECRYPT,
    ]);
}

/**
 * Decrypt ear_jwe response returned in the Encrypted Authorize Response (EAR) flow
 * @param earJwk
 * @param earJwe
 * @returns
 */
export async function decryptEarResponse(
    earJwk: string,
    earJwe: string
): Promise<string> {
    const earJweParts = earJwe.split(".");
    if (earJweParts.length !== 5) {
        throw createBrowserAuthError(
            BrowserAuthErrorCodes.failedToDecryptEarResponse,
            "jwe_length"
        );
    }

    const key = await importEarKey(earJwk).catch(() => {
        throw createBrowserAuthError(
            BrowserAuthErrorCodes.failedToDecryptEarResponse,
            "import_key"
        );
    });

    try {
        const header = new TextEncoder().encode(earJweParts[0]);
        const iv = base64DecToArr(earJweParts[2]);
        const ciphertext = base64DecToArr(earJweParts[3]);
        const tag = base64DecToArr(earJweParts[4]);
        const tagLengthBits = tag.byteLength * 8;

        // Concat ciphertext and tag
        const encryptedData = new Uint8Array(ciphertext.length + tag.length);
        encryptedData.set(ciphertext);
        encryptedData.set(tag, ciphertext.length);

        const decryptedData = await window.crypto.subtle.decrypt(
            {
                name: AES_GCM,
                iv: iv,
                tagLength: tagLengthBits,
                additionalData: header,
            },
            key,
            encryptedData
        );

        return new TextDecoder().decode(decryptedData);
    } catch (e) {
        throw createBrowserAuthError(
            BrowserAuthErrorCodes.failedToDecryptEarResponse,
            "decrypt"
        );
    }
}

/**
 * Generates symmetric base encryption key. This may be stored as all encryption/decryption keys will be derived from this one.
 */
export async function generateBaseKey(): Promise<ArrayBuffer> {
    const key = await window.crypto.subtle.generateKey(
        {
            name: AES_GCM,
            length: 256,
        },
        true,
        [ENCRYPT, DECRYPT]
    );
    return window.crypto.subtle.exportKey(RAW, key);
}

/**
 * Returns the raw key to be passed into the key derivation function
 * @param baseKey
 * @returns
 */
export async function generateHKDF(baseKey: ArrayBuffer): Promise<CryptoKey> {
    return window.crypto.subtle.importKey(RAW, baseKey, HKDF, false, [
        DERIVE_KEY,
    ]);
}

/**
 * Given a base key and a nonce generates a derived key to be used in encryption and decryption.
 * Note: every time we encrypt a new key is derived
 * @param baseKey
 * @param nonce
 * @returns
 */
async function deriveKey(
    baseKey: CryptoKey,
    nonce: ArrayBuffer,
    context: string
): Promise<CryptoKey> {
    return window.crypto.subtle.deriveKey(
        {
            name: HKDF,
            salt: nonce,
            hash: S256_HASH_ALG,
            info: new TextEncoder().encode(context),
        },
        baseKey,
        { name: AES_GCM, length: 256 },
        false,
        [ENCRYPT, DECRYPT]
    );
}

/**
 * Encrypt the given data given a base key. Returns encrypted data and a nonce that must be provided during decryption
 * @param key
 * @param rawData
 */
export async function encrypt(
    baseKey: CryptoKey,
    rawData: string,
    context: string
): Promise<{ data: string; nonce: string }> {
    const encodedData = new TextEncoder().encode(rawData);
    // The nonce must never be reused with a given key.
    const nonce = window.crypto.getRandomValues(new Uint8Array(16));
    const derivedKey = await deriveKey(baseKey, nonce, context);
    const encryptedData = await window.crypto.subtle.encrypt(
        {
            name: AES_GCM,
            iv: new Uint8Array(12), // New key is derived for every encrypt so we don't need a new nonce
        },
        derivedKey,
        encodedData
    );

    return {
        data: urlEncodeArr(new Uint8Array(encryptedData)),
        nonce: urlEncodeArr(nonce),
    };
}

/**
 * Decrypt data with the given key and nonce
 * @param key
 * @param nonce
 * @param encryptedData
 * @returns
 */
export async function decrypt(
    baseKey: CryptoKey,
    nonce: string,
    context: string,
    encryptedData: string
): Promise<string> {
    const encodedData = base64DecToArr(encryptedData);
    const derivedKey = await deriveKey(baseKey, base64DecToArr(nonce), context);
    const decryptedData = await window.crypto.subtle.decrypt(
        {
            name: AES_GCM,
            iv: new Uint8Array(12), // New key is derived for every encrypt so we don't need a new nonce
        },
        derivedKey,
        encodedData
    );

    return new TextDecoder().decode(decryptedData);
}

/**
 * Returns the SHA-256 hash of an input string
 * @param plainText
 */
export async function hashString(plainText: string): Promise<string> {
    const hashBuffer: ArrayBuffer = await sha256Digest(plainText);
    const hashBytes = new Uint8Array(hashBuffer);
    return urlEncodeArr(hashBytes);
}
