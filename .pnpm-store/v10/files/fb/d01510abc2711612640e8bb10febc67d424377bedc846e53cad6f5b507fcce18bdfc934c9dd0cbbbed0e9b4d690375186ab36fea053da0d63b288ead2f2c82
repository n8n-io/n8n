"use strict";
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttributeHashMap = exports.HashMap = void 0;
const utils_1 = require("../utils");
class HashMap {
    constructor(_hash) {
        this._hash = _hash;
        this._valueMap = new Map();
        this._keyMap = new Map();
    }
    get(key, hashCode) {
        hashCode !== null && hashCode !== void 0 ? hashCode : (hashCode = this._hash(key));
        return this._valueMap.get(hashCode);
    }
    getOrDefault(key, defaultFactory) {
        const hash = this._hash(key);
        if (this._valueMap.has(hash)) {
            return this._valueMap.get(hash);
        }
        const val = defaultFactory();
        if (!this._keyMap.has(hash)) {
            this._keyMap.set(hash, key);
        }
        this._valueMap.set(hash, val);
        return val;
    }
    set(key, value, hashCode) {
        hashCode !== null && hashCode !== void 0 ? hashCode : (hashCode = this._hash(key));
        if (!this._keyMap.has(hashCode)) {
            this._keyMap.set(hashCode, key);
        }
        this._valueMap.set(hashCode, value);
    }
    has(key, hashCode) {
        hashCode !== null && hashCode !== void 0 ? hashCode : (hashCode = this._hash(key));
        return this._valueMap.has(hashCode);
    }
    *keys() {
        const keyIterator = this._keyMap.entries();
        let next = keyIterator.next();
        while (next.done !== true) {
            yield [next.value[1], next.value[0]];
            next = keyIterator.next();
        }
    }
    *entries() {
        const valueIterator = this._valueMap.entries();
        let next = valueIterator.next();
        while (next.done !== true) {
            // next.value[0] here can not be undefined
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            yield [this._keyMap.get(next.value[0]), next.value[1], next.value[0]];
            next = valueIterator.next();
        }
    }
    get size() {
        return this._valueMap.size;
    }
}
exports.HashMap = HashMap;
class AttributeHashMap extends HashMap {
    constructor() {
        super(utils_1.hashAttributes);
    }
}
exports.AttributeHashMap = AttributeHashMap;
//# sourceMappingURL=HashMap.js.map