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
exports.FsInstrumentation = void 0;
const api = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
const instrumentation_1 = require("@opentelemetry/instrumentation");
/** @knipignore */
const version_1 = require("./version");
const constants_1 = require("./constants");
const util_1 = require("util");
const utils_1 = require("./utils");
/**
 * This is important for 2-level functions like `realpath.native` to retain the 2nd-level
 * when patching the 1st-level.
 */
function patchedFunctionWithOriginalProperties(patchedFunction, original) {
    return Object.assign(patchedFunction, original);
}
class FsInstrumentation extends instrumentation_1.InstrumentationBase {
    constructor(config = {}) {
        super(version_1.PACKAGE_NAME, version_1.PACKAGE_VERSION, config);
    }
    init() {
        return [
            new instrumentation_1.InstrumentationNodeModuleDefinition('fs', ['*'], (fs) => {
                for (const fName of constants_1.SYNC_FUNCTIONS) {
                    const { objectToPatch, functionNameToPatch } = (0, utils_1.indexFs)(fs, fName);
                    if ((0, instrumentation_1.isWrapped)(objectToPatch[functionNameToPatch])) {
                        this._unwrap(objectToPatch, functionNameToPatch);
                    }
                    this._wrap(objectToPatch, functionNameToPatch, this._patchSyncFunction.bind(this, fName));
                }
                for (const fName of constants_1.CALLBACK_FUNCTIONS) {
                    const { objectToPatch, functionNameToPatch } = (0, utils_1.indexFs)(fs, fName);
                    if ((0, instrumentation_1.isWrapped)(objectToPatch[functionNameToPatch])) {
                        this._unwrap(objectToPatch, functionNameToPatch);
                    }
                    if (fName === 'exists') {
                        // handling separately because of the inconsistent cb style:
                        // `exists` doesn't have error as the first argument, but the result
                        this._wrap(objectToPatch, functionNameToPatch, this._patchExistsCallbackFunction.bind(this, fName));
                        continue;
                    }
                    this._wrap(objectToPatch, functionNameToPatch, this._patchCallbackFunction.bind(this, fName));
                }
                for (const fName of constants_1.PROMISE_FUNCTIONS) {
                    if ((0, instrumentation_1.isWrapped)(fs.promises[fName])) {
                        this._unwrap(fs.promises, fName);
                    }
                    this._wrap(fs.promises, fName, this._patchPromiseFunction.bind(this, fName));
                }
                return fs;
            }, (fs) => {
                if (fs === undefined)
                    return;
                for (const fName of constants_1.SYNC_FUNCTIONS) {
                    const { objectToPatch, functionNameToPatch } = (0, utils_1.indexFs)(fs, fName);
                    if ((0, instrumentation_1.isWrapped)(objectToPatch[functionNameToPatch])) {
                        this._unwrap(objectToPatch, functionNameToPatch);
                    }
                }
                for (const fName of constants_1.CALLBACK_FUNCTIONS) {
                    const { objectToPatch, functionNameToPatch } = (0, utils_1.indexFs)(fs, fName);
                    if ((0, instrumentation_1.isWrapped)(objectToPatch[functionNameToPatch])) {
                        this._unwrap(objectToPatch, functionNameToPatch);
                    }
                }
                for (const fName of constants_1.PROMISE_FUNCTIONS) {
                    if ((0, instrumentation_1.isWrapped)(fs.promises[fName])) {
                        this._unwrap(fs.promises, fName);
                    }
                }
            }),
            new instrumentation_1.InstrumentationNodeModuleDefinition('fs/promises', ['*'], (fsPromises) => {
                for (const fName of constants_1.PROMISE_FUNCTIONS) {
                    if ((0, instrumentation_1.isWrapped)(fsPromises[fName])) {
                        this._unwrap(fsPromises, fName);
                    }
                    this._wrap(fsPromises, fName, this._patchPromiseFunction.bind(this, fName));
                }
                return fsPromises;
            }, (fsPromises) => {
                if (fsPromises === undefined)
                    return;
                for (const fName of constants_1.PROMISE_FUNCTIONS) {
                    if ((0, instrumentation_1.isWrapped)(fsPromises[fName])) {
                        this._unwrap(fsPromises, fName);
                    }
                }
            }),
        ];
    }
    _patchSyncFunction(functionName, original) {
        const instrumentation = this;
        const patchedFunction = function (...args) {
            const activeContext = api.context.active();
            if (!instrumentation._shouldTrace(activeContext)) {
                return original.apply(this, args);
            }
            if (instrumentation._runCreateHook(functionName, {
                args: args,
            }) === false) {
                return api.context.with((0, core_1.suppressTracing)(activeContext), original, this, ...args);
            }
            const span = instrumentation.tracer.startSpan(`fs ${functionName}`);
            try {
                // Suppress tracing for internal fs calls
                const res = api.context.with((0, core_1.suppressTracing)(api.trace.setSpan(activeContext, span)), original, this, ...args);
                instrumentation._runEndHook(functionName, { args: args, span });
                return res;
            }
            catch (error) {
                span.recordException(error);
                span.setStatus({
                    message: error.message,
                    code: api.SpanStatusCode.ERROR,
                });
                instrumentation._runEndHook(functionName, { args: args, span, error });
                throw error;
            }
            finally {
                span.end();
            }
        };
        return patchedFunctionWithOriginalProperties(patchedFunction, original);
    }
    _patchCallbackFunction(functionName, original) {
        const instrumentation = this;
        const patchedFunction = function (...args) {
            const activeContext = api.context.active();
            if (!instrumentation._shouldTrace(activeContext)) {
                return original.apply(this, args);
            }
            if (instrumentation._runCreateHook(functionName, {
                args: args,
            }) === false) {
                return api.context.with((0, core_1.suppressTracing)(activeContext), original, this, ...args);
            }
            const lastIdx = args.length - 1;
            const cb = args[lastIdx];
            if (typeof cb === 'function') {
                const span = instrumentation.tracer.startSpan(`fs ${functionName}`);
                // Return to the context active during the call in the callback
                args[lastIdx] = api.context.bind(activeContext, function (error) {
                    if (error) {
                        span.recordException(error);
                        span.setStatus({
                            message: error.message,
                            code: api.SpanStatusCode.ERROR,
                        });
                    }
                    instrumentation._runEndHook(functionName, {
                        args: args,
                        span,
                        error,
                    });
                    span.end();
                    return cb.apply(this, arguments);
                });
                try {
                    // Suppress tracing for internal fs calls
                    return api.context.with((0, core_1.suppressTracing)(api.trace.setSpan(activeContext, span)), original, this, ...args);
                }
                catch (error) {
                    span.recordException(error);
                    span.setStatus({
                        message: error.message,
                        code: api.SpanStatusCode.ERROR,
                    });
                    instrumentation._runEndHook(functionName, {
                        args: args,
                        span,
                        error,
                    });
                    span.end();
                    throw error;
                }
            }
            else {
                // TODO: what to do if we are pretty sure it's going to throw
                return original.apply(this, args);
            }
        };
        return patchedFunctionWithOriginalProperties(patchedFunction, original);
    }
    _patchExistsCallbackFunction(functionName, original) {
        const instrumentation = this;
        const patchedFunction = function (...args) {
            const activeContext = api.context.active();
            if (!instrumentation._shouldTrace(activeContext)) {
                return original.apply(this, args);
            }
            if (instrumentation._runCreateHook(functionName, {
                args: args,
            }) === false) {
                return api.context.with((0, core_1.suppressTracing)(activeContext), original, this, ...args);
            }
            const lastIdx = args.length - 1;
            const cb = args[lastIdx];
            if (typeof cb === 'function') {
                const span = instrumentation.tracer.startSpan(`fs ${functionName}`);
                // Return to the context active during the call in the callback
                args[lastIdx] = api.context.bind(activeContext, function () {
                    // `exists` never calls the callback with an error
                    instrumentation._runEndHook(functionName, {
                        args: args,
                        span,
                    });
                    span.end();
                    return cb.apply(this, arguments);
                });
                try {
                    // Suppress tracing for internal fs calls
                    return api.context.with((0, core_1.suppressTracing)(api.trace.setSpan(activeContext, span)), original, this, ...args);
                }
                catch (error) {
                    span.recordException(error);
                    span.setStatus({
                        message: error.message,
                        code: api.SpanStatusCode.ERROR,
                    });
                    instrumentation._runEndHook(functionName, {
                        args: args,
                        span,
                        error,
                    });
                    span.end();
                    throw error;
                }
            }
            else {
                return original.apply(this, args);
            }
        };
        const functionWithOriginalProperties = patchedFunctionWithOriginalProperties(patchedFunction, original);
        // `exists` has a custom promisify function because of the inconsistent signature
        // replicating that on the patched function
        const promisified = function (path) {
            return new Promise(resolve => functionWithOriginalProperties(path, resolve));
        };
        Object.defineProperty(promisified, 'name', { value: functionName });
        Object.defineProperty(functionWithOriginalProperties, util_1.promisify.custom, {
            value: promisified,
        });
        return functionWithOriginalProperties;
    }
    _patchPromiseFunction(functionName, original) {
        const instrumentation = this;
        const patchedFunction = async function (...args) {
            const activeContext = api.context.active();
            if (!instrumentation._shouldTrace(activeContext)) {
                return original.apply(this, args);
            }
            if (instrumentation._runCreateHook(functionName, {
                args: args,
            }) === false) {
                return api.context.with((0, core_1.suppressTracing)(activeContext), original, this, ...args);
            }
            const span = instrumentation.tracer.startSpan(`fs ${functionName}`);
            try {
                // Suppress tracing for internal fs calls
                const res = await api.context.with((0, core_1.suppressTracing)(api.trace.setSpan(activeContext, span)), original, this, ...args);
                instrumentation._runEndHook(functionName, { args: args, span });
                return res;
            }
            catch (error) {
                span.recordException(error);
                span.setStatus({
                    message: error.message,
                    code: api.SpanStatusCode.ERROR,
                });
                instrumentation._runEndHook(functionName, { args: args, span, error });
                throw error;
            }
            finally {
                span.end();
            }
        };
        return patchedFunctionWithOriginalProperties(patchedFunction, original);
    }
    _runCreateHook(...args) {
        const { createHook } = this.getConfig();
        if (typeof createHook === 'function') {
            try {
                return createHook(...args);
            }
            catch (e) {
                this._diag.error('caught createHook error', e);
            }
        }
        return true;
    }
    _runEndHook(...args) {
        const { endHook } = this.getConfig();
        if (typeof endHook === 'function') {
            try {
                endHook(...args);
            }
            catch (e) {
                this._diag.error('caught endHook error', e);
            }
        }
    }
    _shouldTrace(context) {
        if ((0, core_1.isTracingSuppressed)(context)) {
            // Performance optimization. Avoid creating additional contexts and spans
            // if we already know that the tracing is being suppressed.
            return false;
        }
        const { requireParentSpan } = this.getConfig();
        if (requireParentSpan) {
            const parentSpan = api.trace.getSpan(context);
            if (parentSpan == null) {
                return false;
            }
        }
        return true;
    }
}
exports.FsInstrumentation = FsInstrumentation;
//# sourceMappingURL=instrumentation.js.map