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
exports.equalsCaseInsensitive = exports.binarySearchUB = exports.setEquals = exports.FlatMap = exports.isPromiseAllSettledRejectionResult = exports.PromiseAllSettled = exports.callWithTimeout = exports.TimeoutError = exports.instrumentationScopeId = exports.hashAttributes = exports.isNotNullish = void 0;
function isNotNullish(item) {
    return item !== undefined && item !== null;
}
exports.isNotNullish = isNotNullish;
/**
 * Converting the unordered attributes into unique identifier string.
 * @param attributes user provided unordered MetricAttributes.
 */
function hashAttributes(attributes) {
    let keys = Object.keys(attributes);
    if (keys.length === 0)
        return '';
    // Return a string that is stable on key orders.
    keys = keys.sort();
    return JSON.stringify(keys.map(key => [key, attributes[key]]));
}
exports.hashAttributes = hashAttributes;
/**
 * Converting the instrumentation scope object to a unique identifier string.
 * @param instrumentationScope
 */
function instrumentationScopeId(instrumentationScope) {
    var _a, _b;
    return `${instrumentationScope.name}:${(_a = instrumentationScope.version) !== null && _a !== void 0 ? _a : ''}:${(_b = instrumentationScope.schemaUrl) !== null && _b !== void 0 ? _b : ''}`;
}
exports.instrumentationScopeId = instrumentationScopeId;
/**
 * Error that is thrown on timeouts.
 */
class TimeoutError extends Error {
    constructor(message) {
        super(message);
        // manually adjust prototype to retain `instanceof` functionality when targeting ES5, see:
        // https://github.com/Microsoft/TypeScript-wiki/blob/main/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
        Object.setPrototypeOf(this, TimeoutError.prototype);
    }
}
exports.TimeoutError = TimeoutError;
/**
 * Adds a timeout to a promise and rejects if the specified timeout has elapsed. Also rejects if the specified promise
 * rejects, and resolves if the specified promise resolves.
 *
 * <p> NOTE: this operation will continue even after it throws a {@link TimeoutError}.
 *
 * @param promise promise to use with timeout.
 * @param timeout the timeout in milliseconds until the returned promise is rejected.
 */
function callWithTimeout(promise, timeout) {
    let timeoutHandle;
    const timeoutPromise = new Promise(function timeoutFunction(_resolve, reject) {
        timeoutHandle = setTimeout(function timeoutHandler() {
            reject(new TimeoutError('Operation timed out.'));
        }, timeout);
    });
    return Promise.race([promise, timeoutPromise]).then(result => {
        clearTimeout(timeoutHandle);
        return result;
    }, reason => {
        clearTimeout(timeoutHandle);
        throw reason;
    });
}
exports.callWithTimeout = callWithTimeout;
/**
 * Node.js v12.9 lower and browser compatible `Promise.allSettled`.
 */
async function PromiseAllSettled(promises) {
    return Promise.all(promises.map(async (p) => {
        try {
            const ret = await p;
            return {
                status: 'fulfilled',
                value: ret,
            };
        }
        catch (e) {
            return {
                status: 'rejected',
                reason: e,
            };
        }
    }));
}
exports.PromiseAllSettled = PromiseAllSettled;
function isPromiseAllSettledRejectionResult(it) {
    return it.status === 'rejected';
}
exports.isPromiseAllSettledRejectionResult = isPromiseAllSettledRejectionResult;
/**
 * Node.js v11.0 lower and browser compatible `Array.prototype.flatMap`.
 */
function FlatMap(arr, fn) {
    const result = [];
    arr.forEach(it => {
        result.push(...fn(it));
    });
    return result;
}
exports.FlatMap = FlatMap;
function setEquals(lhs, rhs) {
    if (lhs.size !== rhs.size) {
        return false;
    }
    for (const item of lhs) {
        if (!rhs.has(item)) {
            return false;
        }
    }
    return true;
}
exports.setEquals = setEquals;
/**
 * Binary search the sorted array to the find upper bound for the value.
 * @param arr
 * @param value
 * @returns
 */
function binarySearchUB(arr, value) {
    let lo = 0;
    let hi = arr.length - 1;
    let ret = arr.length;
    while (hi >= lo) {
        const mid = lo + Math.trunc((hi - lo) / 2);
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
exports.binarySearchUB = binarySearchUB;
function equalsCaseInsensitive(lhs, rhs) {
    return lhs.toLowerCase() === rhs.toLowerCase();
}
exports.equalsCaseInsensitive = equalsCaseInsensitive;
//# sourceMappingURL=utils.js.map