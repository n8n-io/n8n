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
import { isTracingSuppressed } from '@opentelemetry/core';
import { B3MultiPropagator } from './B3MultiPropagator';
import { B3SinglePropagator } from './B3SinglePropagator';
import { B3_CONTEXT_HEADER } from './constants';
import { B3InjectEncoding } from './types';
/**
 * Propagator that extracts B3 context in both single and multi-header variants,
 * with configurable injection format defaulting to B3 single-header. Due to
 * the asymmetry in injection and extraction formats this is not suitable to
 * be implemented as a composite propagator.
 * Based on: https://github.com/openzipkin/b3-propagation
 */
var B3Propagator = /** @class */ (function () {
    function B3Propagator(config) {
        if (config === void 0) { config = {}; }
        this._b3MultiPropagator = new B3MultiPropagator();
        this._b3SinglePropagator = new B3SinglePropagator();
        if (config.injectEncoding === B3InjectEncoding.MULTI_HEADER) {
            this._inject = this._b3MultiPropagator.inject;
            this._fields = this._b3MultiPropagator.fields();
        }
        else {
            this._inject = this._b3SinglePropagator.inject;
            this._fields = this._b3SinglePropagator.fields();
        }
    }
    B3Propagator.prototype.inject = function (context, carrier, setter) {
        if (isTracingSuppressed(context)) {
            return;
        }
        this._inject(context, carrier, setter);
    };
    B3Propagator.prototype.extract = function (context, carrier, getter) {
        var header = getter.get(carrier, B3_CONTEXT_HEADER);
        var b3Context = Array.isArray(header) ? header[0] : header;
        if (b3Context) {
            return this._b3SinglePropagator.extract(context, carrier, getter);
        }
        else {
            return this._b3MultiPropagator.extract(context, carrier, getter);
        }
    };
    B3Propagator.prototype.fields = function () {
        return this._fields;
    };
    return B3Propagator;
}());
export { B3Propagator };
//# sourceMappingURL=B3Propagator.js.map