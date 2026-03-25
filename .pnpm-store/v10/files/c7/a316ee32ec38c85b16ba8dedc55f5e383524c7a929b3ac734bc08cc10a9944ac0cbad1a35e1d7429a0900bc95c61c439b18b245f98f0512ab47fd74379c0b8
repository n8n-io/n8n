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
exports.GenericPoolInstrumentation = void 0;
const api = require("@opentelemetry/api");
const instrumentation_1 = require("@opentelemetry/instrumentation");
/** @knipignore */
const version_1 = require("./version");
const MODULE_NAME = 'generic-pool';
class GenericPoolInstrumentation extends instrumentation_1.InstrumentationBase {
    // only used for v2 - v2.3)
    _isDisabled = false;
    constructor(config = {}) {
        super(version_1.PACKAGE_NAME, version_1.PACKAGE_VERSION, config);
    }
    init() {
        return [
            new instrumentation_1.InstrumentationNodeModuleDefinition(MODULE_NAME, ['>=3.0.0 <4'], moduleExports => {
                const Pool = moduleExports.Pool;
                if ((0, instrumentation_1.isWrapped)(Pool.prototype.acquire)) {
                    this._unwrap(Pool.prototype, 'acquire');
                }
                this._wrap(Pool.prototype, 'acquire', this._acquirePatcher.bind(this));
                return moduleExports;
            }, moduleExports => {
                const Pool = moduleExports.Pool;
                this._unwrap(Pool.prototype, 'acquire');
                return moduleExports;
            }),
            new instrumentation_1.InstrumentationNodeModuleDefinition(MODULE_NAME, ['>=2.4.0 <3'], moduleExports => {
                const Pool = moduleExports.Pool;
                if ((0, instrumentation_1.isWrapped)(Pool.prototype.acquire)) {
                    this._unwrap(Pool.prototype, 'acquire');
                }
                this._wrap(Pool.prototype, 'acquire', this._acquireWithCallbacksPatcher.bind(this));
                return moduleExports;
            }, moduleExports => {
                const Pool = moduleExports.Pool;
                this._unwrap(Pool.prototype, 'acquire');
                return moduleExports;
            }),
            new instrumentation_1.InstrumentationNodeModuleDefinition(MODULE_NAME, ['>=2.0.0 <2.4'], moduleExports => {
                this._isDisabled = false;
                if ((0, instrumentation_1.isWrapped)(moduleExports.Pool)) {
                    this._unwrap(moduleExports, 'Pool');
                }
                this._wrap(moduleExports, 'Pool', this._poolWrapper.bind(this));
                return moduleExports;
            }, moduleExports => {
                // since the object is created on the fly every time, we need to use
                // a boolean switch here to disable the instrumentation
                this._isDisabled = true;
                return moduleExports;
            }),
        ];
    }
    _acquirePatcher(original) {
        const instrumentation = this;
        return function wrapped_acquire(...args) {
            const parent = api.context.active();
            const span = instrumentation.tracer.startSpan('generic-pool.acquire', {}, parent);
            return api.context.with(api.trace.setSpan(parent, span), () => {
                return original.call(this, ...args).then(value => {
                    span.end();
                    return value;
                }, err => {
                    span.recordException(err);
                    span.end();
                    throw err;
                });
            });
        };
    }
    _poolWrapper(original) {
        const instrumentation = this;
        return function wrapped_pool() {
            const pool = original.apply(this, arguments);
            instrumentation._wrap(pool, 'acquire', instrumentation._acquireWithCallbacksPatcher.bind(instrumentation));
            return pool;
        };
    }
    _acquireWithCallbacksPatcher(original) {
        const instrumentation = this;
        return function wrapped_acquire(cb, priority) {
            // only used for v2 - v2.3
            if (instrumentation._isDisabled) {
                return original.call(this, cb, priority);
            }
            const parent = api.context.active();
            const span = instrumentation.tracer.startSpan('generic-pool.acquire', {}, parent);
            return api.context.with(api.trace.setSpan(parent, span), () => {
                original.call(this, (err, client) => {
                    span.end();
                    // Not checking whether cb is a function because
                    // the original code doesn't do that either.
                    if (cb) {
                        return cb(err, client);
                    }
                }, priority);
            });
        };
    }
}
exports.GenericPoolInstrumentation = GenericPoolInstrumentation;
//# sourceMappingURL=instrumentation.js.map