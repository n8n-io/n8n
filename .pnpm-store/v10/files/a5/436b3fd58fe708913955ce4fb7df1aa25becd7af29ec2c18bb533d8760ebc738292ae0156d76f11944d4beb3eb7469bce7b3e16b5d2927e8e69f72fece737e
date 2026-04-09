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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
export function isNotNullish(item) {
    return item !== undefined && item !== null;
}
/**
 * Converting the unordered attributes into unique identifier string.
 * @param attributes user provided unordered MetricAttributes.
 */
export function hashAttributes(attributes) {
    var keys = Object.keys(attributes);
    if (keys.length === 0)
        return '';
    // Return a string that is stable on key orders.
    keys = keys.sort();
    return JSON.stringify(keys.map(function (key) { return [key, attributes[key]]; }));
}
/**
 * Converting the instrumentation scope object to a unique identifier string.
 * @param instrumentationScope
 */
export function instrumentationScopeId(instrumentationScope) {
    var _a, _b;
    return instrumentationScope.name + ":" + ((_a = instrumentationScope.version) !== null && _a !== void 0 ? _a : '') + ":" + ((_b = instrumentationScope.schemaUrl) !== null && _b !== void 0 ? _b : '');
}
/**
 * Error that is thrown on timeouts.
 */
var TimeoutError = /** @class */ (function (_super) {
    __extends(TimeoutError, _super);
    function TimeoutError(message) {
        var _this = _super.call(this, message) || this;
        // manually adjust prototype to retain `instanceof` functionality when targeting ES5, see:
        // https://github.com/Microsoft/TypeScript-wiki/blob/main/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
        Object.setPrototypeOf(_this, TimeoutError.prototype);
        return _this;
    }
    return TimeoutError;
}(Error));
export { TimeoutError };
/**
 * Adds a timeout to a promise and rejects if the specified timeout has elapsed. Also rejects if the specified promise
 * rejects, and resolves if the specified promise resolves.
 *
 * <p> NOTE: this operation will continue even after it throws a {@link TimeoutError}.
 *
 * @param promise promise to use with timeout.
 * @param timeout the timeout in milliseconds until the returned promise is rejected.
 */
export function callWithTimeout(promise, timeout) {
    var timeoutHandle;
    var timeoutPromise = new Promise(function timeoutFunction(_resolve, reject) {
        timeoutHandle = setTimeout(function timeoutHandler() {
            reject(new TimeoutError('Operation timed out.'));
        }, timeout);
    });
    return Promise.race([promise, timeoutPromise]).then(function (result) {
        clearTimeout(timeoutHandle);
        return result;
    }, function (reason) {
        clearTimeout(timeoutHandle);
        throw reason;
    });
}
/**
 * Node.js v12.9 lower and browser compatible `Promise.allSettled`.
 */
export function PromiseAllSettled(promises) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            return [2 /*return*/, Promise.all(promises.map(function (p) { return __awaiter(_this, void 0, void 0, function () {
                    var ret, e_1;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                _a.trys.push([0, 2, , 3]);
                                return [4 /*yield*/, p];
                            case 1:
                                ret = _a.sent();
                                return [2 /*return*/, {
                                        status: 'fulfilled',
                                        value: ret,
                                    }];
                            case 2:
                                e_1 = _a.sent();
                                return [2 /*return*/, {
                                        status: 'rejected',
                                        reason: e_1,
                                    }];
                            case 3: return [2 /*return*/];
                        }
                    });
                }); }))];
        });
    });
}
export function isPromiseAllSettledRejectionResult(it) {
    return it.status === 'rejected';
}
/**
 * Node.js v11.0 lower and browser compatible `Array.prototype.flatMap`.
 */
export function FlatMap(arr, fn) {
    var result = [];
    arr.forEach(function (it) {
        result.push.apply(result, __spreadArray([], __read(fn(it)), false));
    });
    return result;
}
export function setEquals(lhs, rhs) {
    var e_2, _a;
    if (lhs.size !== rhs.size) {
        return false;
    }
    try {
        for (var lhs_1 = __values(lhs), lhs_1_1 = lhs_1.next(); !lhs_1_1.done; lhs_1_1 = lhs_1.next()) {
            var item = lhs_1_1.value;
            if (!rhs.has(item)) {
                return false;
            }
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (lhs_1_1 && !lhs_1_1.done && (_a = lhs_1.return)) _a.call(lhs_1);
        }
        finally { if (e_2) throw e_2.error; }
    }
    return true;
}
/**
 * Binary search the sorted array to the find upper bound for the value.
 * @param arr
 * @param value
 * @returns
 */
export function binarySearchUB(arr, value) {
    var lo = 0;
    var hi = arr.length - 1;
    var ret = arr.length;
    while (hi >= lo) {
        var mid = lo + Math.trunc((hi - lo) / 2);
        if (arr[mid] < value) {
            lo = mid + 1;
        }
        else {
            ret = mid;
            hi = mid - 1;
        }
    }
    return ret;
}
export function equalsCaseInsensitive(lhs, rhs) {
    return lhs.toLowerCase() === rhs.toLowerCase();
}
//# sourceMappingURL=utils.js.map