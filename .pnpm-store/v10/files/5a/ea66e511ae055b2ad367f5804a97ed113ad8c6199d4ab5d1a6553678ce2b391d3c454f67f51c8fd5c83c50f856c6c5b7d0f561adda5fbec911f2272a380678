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
import { diag, } from '@opentelemetry/api';
/** Combines multiple propagators into a single propagator. */
var CompositePropagator = /** @class */ (function () {
    /**
     * Construct a composite propagator from a list of propagators.
     *
     * @param [config] Configuration object for composite propagator
     */
    function CompositePropagator(config) {
        if (config === void 0) { config = {}; }
        var _a;
        this._propagators = (_a = config.propagators) !== null && _a !== void 0 ? _a : [];
        this._fields = Array.from(new Set(this._propagators
            // older propagators may not have fields function, null check to be sure
            .map(function (p) { return (typeof p.fields === 'function' ? p.fields() : []); })
            .reduce(function (x, y) { return x.concat(y); }, [])));
    }
    /**
     * Run each of the configured propagators with the given context and carrier.
     * Propagators are run in the order they are configured, so if multiple
     * propagators write the same carrier key, the propagator later in the list
     * will "win".
     *
     * @param context Context to inject
     * @param carrier Carrier into which context will be injected
     */
    CompositePropagator.prototype.inject = function (context, carrier, setter) {
        var e_1, _a;
        try {
            for (var _b = __values(this._propagators), _c = _b.next(); !_c.done; _c = _b.next()) {
                var propagator = _c.value;
                try {
                    propagator.inject(context, carrier, setter);
                }
                catch (err) {
                    diag.warn("Failed to inject with " + propagator.constructor.name + ". Err: " + err.message);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
    };
    /**
     * Run each of the configured propagators with the given context and carrier.
     * Propagators are run in the order they are configured, so if multiple
     * propagators write the same context key, the propagator later in the list
     * will "win".
     *
     * @param context Context to add values to
     * @param carrier Carrier from which to extract context
     */
    CompositePropagator.prototype.extract = function (context, carrier, getter) {
        return this._propagators.reduce(function (ctx, propagator) {
            try {
                return propagator.extract(ctx, carrier, getter);
            }
            catch (err) {
                diag.warn("Failed to inject with " + propagator.constructor.name + ". Err: " + err.message);
            }
            return ctx;
        }, context);
    };
    CompositePropagator.prototype.fields = function () {
        // return a new array so our fields cannot be modified
        return this._fields.slice();
    };
    return CompositePropagator;
}());
export { CompositePropagator };
//# sourceMappingURL=composite.js.map