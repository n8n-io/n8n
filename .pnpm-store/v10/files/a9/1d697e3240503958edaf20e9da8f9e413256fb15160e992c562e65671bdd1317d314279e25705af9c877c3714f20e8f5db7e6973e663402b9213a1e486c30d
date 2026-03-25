"use strict";
// Copyright 2019 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/* global window */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserCrypto = void 0;
// This file implements crypto functions we need using in-browser
// SubtleCrypto interface `window.crypto.subtle`.
const base64js = require("base64-js");
const crypto_1 = require("../crypto");
class BrowserCrypto {
    constructor() {
        if (typeof window === 'undefined' ||
            window.crypto === undefined ||
            window.crypto.subtle === undefined) {
            throw new Error("SubtleCrypto not found. Make sure it's an https:// website.");
        }
    }
    async sha256DigestBase64(str) {
        // SubtleCrypto digest() method is async, so we must make
        // this method async as well.
        // To calculate SHA256 digest using SubtleCrypto, we first
        // need to convert an input string to an ArrayBuffer:
        const inputBuffer = new TextEncoder().encode(str);
        // Result is ArrayBuffer as well.
        const outputBuffer = await window.crypto.subtle.digest('SHA-256', inputBuffer);
        return base64js.fromByteArray(new Uint8Array(outputBuffer));
    }
    randomBytesBase64(count) {
        const array = new Uint8Array(count);
        window.crypto.getRandomValues(array);
        return base64js.fromByteArray(array);
    }
    static padBase64(base64) {
        // base64js requires padding, so let's add some '='
        while (base64.length % 4 !== 0) {
            base64 += '=';
        }
        return base64;
    }
    async verify(pubkey, data, signature) {
        const algo = {
            name: 'RSASSA-PKCS1-v1_5',
            hash: { name: 'SHA-256' },
        };
        const dataArray = new TextEncoder().encode(data);
        const signatureArray = base64js.toByteArray(BrowserCrypto.padBase64(signature));
        const cryptoKey = await window.crypto.subtle.importKey('jwk', pubkey, algo, true, ['verify']);
        // SubtleCrypto's verify method is async so we must make
        // this method async as well.
        const result = await window.crypto.subtle.verify(algo, cryptoKey, signatureArray, dataArray);
        return result;
    }
    async sign(privateKey, data) {
        const algo = {
            name: 'RSASSA-PKCS1-v1_5',
            hash: { name: 'SHA-256' },
        };
        const dataArray = new TextEncoder().encode(data);
        const cryptoKey = await window.crypto.subtle.importKey('jwk', privateKey, algo, true, ['sign']);
        // SubtleCrypto's sign method is async so we must make
        // this method async as well.
        const result = await window.crypto.subtle.sign(algo, cryptoKey, dataArray);
        return base64js.fromByteArray(new Uint8Array(result));
    }
    decodeBase64StringUtf8(base64) {
        const uint8array = base64js.toByteArray(BrowserCrypto.padBase64(base64));
        const result = new TextDecoder().decode(uint8array);
        return result;
    }
    encodeBase64StringUtf8(text) {
        const uint8array = new TextEncoder().encode(text);
        const result = base64js.fromByteArray(uint8array);
        return result;
    }
    /**
     * Computes the SHA-256 hash of the provided string.
     * @param str The plain text string to hash.
     * @return A promise that resolves with the SHA-256 hash of the provided
     *   string in hexadecimal encoding.
     */
    async sha256DigestHex(str) {
        // SubtleCrypto digest() method is async, so we must make
        // this method async as well.
        // To calculate SHA256 digest using SubtleCrypto, we first
        // need to convert an input string to an ArrayBuffer:
        const inputBuffer = new TextEncoder().encode(str);
        // Result is ArrayBuffer as well.
        const outputBuffer = await window.crypto.subtle.digest('SHA-256', inputBuffer);
        return (0, crypto_1.fromArrayBufferToHex)(outputBuffer);
    }
    /**
     * Computes the HMAC hash of a message using the provided crypto key and the
     * SHA-256 algorithm.
     * @param key The secret crypto key in utf-8 or ArrayBuffer format.
     * @param msg The plain text message.
     * @return A promise that resolves with the HMAC-SHA256 hash in ArrayBuffer
     *   format.
     */
    async signWithHmacSha256(key, msg) {
        // Convert key, if provided in ArrayBuffer format, to string.
        const rawKey = typeof key === 'string'
            ? key
            : String.fromCharCode(...new Uint16Array(key));
        const enc = new TextEncoder();
        const cryptoKey = await window.crypto.subtle.importKey('raw', enc.encode(rawKey), {
            name: 'HMAC',
            hash: {
                name: 'SHA-256',
            },
        }, false, ['sign']);
        return window.crypto.subtle.sign('HMAC', cryptoKey, enc.encode(msg));
    }
}
exports.BrowserCrypto = BrowserCrypto;
