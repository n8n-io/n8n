"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongooseInstrumentation = exports._ALREADY_INSTRUMENTED = exports._STORED_PARENT_SPAN = void 0;
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
const api_1 = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
const utils_1 = require("./utils");
const instrumentation_1 = require("@opentelemetry/instrumentation");
/** @knipignore */
const version_1 = require("./version");
const semconv_1 = require("./semconv");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const contextCaptureFunctionsCommon = [
    'deleteOne',
    'deleteMany',
    'find',
    'findOne',
    'estimatedDocumentCount',
    'countDocuments',
    'distinct',
    'where',
    '$where',
    'findOneAndUpdate',
    'findOneAndDelete',
    'findOneAndReplace',
];
const contextCaptureFunctions6 = [
    'remove',
    'count',
    'findOneAndRemove',
    ...contextCaptureFunctionsCommon,
];
const contextCaptureFunctions7 = [
    'count',
    'findOneAndRemove',
    ...contextCaptureFunctionsCommon,
];
const contextCaptureFunctions8 = [...contextCaptureFunctionsCommon];
function getContextCaptureFunctions(moduleVersion) {
    /* istanbul ignore next */
    if (!moduleVersion) {
        return contextCaptureFunctionsCommon;
    }
    else if (moduleVersion.startsWith('6.') || moduleVersion.startsWith('5.')) {
        return contextCaptureFunctions6;
    }
    else if (moduleVersion.startsWith('7.')) {
        return contextCaptureFunctions7;
    }
    else {
        return contextCaptureFunctions8;
    }
}
function instrumentRemove(moduleVersion) {
    return ((moduleVersion &&
        (moduleVersion.startsWith('5.') || moduleVersion.startsWith('6.'))) ||
        false);
}
/**
 * 8.21.0 changed Document.updateOne/deleteOne so that the Query is not fully built when Query.exec() is called.
 * @param moduleVersion
 */
