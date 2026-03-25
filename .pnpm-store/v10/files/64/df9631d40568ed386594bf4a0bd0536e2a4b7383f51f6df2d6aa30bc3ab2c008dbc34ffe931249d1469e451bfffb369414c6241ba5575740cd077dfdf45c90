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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCrypto = createCrypto;
exports.hasBrowserCrypto = hasBrowserCrypto;
const crypto_1 = require("./browser/crypto");
const crypto_2 = require("./node/crypto");
__exportStar(require("./shared"), exports);
// Crypto interface will provide required crypto functions.
// Use `createCrypto()` factory function to create an instance
// of Crypto. It will either use Node.js `crypto` module, or
// use browser's SubtleCrypto interface. Since most of the
// SubtleCrypto methods return promises, we must make those
// methods return promises here as well, even though in Node.js
// they are synchronous.
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
//# sourceMappingURL=crypto.js.map