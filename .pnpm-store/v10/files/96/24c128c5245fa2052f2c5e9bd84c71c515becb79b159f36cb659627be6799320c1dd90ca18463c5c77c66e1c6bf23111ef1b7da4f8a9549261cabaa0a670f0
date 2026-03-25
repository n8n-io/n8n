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
exports.DataloaderInstrumentation = void 0;
const instrumentation_1 = require("@opentelemetry/instrumentation");
const api_1 = require("@opentelemetry/api");
/** @knipignore */
const version_1 = require("./version");
const MODULE_NAME = 'dataloader';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractModuleExports(module) {
    return module[Symbol.toStringTag] === 'Module'
        ? module.default // ESM
        : module; // CommonJS
}
class DataloaderInstrumentation extends instrumentation_1.InstrumentationBase {
    constructor(config = {}) {
        super(version_1.PACKAGE_NAME, version_1.PACKAGE_VERSION, config);
    }
    init() {
        return [
            new instrumentation_1.InstrumentationNodeModuleDefinition(MODULE_NAME, ['>=2.0.0 <3'], module => {
                const dataloader = extractModuleExports(module);
                this._patchLoad(dataloader.prototype);
                this._patchLoadMany(dataloader.prototype);
                this._patchPrime(dataloader.prototype);
                this._patchClear(dataloader.prototype);
                this._patchClearAll(dataloader.prototype);
                return this._getPatchedConstructor(dataloader);
            }, module => {
                const dataloader = extractModuleExports(module);
                ['load', 'loadMany', 'prime', 'clear', 'clearAll'].forEach(method => {
                    if ((0, instrumentation_1.isWrapped)(dataloader.prototype[method])) {
                        this._unwrap(dataloader.prototype, method);
                    }
                });
            }),
        ];
    }
    shouldCreateSpans() {
        const config = this.getConfig();
        const hasParentSpan = api_1.trace.getSpan(api_1.context.active()) !== undefined;
        return hasParentSpan || !config.requireParentSpan;
    }
    getSpanName(dataloader, operation) {
        const dataloaderName = dataloader.name;
        if (dataloaderName === undefined || dataloaderName === null) {
            return `${MODULE_NAME}.${operation}`;
        }
        return `${MODULE_NAME}.${operation} ${dataloaderName}`;
    }
    _wrapBatchLoadFn(batchLoadFn) {
        const instrumentation = this;
        return function patchedBatchLoadFn(...args) {
            if (!instrumentation.isEnabled() ||
                !instrumentation.shouldCreateSpans()) {
                return batchLoadFn.call(this, ...args);
            }
            const parent = api_1.context.active();
            const span = instrumentation.tracer.startSpan(instrumentation.getSpanName(this, 'batch'), { links: this._batch?.spanLinks }, parent);
            return api_1.context.with(api_1.trace.setSpan(parent, span), () => {
                return batchLoadFn.apply(this, args)
                    .then(value => {
                    span.end();
                    return value;
                })
                    .catch(err => {
                    span.recordException(err);
                    span.setStatus({
                        code: api_1.SpanStatusCode.ERROR,
                        message: err.message,
                    });
                    span.end();
                    throw err;
                });
            });
        };
    }
    _getPatchedConstructor(constructor) {
        const instrumentation = this;
        const prototype = constructor.prototype;
        if (!instrumentation.isEnabled()) {
            return constructor;
        }
        function PatchedDataloader(...args) {
            // BatchLoadFn is the first constructor argument
            // https://github.com/graphql/dataloader/blob/77c2cd7ca97e8795242018ebc212ce2487e729d2/src/index.js#L47
            if (typeof args[0] === 'function') {
                if ((0, instrumentation_1.isWrapped)(args[0])) {
                    instrumentation._unwrap(args, 0);
                }
                args[0] = instrumentation._wrapBatchLoadFn(args[0]);
            }
            return constructor.apply(this, args);
        }
        PatchedDataloader.prototype = prototype;
        return PatchedDataloader;
    }
    _patchLoad(proto) {
        if ((0, instrumentation_1.isWrapped)(proto.load)) {
            this._unwrap(proto, 'load');
        }
        this._wrap(proto, 'load', this._getPatchedLoad.bind(this));
    }
    _getPatchedLoad(original) {
        const instrumentation = this;
        return function patchedLoad(...args) {
            if (!instrumentation.shouldCreateSpans()) {
                return original.call(this, ...args);
            }
            const parent = api_1.context.active();
            const span = instrumentation.tracer.startSpan(instrumentation.getSpanName(this, 'load'), { kind: api_1.SpanKind.CLIENT }, parent);
            return api_1.context.with(api_1.trace.setSpan(parent, span), () => {
                const result = original
                    .call(this, ...args)
                    .then(value => {
                    span.end();
                    return value;
                })
                    .catch(err => {
                    span.recordException(err);
                    span.setStatus({
                        code: api_1.SpanStatusCode.ERROR,
                        message: err.message,
                    });
                    span.end();
                    throw err;
                });
                const loader = this;
                if (loader._batch) {
                    if (!loader._batch.spanLinks) {
                        loader._batch.spanLinks = [];
                    }
                    loader._batch.spanLinks.push({ context: span.spanContext() });
                }
                return result;
            });
        };
    }
    _patchLoadMany(proto) {
        if ((0, instrumentation_1.isWrapped)(proto.loadMany)) {
            this._unwrap(proto, 'loadMany');
        }
        this._wrap(proto, 'loadMany', this._getPatchedLoadMany.bind(this));
    }
    _getPatchedLoadMany(original) {
        const instrumentation = this;
        return function patchedLoadMany(...args) {
            if (!instrumentation.shouldCreateSpans()) {
                return original.call(this, ...args);
            }
            const parent = api_1.context.active();
            const span = instrumentation.tracer.startSpan(instrumentation.getSpanName(this, 'loadMany'), { kind: api_1.SpanKind.CLIENT }, parent);
            return api_1.context.with(api_1.trace.setSpan(parent, span), () => {
                // .loadMany never rejects, as errors from internal .load
                // calls are caught by dataloader lib
                return original.call(this, ...args).then(value => {
                    span.end();
                    return value;
                });
            });
        };
    }
    _patchPrime(proto) {
        if ((0, instrumentation_1.isWrapped)(proto.prime)) {
            this._unwrap(proto, 'prime');
        }
        this._wrap(proto, 'prime', this._getPatchedPrime.bind(this));
    }
    _getPatchedPrime(original) {
        const instrumentation = this;
        return function patchedPrime(...args) {
            if (!instrumentation.shouldCreateSpans()) {
                return original.call(this, ...args);
            }
            const parent = api_1.context.active();
            const span = instrumentation.tracer.startSpan(instrumentation.getSpanName(this, 'prime'), { kind: api_1.SpanKind.CLIENT }, parent);
            const ret = api_1.context.with(api_1.trace.setSpan(parent, span), () => {
                return original.call(this, ...args);
            });
            span.end();
            return ret;
        };
    }
    _patchClear(proto) {
        if ((0, instrumentation_1.isWrapped)(proto.clear)) {
            this._unwrap(proto, 'clear');
        }
        this._wrap(proto, 'clear', this._getPatchedClear.bind(this));
    }
    _getPatchedClear(original) {
        const instrumentation = this;
        return function patchedClear(...args) {
            if (!instrumentation.shouldCreateSpans()) {
                return original.call(this, ...args);
            }
            const parent = api_1.context.active();
            const span = instrumentation.tracer.startSpan(instrumentation.getSpanName(this, 'clear'), { kind: api_1.SpanKind.CLIENT }, parent);
            const ret = api_1.context.with(api_1.trace.setSpan(parent, span), () => {
                return original.call(this, ...args);
            });
            span.end();
            return ret;
        };
    }
    _patchClearAll(proto) {
        if ((0, instrumentation_1.isWrapped)(proto.clearAll)) {
            this._unwrap(proto, 'clearAll');
        }
        this._wrap(proto, 'clearAll', this._getPatchedClearAll.bind(this));
    }
    _getPatchedClearAll(original) {
        const instrumentation = this;
        return function patchedClearAll(...args) {
            if (!instrumentation.shouldCreateSpans()) {
                return original.call(this, ...args);
            }
            const parent = api_1.context.active();
            const span = instrumentation.tracer.startSpan(instrumentation.getSpanName(this, 'clearAll'), { kind: api_1.SpanKind.CLIENT }, parent);
            const ret = api_1.context.with(api_1.trace.setSpan(parent, span), () => {
                return original.call(this, ...args);
            });
            span.end();
            return ret;
        };
    }
}
exports.DataloaderInstrumentation = DataloaderInstrumentation;
//# sourceMappingURL=instrumentation.js.map