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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import { hashAttributes } from '../utils';
var HashMap = /** @class */ (function () {
    function HashMap(_hash) {
        this._hash = _hash;
        this._valueMap = new Map();
        this._keyMap = new Map();
    }
    HashMap.prototype.get = function (key, hashCode) {
        hashCode !== null && hashCode !== void 0 ? hashCode : (hashCode = this._hash(key));
        return this._valueMap.get(hashCode);
    };
    HashMap.prototype.getOrDefault = function (key, defaultFactory) {
        var hash = this._hash(key);
        if (this._valueMap.has(hash)) {
            return this._valueMap.get(hash);
        }
        var val = defaultFactory();
        if (!this._keyMap.has(hash)) {
            this._keyMap.set(hash, key);
        }
        this._valueMap.set(hash, val);
        return val;
    };
    HashMap.prototype.set = function (key, value, hashCode) {
        hashCode !== null && hashCode !== void 0 ? hashCode : (hashCode = this._hash(key));
        if (!this._keyMap.has(hashCode)) {
            this._keyMap.set(hashCode, key);
        }
        this._valueMap.set(hashCode, value);
    };
    HashMap.prototype.has = function (key, hashCode) {
        hashCode !== null && hashCode !== void 0 ? hashCode : (hashCode = this._hash(key));
        return this._valueMap.has(hashCode);
    };
    HashMap.prototype.keys = function () {
        var keyIterator, next;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    keyIterator = this._keyMap.entries();
                    next = keyIterator.next();
                    _a.label = 1;
                case 1:
                    if (!(next.done !== true)) return [3 /*break*/, 3];
                    return [4 /*yield*/, [next.value[1], next.value[0]]];
                case 2:
                    _a.sent();
                    next = keyIterator.next();
                    return [3 /*break*/, 1];
                case 3: return [2 /*return*/];
            }
        });
    };
    HashMap.prototype.entries = function () {
        var valueIterator, next;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    valueIterator = this._valueMap.entries();
                    next = valueIterator.next();
                    _a.label = 1;
                case 1:
                    if (!(next.done !== true)) return [3 /*break*/, 3];
                    // next.value[0] here can not be undefined
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    return [4 /*yield*/, [this._keyMap.get(next.value[0]), next.value[1], next.value[0]]];
                case 2:
                    // next.value[0] here can not be undefined
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    _a.sent();
                    next = valueIterator.next();
                    return [3 /*break*/, 1];
                case 3: return [2 /*return*/];
            }
        });
    };
    Object.defineProperty(HashMap.prototype, "size", {
        get: function () {
            return this._valueMap.size;
        },
        enumerable: false,
        configurable: true
    });
    return HashMap;
}());
export { HashMap };
var AttributeHashMap = /** @class */ (function (_super) {
    __extends(AttributeHashMap, _super);
    function AttributeHashMap() {
        return _super.call(this, hashAttributes) || this;
    }
    return AttributeHashMap;
}(HashMap));
export { AttributeHashMap };
//# sourceMappingURL=HashMap.js.map