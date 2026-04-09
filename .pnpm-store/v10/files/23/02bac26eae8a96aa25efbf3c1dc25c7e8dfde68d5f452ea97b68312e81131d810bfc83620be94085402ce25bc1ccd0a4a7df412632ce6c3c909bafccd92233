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
import { Deferred } from './promise';
/**
 * Bind the callback and only invoke the callback once regardless how many times `BindOnceFuture.call` is invoked.
 */
var BindOnceFuture = /** @class */ (function () {
    function BindOnceFuture(_callback, _that) {
        this._callback = _callback;
        this._that = _that;
        this._isCalled = false;
        this._deferred = new Deferred();
    }
    Object.defineProperty(BindOnceFuture.prototype, "isCalled", {
        get: function () {
            return this._isCalled;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(BindOnceFuture.prototype, "promise", {
        get: function () {
            return this._deferred.promise;
        },
        enumerable: false,
        configurable: true
    });
    BindOnceFuture.prototype.call = function () {
        var _a;
        var _this = this;
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (!this._isCalled) {
            this._isCalled = true;
            try {
                Promise.resolve((_a = this._callback).call.apply(_a, __spreadArray([this._that], __read(args), false))).then(function (val) { return _this._deferred.resolve(val); }, function (err) { return _this._deferred.reject(err); });
            }
            catch (err) {
                this._deferred.reject(err);
            }
        }
        return this._deferred.promise;
    };
    return BindOnceFuture;
}());
export { BindOnceFuture };
//# sourceMappingURL=callback.js.map