function needsDocumentMethodPatch(moduleVersion) {
    if (!moduleVersion || !moduleVersion.startsWith('8.')) {
        return false;
    }
    const minor = parseInt(moduleVersion.split('.')[1], 10);
    return minor >= 21;
}
// when mongoose functions are called, we store the original call context
// and then set it as the parent for the spans created by Query/Aggregate exec()
// calls. this bypass the unlinked spans issue on thenables await operations.
exports._STORED_PARENT_SPAN = Symbol('stored-parent-span');
// Prevents double-instrumentation when doc.updateOne/deleteOne (Mongoose 8.21.0+)
// creates a span and returns a Query that also calls exec()
exports._ALREADY_INSTRUMENTED = Symbol('already-instrumented');
class MongooseInstrumentation extends instrumentation_1.InstrumentationBase {
    _netSemconvStability;
    _dbSemconvStability;
    constructor(config = {}) {
        super(version_1.PACKAGE_NAME, version_1.PACKAGE_VERSION, config);
        this._setSemconvStabilityFromEnv();
    }
    // Used for testing.
    _setSemconvStabilityFromEnv() {
        this._netSemconvStability = (0, instrumentation_1.semconvStabilityFromStr)('http', process.env.OTEL_SEMCONV_STABILITY_OPT_IN);
        this._dbSemconvStability = (0, instrumentation_1.semconvStabilityFromStr)('database', process.env.OTEL_SEMCONV_STABILITY_OPT_IN);
    }
    init() {
        const module = new instrumentation_1.InstrumentationNodeModuleDefinition('mongoose', ['>=5.9.7 <9'], this.patch.bind(this), this.unpatch.bind(this));
        return module;
    }
    patch(module, moduleVersion) {
        const moduleExports = module[Symbol.toStringTag] === 'Module'
            ? module.default // ESM
            : module; // CommonJS
        this._wrap(moduleExports.Model.prototype, 'save', this.patchOnModelMethods('save', moduleVersion));
        // mongoose applies this code on module require:
        // Model.prototype.$save = Model.prototype.save;
        // which captures the save function before it is patched.
        // so we need to apply the same logic after instrumenting the save function.
        moduleExports.Model.prototype.$save = moduleExports.Model.prototype.save;
        if (instrumentRemove(moduleVersion)) {
            this._wrap(moduleExports.Model.prototype, 'remove', this.patchOnModelMethods('remove', moduleVersion));
        }
        // Mongoose 8.21.0+ changed Document.updateOne()/deleteOne() so that the Query is not fully built when Query.exec() is called.
        //
        // See https://github.com/Automattic/mongoose/blob/7dbda12dca1bd7adb9e270d7de8ac5229606ce72/lib/document.js#L861.
        // - `this` is a Query object
        // - the update happens in a pre-hook that gets called when Query.exec() is already running.
        // - when we instrument Query.exec(), we don't have access to the options yet as they get set during Query.exec() only.
        //
        // Unfortunately, after Query.exec() is finished, the options are left modified by the library, so just delaying
        // attaching the attributes after the span is done is not an option. Therefore, we patch Model methods
        // and grab the data directly where the user provides it.
        //
        // ref: https://github.com/Automattic/mongoose/pull/15908 (introduced this behavior)
        if (needsDocumentMethodPatch(moduleVersion)) {
            this._wrap(moduleExports.Model.prototype, 'updateOne', this._patchDocumentUpdateMethods('updateOne', moduleVersion));
            this._wrap(moduleExports.Model.prototype, 'deleteOne', this._patchDocumentUpdateMethods('deleteOne', moduleVersion));
        }
        this._wrap(moduleExports.Query.prototype, 'exec', this.patchQueryExec(moduleVersion));
        this._wrap(moduleExports.Aggregate.prototype, 'exec', this.patchAggregateExec(moduleVersion));
        const contextCaptureFunctions = getContextCaptureFunctions(moduleVersion);
        contextCaptureFunctions.forEach((funcName) => {
            this._wrap(moduleExports.Query.prototype, funcName, this.patchAndCaptureSpanContext(funcName));
        });
        this._wrap(moduleExports.Model, 'aggregate', this.patchModelAggregate());
        this._wrap(moduleExports.Model, 'insertMany', this.patchModelStatic('insertMany', moduleVersion));
        this._wrap(moduleExports.Model, 'bulkWrite', this.patchModelStatic('bulkWrite', moduleVersion));
        return moduleExports;
    }
    unpatch(module, moduleVersion) {
        const moduleExports = module[Symbol.toStringTag] === 'Module'
            ? module.default // ESM
            : module; // CommonJS
        const contextCaptureFunctions = getContextCaptureFunctions(moduleVersion);
        this._unwrap(moduleExports.Model.prototype, 'save');
        // revert the patch for $save which we applied by aliasing it to patched `save`
        moduleExports.Model.prototype.$save = moduleExports.Model.prototype.save;
        if (instrumentRemove(moduleVersion)) {
            this._unwrap(moduleExports.Model.prototype, 'remove');
        }
        if (needsDocumentMethodPatch(moduleVersion)) {
            this._unwrap(moduleExports.Model.prototype, 'updateOne');
            this._unwrap(moduleExports.Model.prototype, 'deleteOne');
        }
        this._unwrap(moduleExports.Query.prototype, 'exec');
        this._unwrap(moduleExports.Aggregate.prototype, 'exec');
        contextCaptureFunctions.forEach((funcName) => {
            this._unwrap(moduleExports.Query.prototype, funcName);
        });
        this._unwrap(moduleExports.Model, 'aggregate');
        this._unwrap(moduleExports.Model, 'insertMany');
        this._unwrap(moduleExports.Model, 'bulkWrite');
    }
    patchAggregateExec(moduleVersion) {
        const self = this;
        return (originalAggregate) => {
            return function exec(callback) {
                if (self.getConfig().requireParentSpan &&
                    api_1.trace.getSpan(api_1.context.active()) === undefined) {
                    return originalAggregate.apply(this, arguments);
                }
                const parentSpan = this[exports._STORED_PARENT_SPAN];
                const attributes = {};
                const { dbStatementSerializer } = self.getConfig();
                if (dbStatementSerializer) {
                    const statement = dbStatementSerializer('aggregate', {
                        options: this.options,
                        aggregatePipeline: this._pipeline,
                    });
                    if (self._dbSemconvStability & instrumentation_1.SemconvStability.OLD) {
                        attributes[semconv_1.ATTR_DB_STATEMENT] = statement;
                    }
                    if (self._dbSemconvStability & instrumentation_1.SemconvStability.STABLE) {
                        attributes[semantic_conventions_1.ATTR_DB_QUERY_TEXT] = statement;
                    }
                }
                const span = self._startSpan(this._model.collection, this._model?.modelName, 'aggregate', attributes, parentSpan);
                return self._handleResponse(span, originalAggregate, this, arguments, callback, moduleVersion);
            };
        };
    }
    patchQueryExec(moduleVersion) {
        const self = this;
        return (originalExec) => {
            return function exec(callback) {
                // Skip if already instrumented by document instance method patch
                if (this[exports._ALREADY_INSTRUMENTED]) {
                    return originalExec.apply(this, arguments);
                }
                if (self.getConfig().requireParentSpan &&
                    api_1.trace.getSpan(api_1.context.active()) === undefined) {
                    return originalExec.apply(this, arguments);
                }
                const parentSpan = this[exports._STORED_PARENT_SPAN];
                const attributes = {};
                const { dbStatementSerializer } = self.getConfig();
                if (dbStatementSerializer) {
                    const statement = dbStatementSerializer(this.op, {
                        // Use public API methods (getFilter/getOptions) for better compatibility
                        condition: this.getFilter?.() ?? this._conditions,
                        updates: this._update,
                        options: this.getOptions?.() ?? this.options,
                        fields: this._fields,
                    });
                    if (self._dbSemconvStability & instrumentation_1.SemconvStability.OLD) {
                        attributes[semconv_1.ATTR_DB_STATEMENT] = statement;
                    }
                    if (self._dbSemconvStability & instrumentation_1.SemconvStability.STABLE) {
                        attributes[semantic_conventions_1.ATTR_DB_QUERY_TEXT] = statement;
                    }
                }
                const span = self._startSpan(this.mongooseCollection, this.model.modelName, this.op, attributes, parentSpan);
                return self._handleResponse(span, originalExec, this, arguments, callback, moduleVersion);
            };
        };
    }
    patchOnModelMethods(op, moduleVersion) {
        const self = this;
        return (originalOnModelFunction) => {
            return function method(options, callback) {
                if (self.getConfig().requireParentSpan &&
                    api_1.trace.getSpan(api_1.context.active()) === undefined) {
                    return originalOnModelFunction.apply(this, arguments);
                }
                const serializePayload = { document: this };
                if (options && !(options instanceof Function)) {
                    serializePayload.options = options;
                }
                const attributes = {};
                const { dbStatementSerializer } = self.getConfig();
                if (dbStatementSerializer) {
                    const statement = dbStatementSerializer(op, serializePayload);
                    if (self._dbSemconvStability & instrumentation_1.SemconvStability.OLD) {
                        attributes[semconv_1.ATTR_DB_STATEMENT] = statement;
                    }
                    if (self._dbSemconvStability & instrumentation_1.SemconvStability.STABLE) {
                        attributes[semantic_conventions_1.ATTR_DB_QUERY_TEXT] = statement;
                    }
                }
                const span = self._startSpan(this.constructor.collection, this.constructor.modelName, op, attributes);
                if (options instanceof Function) {
                    callback = options;
                    options = undefined;
                }
                return self._handleResponse(span, originalOnModelFunction, this, arguments, callback, moduleVersion);
            };
        };
    }
    // Patch document instance methods (doc.updateOne/deleteOne) for Mongoose 8.21.0+.
    _patchDocumentUpdateMethods(op, moduleVersion) {
        const self = this;
        return (originalMethod) => {
            return function method(update, options, callback) {
                if (self.getConfig().requireParentSpan &&
                    api_1.trace.getSpan(api_1.context.active()) === undefined) {
                    return originalMethod.apply(this, arguments);
                }
                // determine actual callback since different argument patterns are allowed
                let actualCallback = callback;
                let actualUpdate = update;
                let actualOptions = options;
                if (typeof update === 'function') {
                    actualCallback = update;
                    actualUpdate = undefined;
                    actualOptions = undefined;
                }
                else if (typeof options === 'function') {
                    actualCallback = options;
                    actualOptions = undefined;
                }
                const attributes = {};
                const dbStatementSerializer = self.getConfig().dbStatementSerializer;
                if (dbStatementSerializer) {
                    const statement = dbStatementSerializer(op, {
                        // Document instance methods automatically use the document's _id as filter
                        condition: { _id: this._id },
                        updates: actualUpdate,
                        options: actualOptions,
                    });
                    if (self._dbSemconvStability & instrumentation_1.SemconvStability.OLD) {
                        attributes[semconv_1.ATTR_DB_STATEMENT] = statement;
                    }
                    if (self._dbSemconvStability & instrumentation_1.SemconvStability.STABLE) {
                        attributes[semantic_conventions_1.ATTR_DB_QUERY_TEXT] = statement;
                    }
                }
                const span = self._startSpan(this.constructor.collection, this.constructor.modelName, op, attributes);
                const result = self._handleResponse(span, originalMethod, this, arguments, actualCallback, moduleVersion);
                // Mark returned Query to prevent double-instrumentation when exec() is eventually called
                if (result && typeof result === 'object') {
                    result[exports._ALREADY_INSTRUMENTED] = true;
                }
                return result;
            };
        };
    }
    patchModelStatic(op, moduleVersion) {
        const self = this;
        return (original) => {
            return function patchedStatic(docsOrOps, options, callback) {
                if (self.getConfig().requireParentSpan &&
                    api_1.trace.getSpan(api_1.context.active()) === undefined) {
                    return original.apply(this, arguments);
                }
                if (typeof options === 'function') {
                    callback = options;
                    options = undefined;
                }
                const serializePayload = {};
                switch (op) {
                    case 'insertMany':
                        serializePayload.documents = docsOrOps;
                        break;
                    case 'bulkWrite':
                        serializePayload.operations = docsOrOps;
                        break;
                    default:
                        serializePayload.document = docsOrOps;
                        break;
                }
                if (options !== undefined) {
                    serializePayload.options = options;
                }
                const attributes = {};
                const { dbStatementSerializer } = self.getConfig();
                if (dbStatementSerializer) {
                    const statement = dbStatementSerializer(op, serializePayload);
                    if (self._dbSemconvStability & instrumentation_1.SemconvStability.OLD) {
                        attributes[semconv_1.ATTR_DB_STATEMENT] = statement;
                    }
                    if (self._dbSemconvStability & instrumentation_1.SemconvStability.STABLE) {
                        attributes[semantic_conventions_1.ATTR_DB_QUERY_TEXT] = statement;
                    }
                }
                const span = self._startSpan(this.collection, this.modelName, op, attributes);
                return self._handleResponse(span, original, this, arguments, callback, moduleVersion);
            };
        };
    }
    // we want to capture the otel span on the object which is calling exec.
    // in the special case of aggregate, we need have no function to path
    // on the Aggregate object to capture the context on, so we patch
    // the aggregate of Model, and set the context on the Aggregate object
    patchModelAggregate() {
        const self = this;
        return (original) => {
            return function captureSpanContext() {
                const currentSpan = api_1.trace.getSpan(api_1.context.active());
                const aggregate = self._callOriginalFunction(() => original.apply(this, arguments));
                if (aggregate)
                    aggregate[exports._STORED_PARENT_SPAN] = currentSpan;
                return aggregate;
            };
        };
    }
    patchAndCaptureSpanContext(funcName) {
        const self = this;
        return (original) => {
            return function captureSpanContext() {
                this[exports._STORED_PARENT_SPAN] = api_1.trace.getSpan(api_1.context.active());
                return self._callOriginalFunction(() => original.apply(this, arguments));
            };
        };
    }
    _startSpan(collection, modelName, operation, attributes, parentSpan) {
        const finalAttributes = {
            ...attributes,
            ...(0, utils_1.getAttributesFromCollection)(collection, this._dbSemconvStability, this._netSemconvStability),
        };
        if (this._dbSemconvStability & instrumentation_1.SemconvStability.OLD) {
            finalAttributes[semconv_1.ATTR_DB_OPERATION] = operation;
            finalAttributes[semconv_1.ATTR_DB_SYSTEM] = 'mongoose'; // keep for backwards compatibility
        }
        if (this._dbSemconvStability & instrumentation_1.SemconvStability.STABLE) {
            finalAttributes[semantic_conventions_1.ATTR_DB_OPERATION_NAME] = operation;
            finalAttributes[semantic_conventions_1.ATTR_DB_SYSTEM_NAME] = semconv_1.DB_SYSTEM_NAME_VALUE_MONGODB; // actual db system name
        }
        const spanName = this._dbSemconvStability & instrumentation_1.SemconvStability.STABLE
            ? `${operation} ${collection.name}`
            : `mongoose.${modelName}.${operation}`;
        return this.tracer.startSpan(spanName, {
            kind: api_1.SpanKind.CLIENT,
            attributes: finalAttributes,
        }, parentSpan ? api_1.trace.setSpan(api_1.context.active(), parentSpan) : undefined);
    }
    _handleResponse(span, exec, originalThis, args, callback, moduleVersion = undefined) {
        const self = this;
        if (callback instanceof Function) {
            return self._callOriginalFunction(() => (0, utils_1.handleCallbackResponse)(callback, exec, originalThis, span, args, self.getConfig().responseHook, moduleVersion));
        }
        else {
            const response = self._callOriginalFunction(() => exec.apply(originalThis, args));
            return (0, utils_1.handlePromiseResponse)(response, span, self.getConfig().responseHook, moduleVersion);
        }
    }
    _callOriginalFunction(originalFunction) {
        if (this.getConfig().suppressInternalInstrumentation) {
            return api_1.context.with((0, core_1.suppressTracing)(api_1.context.active()), originalFunction);
        }
        else {
            return originalFunction();
        }
    }
}
exports.MongooseInstrumentation = MongooseInstrumentation;
//# sourceMappingURL=mongoose.js.map