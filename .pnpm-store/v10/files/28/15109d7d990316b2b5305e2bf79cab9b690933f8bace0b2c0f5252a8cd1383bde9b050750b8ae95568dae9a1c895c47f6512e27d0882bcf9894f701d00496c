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
exports.KnexInstrumentation = void 0;
const api = require("@opentelemetry/api");
/** @knipignore */
const version_1 = require("./version");
const constants = require("./constants");
const instrumentation_1 = require("@opentelemetry/instrumentation");
const utils = require("./utils");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const semconv_1 = require("./semconv");
const contextSymbol = Symbol('opentelemetry.instrumentation-knex.context');
const DEFAULT_CONFIG = {
    maxQueryLength: 1022,
    requireParentSpan: false,
};
class KnexInstrumentation extends instrumentation_1.InstrumentationBase {
    _semconvStability;
    constructor(config = {}) {
        super(version_1.PACKAGE_NAME, version_1.PACKAGE_VERSION, { ...DEFAULT_CONFIG, ...config });
        this._semconvStability = (0, instrumentation_1.semconvStabilityFromStr)('database', process.env.OTEL_SEMCONV_STABILITY_OPT_IN);
    }
    setConfig(config = {}) {
        super.setConfig({ ...DEFAULT_CONFIG, ...config });
    }
    init() {
        const module = new instrumentation_1.InstrumentationNodeModuleDefinition(constants.MODULE_NAME, constants.SUPPORTED_VERSIONS);
        module.files.push(this.getClientNodeModuleFileInstrumentation('src'), this.getClientNodeModuleFileInstrumentation('lib'), this.getRunnerNodeModuleFileInstrumentation('src'), this.getRunnerNodeModuleFileInstrumentation('lib'), this.getRunnerNodeModuleFileInstrumentation('lib/execution'));
        return module;
    }
    getRunnerNodeModuleFileInstrumentation(basePath) {
        return new instrumentation_1.InstrumentationNodeModuleFile(`knex/${basePath}/runner.js`, constants.SUPPORTED_VERSIONS, (Runner, moduleVersion) => {
            this.ensureWrapped(Runner.prototype, 'query', this.createQueryWrapper(moduleVersion));
            return Runner;
        }, (Runner, moduleVersion) => {
            this._unwrap(Runner.prototype, 'query');
            return Runner;
        });
    }
    getClientNodeModuleFileInstrumentation(basePath) {
        return new instrumentation_1.InstrumentationNodeModuleFile(`knex/${basePath}/client.js`, constants.SUPPORTED_VERSIONS, (Client) => {
            this.ensureWrapped(Client.prototype, 'queryBuilder', this.storeContext.bind(this));
            this.ensureWrapped(Client.prototype, 'schemaBuilder', this.storeContext.bind(this));
            this.ensureWrapped(Client.prototype, 'raw', this.storeContext.bind(this));
            return Client;
        }, (Client) => {
            this._unwrap(Client.prototype, 'queryBuilder');
            this._unwrap(Client.prototype, 'schemaBuilder');
            this._unwrap(Client.prototype, 'raw');
            return Client;
        });
    }
    createQueryWrapper(moduleVersion) {
        const instrumentation = this;
        return function wrapQuery(original) {
            return function wrapped_logging_method(query) {
                const config = this.client.config;
                const table = utils.extractTableName(this.builder);
                // `method` actually refers to the knex API method - Not exactly "operation"
                // in the spec sense, but matches most of the time.
                const operation = query?.method;
                const name = config?.connection?.filename || config?.connection?.database;
                const { maxQueryLength } = instrumentation.getConfig();
                const attributes = {
                    'knex.version': moduleVersion,
                };
                const transport = config?.connection?.filename === ':memory:' ? 'inproc' : undefined;
                if (instrumentation._semconvStability & instrumentation_1.SemconvStability.OLD) {
                    Object.assign(attributes, {
                        [semconv_1.ATTR_DB_SYSTEM]: utils.mapSystem(this.client.driverName),
                        [semconv_1.ATTR_DB_SQL_TABLE]: table,
                        [semconv_1.ATTR_DB_OPERATION]: operation,
                        [semconv_1.ATTR_DB_USER]: config?.connection?.user,
                        [semconv_1.ATTR_DB_NAME]: name,
                        [semconv_1.ATTR_NET_PEER_NAME]: config?.connection?.host,
                        [semconv_1.ATTR_NET_PEER_PORT]: config?.connection?.port,
                        [semconv_1.ATTR_NET_TRANSPORT]: transport,
                    });
                }
                if (instrumentation._semconvStability & instrumentation_1.SemconvStability.STABLE) {
                    Object.assign(attributes, {
                        [semantic_conventions_1.ATTR_DB_SYSTEM_NAME]: utils.mapSystem(this.client.driverName),
                        [semantic_conventions_1.ATTR_DB_COLLECTION_NAME]: table,
                        [semantic_conventions_1.ATTR_DB_OPERATION_NAME]: operation,
                        [semantic_conventions_1.ATTR_DB_NAMESPACE]: name,
                        [semantic_conventions_1.ATTR_SERVER_ADDRESS]: config?.connection?.host,
                        [semantic_conventions_1.ATTR_SERVER_PORT]: config?.connection?.port,
                    });
                }
                if (maxQueryLength) {
                    // filters both undefined and 0
                    const queryText = utils.limitLength(query?.sql, maxQueryLength);
                    if (instrumentation._semconvStability & instrumentation_1.SemconvStability.STABLE) {
                        attributes[semantic_conventions_1.ATTR_DB_QUERY_TEXT] = queryText;
                    }
                    if (instrumentation._semconvStability & instrumentation_1.SemconvStability.OLD) {
                        attributes[semconv_1.ATTR_DB_STATEMENT] = queryText;
                    }
                }
                const parentContext = this.builder[contextSymbol] || api.context.active();
                const parentSpan = api.trace.getSpan(parentContext);
                const hasActiveParent = parentSpan && api.trace.isSpanContextValid(parentSpan.spanContext());
                if (instrumentation._config.requireParentSpan && !hasActiveParent) {
                    return original.bind(this)(...arguments);
                }
                const span = instrumentation.tracer.startSpan(utils.getName(name, operation, table), {
                    kind: api.SpanKind.CLIENT,
                    attributes,
                }, parentContext);
                const spanContext = api.trace.setSpan(api.context.active(), span);
                return api.context
                    .with(spanContext, original, this, ...arguments)
                    .then((result) => {
                    span.end();
                    return result;
                })
                    .catch((err) => {
                    // knex adds full query with all the binding values to the message,
                    // we want to undo that without changing the original error
                    const formatter = utils.getFormatter(this);
                    const fullQuery = formatter(query.sql, query.bindings || []);
                    const message = err.message.replace(fullQuery + ' - ', '');
                    const exc = utils.otelExceptionFromKnexError(err, message);
                    span.recordException(exc);
                    span.setStatus({ code: api.SpanStatusCode.ERROR, message });
                    span.end();
                    throw err;
                });
            };
        };
    }
    storeContext(original) {
        return function wrapped_logging_method() {
            const builder = original.apply(this, arguments);
            // Builder is a custom promise type and when awaited it fails to propagate context.
            // We store the parent context at the moment of initiating the builder
            // otherwise we'd have nothing to attach the span as a child for in `query`.
            Object.defineProperty(builder, contextSymbol, {
                value: api.context.active(),
            });
            return builder;
        };
    }
    ensureWrapped(obj, methodName, wrapper) {
        if ((0, instrumentation_1.isWrapped)(obj[methodName])) {
            this._unwrap(obj, methodName);
        }
        this._wrap(obj, methodName, wrapper);
    }
}
exports.KnexInstrumentation = KnexInstrumentation;
//# sourceMappingURL=instrumentation.js.map