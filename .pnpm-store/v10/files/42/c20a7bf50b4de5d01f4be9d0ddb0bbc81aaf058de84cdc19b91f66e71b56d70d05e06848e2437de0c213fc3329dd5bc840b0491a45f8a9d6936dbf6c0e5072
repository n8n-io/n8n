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
exports.B3Propagator = void 0;
const core_1 = require("@opentelemetry/core");
const B3MultiPropagator_1 = require("./B3MultiPropagator");
const B3SinglePropagator_1 = require("./B3SinglePropagator");
const constants_1 = require("./constants");
const types_1 = require("./types");
/**
 * Propagator that extracts B3 context in both single and multi-header variants,
 * with configurable injection format defaulting to B3 single-header. Due to
 * the asymmetry in injection and extraction formats this is not suitable to
 * be implemented as a composite propagator.
 * Based on: https://github.com/openzipkin/b3-propagation
 */
class B3Propagator {
    constructor(config = {}) {
        this._b3MultiPropagator = new B3MultiPropagator_1.B3MultiPropagator();
        this._b3SinglePropagator = new B3SinglePropagator_1.B3SinglePropagator();
        if (config.injectEncoding === types_1.B3InjectEncoding.MULTI_HEADER) {
            this._inject = this._b3MultiPropagator.inject;
            this._fields = this._b3MultiPropagator.fields();
        }
        else {
            this._inject = this._b3SinglePropagator.inject;
            this._fields = this._b3SinglePropagator.fields();
        }
    }
    inject(context, carrier, setter) {
        if ((0, core_1.isTracingSuppressed)(context)) {
            return;
        }
        this._inject(context, carrier, setter);
    }
    extract(context, carrier, getter) {
        const header = getter.get(carrier, constants_1.B3_CONTEXT_HEADER);
        const b3Context = Array.isArray(header) ? header[0] : header;
        if (b3Context) {
            return this._b3SinglePropagator.extract(context, carrier, getter);
        }
        else {
            return this._b3MultiPropagator.extract(context, carrier, getter);
        }
    }
    fields() {
        return this._fields;
    }
}
exports.B3Propagator = B3Propagator;
//# sourceMappingURL=B3Propagator.js.map