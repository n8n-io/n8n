"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PgInstrumentation = void 0;
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
const instrumentation_1 = require("@opentelemetry/instrumentation");
const api_1 = require("@opentelemetry/api");
const internal_types_1 = require("./internal-types");
const utils = require("./utils");
const sql_common_1 = require("@opentelemetry/sql-common");
/** @knipignore */
const version_1 = require("./version");
const SpanNames_1 = require("./enums/SpanNames");
const core_1 = require("@opentelemetry/core");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const semconv_1 = require("./semconv");
function extractModuleExports(module) {
    return module[Symbol.toStringTag] === 'Module'
        ? module.default // ESM
        : module; // CommonJS
}
class PgInstrumentation extends instrumentation_1.InstrumentationBase {
    // Pool events connect, acquire, release and remove can be called
    // multiple times without changing the values of total, idle and waiting
    // connections. The _connectionsCounter is used to keep track of latest
    // values and only update the metrics _connectionsCount and _connectionPendingRequests
    // when the value change.
    _connectionsCounter = {
        used: 0,
        idle: 0,
        pending: 0,
    };
    _semconvStability;
    constructor(config = {}) {
        super(version_1.PACKAGE_NAME, version_1.PACKAGE_VERSION, config);
        this._semconvStability = (0, instrumentation_1.semconvStabilityFromStr)('database', process.env.OTEL_SEMCONV_STABILITY_OPT_IN);
    }
    _updateMetricInstruments() {
        this._operationDuration = this.meter.createHistogram(semantic_conventions_1.METRIC_DB_CLIENT_OPERATION_DURATION, {
            description: 'Duration of database client operations.',
            unit: 's',
            valueType: api_1.ValueType.DOUBLE,
            advice: {
                explicitBucketBoundaries: [
                    0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10,
                ],
            },
        });
        this._connectionsCounter = {
            idle: 0,
            pending: 0,
            used: 0,
        };
        this._connectionsCount = this.meter.createUpDownCounter(semconv_1.METRIC_DB_CLIENT_CONNECTION_COUNT, {
            description: 'The number of connections that are currently in state described by the state attribute.',
            unit: '{connection}',
        });
        this._connectionPendingRequests = this.meter.createUpDownCounter(semconv_1.METRIC_DB_CLIENT_CONNECTION_PENDING_REQUESTS, {
            description: 'The number of current pending requests for an open connection.',
            unit: '{connection}',
        });
    }
    init() {
        const SUPPORTED_PG_VERSIONS = ['>=8.0.3 <9'];
        const SUPPORTED_PG_POOL_VERSIONS = ['>=2.0.0 <4'];
        const modulePgNativeClient = new instrumentation_1.InstrumentationNodeModuleFile('pg/lib/native/client.js', SUPPORTED_PG_VERSIONS, this._patchPgClient.bind(this), this._unpatchPgClient.bind(this));
        const modulePgClient = new instrumentation_1.InstrumentationNodeModuleFile('pg/lib/client.js', SUPPORTED_PG_VERSIONS, this._patchPgClient.bind(this), this._unpatchPgClient.bind(this));
        const modulePG = new instrumentation_1.InstrumentationNodeModuleDefinition('pg', SUPPORTED_PG_VERSIONS, (module) => {
            const moduleExports = extractModuleExports(module);
            this._patchPgClient(moduleExports.Client);
            return module;
        }, (module) => {
            const moduleExports = extractModuleExports(module);
            this._unpatchPgClient(moduleExports.Client);
            return module;
        }, [modulePgClient, modulePgNativeClient]);
        const modulePGPool = new instrumentation_1.InstrumentationNodeModuleDefinition('pg-pool', SUPPORTED_PG_POOL_VERSIONS, (module) => {
            const moduleExports = extractModuleExports(module);
            if ((0, instrumentation_1.isWrapped)(moduleExports.prototype.connect)) {
                this._unwrap(moduleExports.prototype, 'connect');
            }
            this._wrap(moduleExports.prototype, 'connect', this._getPoolConnectPatch());
            return moduleExports;
        }, (module) => {
            const moduleExports = extractModuleExports(module);
            if ((0, instrumentation_1.isWrapped)(moduleExports.prototype.connect)) {
                this._unwrap(moduleExports.prototype, 'connect');
            }
        });
        return [modulePG, modulePGPool];
    }
    _patchPgClient(module) {
        if (!module) {
            return;
        }
        const moduleExports = extractModuleExports(module);
        if ((0, instrumentation_1.isWrapped)(moduleExports.prototype.query)) {
            this._unwrap(moduleExports.prototype, 'query');
        }
        if ((0, instrumentation_1.isWrapped)(moduleExports.prototype.connect)) {
            this._unwrap(moduleExports.prototype, 'connect');
        }
        this._wrap(moduleExports.prototype, 'query', this._getClientQueryPatch());
        this._wrap(moduleExports.prototype, 'connect', this._getClientConnectPatch());
        return module;
    }
    _unpatchPgClient(module) {
        const moduleExports = extractModuleExports(module);
        if ((0, instrumentation_1.isWrapped)(moduleExports.prototype.query)) {
            this._unwrap(moduleExports.prototype, 'query');
        }
        if ((0, instrumentation_1.isWrapped)(moduleExports.prototype.connect)) {
            this._unwrap(moduleExports.prototype, 'connect');
        }
        return module;
    }
    _getClientConnectPatch() {
        const plugin = this;
        return (original) => {
            return function connect(callback) {
                const config = plugin.getConfig();
                if (utils.shouldSkipInstrumentation(config) ||
                    config.ignoreConnectSpans) {
                    return original.call(this, callback);
                }
                const span = plugin.tracer.startSpan(SpanNames_1.SpanNames.CONNECT, {
                    kind: api_1.SpanKind.CLIENT,
                    attributes: utils.getSemanticAttributesFromConnection(this, plugin._semconvStability),
                });
                if (callback) {
                    const parentSpan = api_1.trace.getSpan(api_1.context.active());
                    callback = utils.patchClientConnectCallback(span, callback);
                    if (parentSpan) {
                        callback = api_1.context.bind(api_1.context.active(), callback);
                    }
                }
                const connectResult = api_1.context.with(api_1.trace.setSpan(api_1.context.active(), span), () => {
                    return original.call(this, callback);
                });
                return handleConnectResult(span, connectResult);
            };
        };
    }
    recordOperationDuration(attributes, startTime) {
        const metricsAttributes = {};
        const keysToCopy = [
            semantic_conventions_1.ATTR_DB_NAMESPACE,
            semantic_conventions_1.ATTR_ERROR_TYPE,
            semantic_conventions_1.ATTR_SERVER_PORT,
            semantic_conventions_1.ATTR_SERVER_ADDRESS,
            semantic_conventions_1.ATTR_DB_OPERATION_NAME,
        ];
        if (this._semconvStability & instrumentation_1.SemconvStability.OLD) {
            keysToCopy.push(semconv_1.ATTR_DB_SYSTEM);
        }
        if (this._semconvStability & instrumentation_1.SemconvStability.STABLE) {
            keysToCopy.push(semantic_conventions_1.ATTR_DB_SYSTEM_NAME);
        }
        keysToCopy.forEach(key => {
            if (key in attributes) {
                metricsAttributes[key] = attributes[key];
            }
        });
        const durationSeconds = (0, core_1.hrTimeToMilliseconds)((0, core_1.hrTimeDuration)(startTime, (0, core_1.hrTime)())) / 1000;
        this._operationDuration.record(durationSeconds, metricsAttributes);
    }
    _getClientQueryPatch() {
        const plugin = this;
        return (original) => {
            this._diag.debug('Patching pg.Client.prototype.query');
            return function query(...args) {
                if (utils.shouldSkipInstrumentation(plugin.getConfig())) {
                    return original.apply(this, args);
                }
                const startTime = (0, core_1.hrTime)();
                // client.query(text, cb?), client.query(text, values, cb?), and
                // client.query(configObj, cb?) are all valid signatures. We construct
                // a queryConfig obj from all (valid) signatures to build the span in a
                // unified way. We verify that we at least have query text, and code
                // defensively when dealing with `queryConfig` after that (to handle all
                // the other invalid cases, like a non-array for values being provided).
                // The type casts here reflect only what we've actually validated.
                const arg0 = args[0];
                const firstArgIsString = typeof arg0 === 'string';
                const firstArgIsQueryObjectWithText = utils.isObjectWithTextString(arg0);
                // TODO: remove the `as ...` casts below when the TS version is upgraded.
                // Newer TS versions will use the result of firstArgIsQueryObjectWithText
                // to properly narrow arg0, but TS 4.3.5 does not.
                const queryConfig = firstArgIsString
                    ? {
                        text: arg0,
                        values: Array.isArray(args[1]) ? args[1] : undefined,
                    }
                    : firstArgIsQueryObjectWithText
                        ? {
                            ...arg0,
                            name: arg0.name,
                            text: arg0.text,
                            values: arg0.values ??
                                (Array.isArray(args[1]) ? args[1] : undefined),
                        }
                        : undefined;
                const attributes = {
                    [semconv_1.ATTR_DB_SYSTEM]: semconv_1.DB_SYSTEM_VALUE_POSTGRESQL,
                    [semantic_conventions_1.ATTR_DB_NAMESPACE]: this.database,
                    [semantic_conventions_1.ATTR_SERVER_PORT]: this.connectionParameters.port,
                    [semantic_conventions_1.ATTR_SERVER_ADDRESS]: this.connectionParameters.host,
                };
                if (queryConfig?.text) {
                    attributes[semantic_conventions_1.ATTR_DB_OPERATION_NAME] =
                        utils.parseNormalizedOperationName(queryConfig?.text);
                }
                const recordDuration = () => {
                    plugin.recordOperationDuration(attributes, startTime);
                };
                const instrumentationConfig = plugin.getConfig();
                const span = utils.handleConfigQuery.call(this, plugin.tracer, instrumentationConfig, plugin._semconvStability, queryConfig);
                // Modify query text w/ a tracing comment before invoking original for
                // tracing, but only if args[0] has one of our expected shapes.
                if (instrumentationConfig.addSqlCommenterCommentToQueries) {
                    if (firstArgIsString) {
                        args[0] = (0, sql_common_1.addSqlCommenterComment)(span, arg0);
                    }
                    else if (firstArgIsQueryObjectWithText && !('name' in arg0)) {
                        // In the case of a query object, we need to ensure there's no name field
                        // as this indicates a prepared query, where the comment would remain the same
                        // for every invocation and contain an outdated trace context.
                        args[0] = {
                            ...arg0,
                            text: (0, sql_common_1.addSqlCommenterComment)(span, arg0.text),
                        };
                    }
                }
                // Bind callback (if any) to parent span (if any)
                if (args.length > 0) {
                    const parentSpan = api_1.trace.getSpan(api_1.context.active());
                    if (typeof args[args.length - 1] === 'function') {
                        // Patch ParameterQuery callback
                        args[args.length - 1] = utils.patchCallback(instrumentationConfig, span, args[args.length - 1], // nb: not type safe.
                        attributes, recordDuration);
                        // If a parent span exists, bind the callback
                        if (parentSpan) {
                            args[args.length - 1] = api_1.context.bind(api_1.context.active(), args[args.length - 1]);
                        }
                    }
                    else if (typeof queryConfig?.callback === 'function') {
                        // Patch ConfigQuery callback
                        let callback = utils.patchCallback(plugin.getConfig(), span, queryConfig.callback, // nb: not type safe.
                        attributes, recordDuration);
                        // If a parent span existed, bind the callback
                        if (parentSpan) {
                            callback = api_1.context.bind(api_1.context.active(), callback);
                        }
                        args[0].callback = callback;
                    }
                }
                const { requestHook } = instrumentationConfig;
                if (typeof requestHook === 'function' && queryConfig) {
                    (0, instrumentation_1.safeExecuteInTheMiddle)(() => {
                        // pick keys to expose explicitly, so we're not leaking pg package
                        // internals that are subject to change
                        const { database, host, port, user } = this.connectionParameters;
                        const connection = { database, host, port, user };
                        requestHook(span, {
                            connection,
                            query: {
                                text: queryConfig.text,
                                // nb: if `client.query` is called with illegal arguments
                                // (e.g., if `queryConfig.values` is passed explicitly, but a
                                // non-array is given), then the type casts will be wrong. But
                                // we leave it up to the queryHook to handle that, and we
                                // catch and swallow any errors it throws. The other options
                                // are all worse. E.g., we could leave `queryConfig.values`
                                // and `queryConfig.name` as `unknown`, but then the hook body
                                // would be forced to validate (or cast) them before using
                                // them, which seems incredibly cumbersome given that these
                                // casts will be correct 99.9% of the time -- and pg.query
                                // will immediately throw during development in the other .1%
                                // of cases. Alternatively, we could simply skip calling the
                                // hook when `values` or `name` don't have the expected type,
                                // but that would add unnecessary validation overhead to every
                                // hook invocation and possibly be even more confusing/unexpected.
                                values: queryConfig.values,
                                name: queryConfig.name,
                            },
                        });
                    }, err => {
                        if (err) {
                            plugin._diag.error('Error running query hook', err);
                        }
                    }, true);
                }
                let result;
                try {
                    result = original.apply(this, args);
                }
                catch (e) {
                    if (e instanceof Error) {
                        span.recordException(utils.sanitizedErrorMessage(e));
                    }
                    span.setStatus({
                        code: api_1.SpanStatusCode.ERROR,
                        message: utils.getErrorMessage(e),
                    });
                    span.end();
                    throw e;
                }
                // Bind promise to parent span and end the span
                if (result instanceof Promise) {
                    return result
                        .then((result) => {
                        // Return a pass-along promise which ends the span and then goes to user's orig resolvers
                        return new Promise(resolve => {
                            utils.handleExecutionResult(plugin.getConfig(), span, result);
                            recordDuration();
                            span.end();
                            resolve(result);
                        });
                    })
                        .catch((error) => {
                        return new Promise((_, reject) => {
                            if (error instanceof Error) {
                                span.recordException(utils.sanitizedErrorMessage(error));
                            }
                            span.setStatus({
                                code: api_1.SpanStatusCode.ERROR,
                                message: error.message,
                            });
                            recordDuration();
                            span.end();
                            reject(error);
                        });
                    });
                }
                // else returns void
                return result; // void
            };
        };
    }
    _setPoolConnectEventListeners(pgPool) {
        if (pgPool[internal_types_1.EVENT_LISTENERS_SET])
            return;
        const poolName = utils.getPoolName(pgPool.options);
        pgPool.on('connect', () => {
            this._connectionsCounter = utils.updateCounter(poolName, pgPool, this._connectionsCount, this._connectionPendingRequests, this._connectionsCounter);
        });
        pgPool.on('acquire', () => {
            this._connectionsCounter = utils.updateCounter(poolName, pgPool, this._connectionsCount, this._connectionPendingRequests, this._connectionsCounter);
        });
        pgPool.on('remove', () => {
            this._connectionsCounter = utils.updateCounter(poolName, pgPool, this._connectionsCount, this._connectionPendingRequests, this._connectionsCounter);
        });
        pgPool.on('release', () => {
            this._connectionsCounter = utils.updateCounter(poolName, pgPool, this._connectionsCount, this._connectionPendingRequests, this._connectionsCounter);
        });
        pgPool[internal_types_1.EVENT_LISTENERS_SET] = true;
    }
    _getPoolConnectPatch() {
        const plugin = this;
        return (originalConnect) => {
            return function connect(callback) {
                const config = plugin.getConfig();
                if (utils.shouldSkipInstrumentation(config)) {
                    return originalConnect.call(this, callback);
                }
                // Still set up event listeners for metrics even when skipping spans
                plugin._setPoolConnectEventListeners(this);
                if (config.ignoreConnectSpans) {
                    return originalConnect.call(this, callback);
                }
                // setup span
                const span = plugin.tracer.startSpan(SpanNames_1.SpanNames.POOL_CONNECT, {
                    kind: api_1.SpanKind.CLIENT,
                    attributes: utils.getSemanticAttributesFromPoolConnection(this.options, plugin._semconvStability),
                });
                if (callback) {
                    const parentSpan = api_1.trace.getSpan(api_1.context.active());
                    callback = utils.patchCallbackPGPool(span, callback);
                    // If a parent span exists, bind the callback
                    if (parentSpan) {
                        callback = api_1.context.bind(api_1.context.active(), callback);
                    }
                }
                const connectResult = api_1.context.with(api_1.trace.setSpan(api_1.context.active(), span), () => {
                    return originalConnect.call(this, callback);
                });
                return handleConnectResult(span, connectResult);
            };
        };
    }
}
exports.PgInstrumentation = PgInstrumentation;
function handleConnectResult(span, connectResult) {
    if (!(connectResult instanceof Promise)) {
        return connectResult;
    }
    const connectResultPromise = connectResult;
    return api_1.context.bind(api_1.context.active(), connectResultPromise
        .then(result => {
        span.end();
        return result;
    })
        .catch((error) => {
        if (error instanceof Error) {
            span.recordException(utils.sanitizedErrorMessage(error));
        }
        span.setStatus({
            code: api_1.SpanStatusCode.ERROR,
            message: utils.getErrorMessage(error),
        });
        span.end();
        return Promise.reject(error);
    }));
}
//# sourceMappingURL=instrumentation.js.map