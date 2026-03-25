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
exports.createCrypto = createCrypto;
exports.hasBrowserCrypto = hasBrowserCrypto;
exports.fromArrayBufferToHex = fromArrayBufferToHex;
const crypto_1 = require("./browser/crypto");
const crypto_2 = require("./node/crypto");
function createCrypto() {
    if (hasBrowserCrypto()) {
        return new crypto_1.BrowserCrypto();
    }
    return new crypto_2.NodeCrypto();
}
function hasBrowserCrypto() {
    return (typeof window !== 'undefined' &&
        typeof window.crypto !== 'undefined' &&
        typeof window.crypto.subtle !== 'undefined');
}
/**
 * Converts an ArrayBuffer to a hexadecimal string.
 * @param arrayBuffer The ArrayBuffer to convert to hexadecimal string.
 * @return The hexadecimal encoding of the ArrayBuffer.
 */
function fromArrayBufferToHex(arrayBuffer) {
    // Convert buffer to byte array.
    const byteArray = Array.from(new Uint8Array(arrayBuffer));
    // Convert bytes to hex string.
    return byteArray
        .map(byte => {
        return byte.toString(16).padStart(2, '0');
    })
        .join('');
}
