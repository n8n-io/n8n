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
exports.MySQLInstrumentation = void 0;
const api_1 = require("@opentelemetry/api");
const instrumentation_1 = require("@opentelemetry/instrumentation");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const semconv_1 = require("./semconv");
const AttributeNames_1 = require("./AttributeNames");
const utils_1 = require("./utils");
/** @knipignore */
const version_1 = require("./version");
class MySQLInstrumentation extends instrumentation_1.InstrumentationBase {
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
    _updateMetricInstruments() {
        this._connectionsUsageOld = this.meter.createUpDownCounter(semconv_1.METRIC_DB_CLIENT_CONNECTIONS_USAGE, {
            description: 'The number of connections that are currently in state described by the state attribute.',
            unit: '{connection}',
        });
    }
    /**
     * Convenience function for updating the `db.client.connections.usage` metric.
     * The name "count" comes from the eventually replacement for this metric per
     * https://opentelemetry.io/docs/specs/semconv/non-normative/db-migration/#database-client-connection-count
     */
    _connCountAdd(n, poolNameOld, state) {
        this._connectionsUsageOld?.add(n, { state, name: poolNameOld });
    }
    init() {
        return [
            new instrumentation_1.InstrumentationNodeModuleDefinition('mysql', ['>=2.0.0 <3'], (moduleExports) => {
                if ((0, instrumentation_1.isWrapped)(moduleExports.createConnection)) {
                    this._unwrap(moduleExports, 'createConnection');
                }
                this._wrap(moduleExports, 'createConnection', this._patchCreateConnection());
                if ((0, instrumentation_1.isWrapped)(moduleExports.createPool)) {
                    this._unwrap(moduleExports, 'createPool');
                }
                this._wrap(moduleExports, 'createPool', this._patchCreatePool());
                if ((0, instrumentation_1.isWrapped)(moduleExports.createPoolCluster)) {
                    this._unwrap(moduleExports, 'createPoolCluster');
                }
                this._wrap(moduleExports, 'createPoolCluster', this._patchCreatePoolCluster());
                return moduleExports;
            }, (moduleExports) => {
                if (moduleExports === undefined)
                    return;
                this._unwrap(moduleExports, 'createConnection');
                this._unwrap(moduleExports, 'createPool');
                this._unwrap(moduleExports, 'createPoolCluster');
            }),
        ];
    }
    // global export function
    _patchCreateConnection() {
        return (originalCreateConnection) => {
            const thisPlugin = this;
            return function createConnection(_connectionUri) {
                const originalResult = originalCreateConnection(...arguments);
                // This is unwrapped on next call after unpatch
                thisPlugin._wrap(originalResult, 'query', thisPlugin._patchQuery(originalResult));
                return originalResult;
            };
        };
    }
    // global export function
    _patchCreatePool() {
        return (originalCreatePool) => {
            const thisPlugin = this;
            return function createPool(_config) {
                const pool = originalCreatePool(...arguments);
                thisPlugin._wrap(pool, 'query', thisPlugin._patchQuery(pool));
                thisPlugin._wrap(pool, 'getConnection', thisPlugin._patchGetConnection(pool));
                thisPlugin._wrap(pool, 'end', thisPlugin._patchPoolEnd(pool));
                thisPlugin._setPoolCallbacks(pool, '');
                return pool;
            };
        };
    }
    _patchPoolEnd(pool) {
        return (originalPoolEnd) => {
            const thisPlugin = this;
            return function end(callback) {
                const nAll = pool._allConnections.length;
                const nFree = pool._freeConnections.length;
                const nUsed = nAll - nFree;
                const poolNameOld = (0, utils_1.getPoolNameOld)(pool);
                thisPlugin._connCountAdd(-nUsed, poolNameOld, 'used');
                thisPlugin._connCountAdd(-nFree, poolNameOld, 'idle');
                originalPoolEnd.apply(pool, arguments);
            };
        };
    }
    // global export function
    _patchCreatePoolCluster() {
        return (originalCreatePoolCluster) => {
            const thisPlugin = this;
            return function createPool(_config) {
                const cluster = originalCreatePoolCluster(...arguments);
                // This is unwrapped on next call after unpatch
                thisPlugin._wrap(cluster, 'getConnection', thisPlugin._patchGetConnection(cluster));
                thisPlugin._wrap(cluster, 'add', thisPlugin._patchAdd(cluster));
                return cluster;
            };
        };
    }
    _patchAdd(cluster) {
        return (originalAdd) => {
            const thisPlugin = this;
            return function add(id, config) {
                // Unwrap if unpatch has been called
                if (!thisPlugin['_enabled']) {
                    thisPlugin._unwrap(cluster, 'add');
                    return originalAdd.apply(cluster, arguments);
                }
                originalAdd.apply(cluster, arguments);
                const nodes = cluster['_nodes'];
                if (nodes) {
                    const nodeId = typeof id === 'object'
                        ? 'CLUSTER::' + cluster._lastId
                        : String(id);
                    const pool = nodes[nodeId].pool;
                    thisPlugin._setPoolCallbacks(pool, id);
                }
            };
        };
    }
    // method on cluster or pool
    _patchGetConnection(pool) {
        return (originalGetConnection) => {
            const thisPlugin = this;
            return function getConnection(arg1, arg2, arg3) {
                // Unwrap if unpatch has been called
                if (!thisPlugin['_enabled']) {
                    thisPlugin._unwrap(pool, 'getConnection');
                    return originalGetConnection.apply(pool, arguments);
                }
                if (arguments.length === 1 && typeof arg1 === 'function') {
                    const patchFn = thisPlugin._getConnectionCallbackPatchFn(arg1);
                    return originalGetConnection.call(pool, patchFn);
                }
                if (arguments.length === 2 && typeof arg2 === 'function') {
                    const patchFn = thisPlugin._getConnectionCallbackPatchFn(arg2);
                    return originalGetConnection.call(pool, arg1, patchFn);
                }
                if (arguments.length === 3 && typeof arg3 === 'function') {
                    const patchFn = thisPlugin._getConnectionCallbackPatchFn(arg3);
                    return originalGetConnection.call(pool, arg1, arg2, patchFn);
                }
                return originalGetConnection.apply(pool, arguments);
            };
        };
    }
    _getConnectionCallbackPatchFn(cb) {
        const thisPlugin = this;
        const activeContext = api_1.context.active();
        return function (err, connection) {
            if (connection) {
                // this is the callback passed into a query
                // no need to unwrap
                if (!(0, instrumentation_1.isWrapped)(connection.query)) {
                    thisPlugin._wrap(connection, 'query', thisPlugin._patchQuery(connection));
                }
            }
            if (typeof cb === 'function') {
                api_1.context.with(activeContext, cb, this, err, connection);
            }
        };
    }
    _patchQuery(connection) {
        return (originalQuery) => {
            const thisPlugin = this;
            return function query(query, _valuesOrCallback, _callback) {
                if (!thisPlugin['_enabled']) {
                    thisPlugin._unwrap(connection, 'query');
                    return originalQuery.apply(connection, arguments);
                }
                const attributes = {};
                const { host, port, database, user } = (0, utils_1.getConfig)(connection.config);
                const portNumber = parseInt(port, 10);
                const dbQueryText = (0, utils_1.getDbQueryText)(query);
                if (thisPlugin._dbSemconvStability & instrumentation_1.SemconvStability.OLD) {
                    attributes[semconv_1.ATTR_DB_SYSTEM] = semconv_1.DB_SYSTEM_VALUE_MYSQL;
                    attributes[semconv_1.ATTR_DB_CONNECTION_STRING] = (0, utils_1.getJDBCString)(host, port, database);
                    attributes[semconv_1.ATTR_DB_NAME] = database;
                    attributes[semconv_1.ATTR_DB_USER] = user;
                    attributes[semconv_1.ATTR_DB_STATEMENT] = dbQueryText;
                }
                if (thisPlugin._dbSemconvStability & instrumentation_1.SemconvStability.STABLE) {
                    attributes[semantic_conventions_1.ATTR_DB_SYSTEM_NAME] = semantic_conventions_1.DB_SYSTEM_NAME_VALUE_MYSQL;
                    attributes[semantic_conventions_1.ATTR_DB_NAMESPACE] = database;
                    attributes[semantic_conventions_1.ATTR_DB_QUERY_TEXT] = dbQueryText;
                }
                if (thisPlugin._netSemconvStability & instrumentation_1.SemconvStability.OLD) {
                    attributes[semconv_1.ATTR_NET_PEER_NAME] = host;
                    if (!isNaN(portNumber)) {
                        attributes[semconv_1.ATTR_NET_PEER_PORT] = portNumber;
                    }
                }
                if (thisPlugin._netSemconvStability & instrumentation_1.SemconvStability.STABLE) {
                    attributes[semantic_conventions_1.ATTR_SERVER_ADDRESS] = host;
                    if (!isNaN(portNumber)) {
                        attributes[semantic_conventions_1.ATTR_SERVER_PORT] = portNumber;
                    }
                }
                const span = thisPlugin.tracer.startSpan((0, utils_1.getSpanName)(query), {
                    kind: api_1.SpanKind.CLIENT,
                    attributes,
                });
                if (thisPlugin.getConfig().enhancedDatabaseReporting) {
                    let values;
                    if (Array.isArray(_valuesOrCallback)) {
                        values = _valuesOrCallback;
                    }
                    else if (arguments[2]) {
                        values = [_valuesOrCallback];
                    }
                    span.setAttribute(AttributeNames_1.AttributeNames.MYSQL_VALUES, (0, utils_1.getDbValues)(query, values));
                }
                const cbIndex = Array.from(arguments).findIndex(arg => typeof arg === 'function');
                const parentContext = api_1.context.active();
                if (cbIndex === -1) {
                    const streamableQuery = api_1.context.with(api_1.trace.setSpan(api_1.context.active(), span), () => {
                        return originalQuery.apply(connection, arguments);
                    });
                    api_1.context.bind(parentContext, streamableQuery);
                    return streamableQuery
                        .on('error', err => span.setStatus({
                        code: api_1.SpanStatusCode.ERROR,
                        message: err.message,
                    }))
                        .on('end', () => {
                        span.end();
                    });
                }
                else {
                    thisPlugin._wrap(arguments, cbIndex, thisPlugin._patchCallbackQuery(span, parentContext));
                    return api_1.context.with(api_1.trace.setSpan(api_1.context.active(), span), () => {
                        return originalQuery.apply(connection, arguments);
                    });
                }
            };
        };
    }
    _patchCallbackQuery(span, parentContext) {
        return (originalCallback) => {
            return function (err, results, fields) {
                if (err) {
                    span.setStatus({
                        code: api_1.SpanStatusCode.ERROR,
                        message: err.message,
                    });
                }
                span.end();
                return api_1.context.with(parentContext, () => originalCallback(...arguments));
            };
        };
    }
    _setPoolCallbacks(pool, id) {
        const poolNameOld = id || (0, utils_1.getPoolNameOld)(pool);
        pool.on('connection', _connection => {
            this._connCountAdd(1, poolNameOld, 'idle');
        });
        pool.on('acquire', _connection => {
            this._connCountAdd(-1, poolNameOld, 'idle');
            this._connCountAdd(1, poolNameOld, 'used');
        });
        pool.on('release', _connection => {
            this._connCountAdd(1, poolNameOld, 'idle');
            this._connCountAdd(-1, poolNameOld, 'used');
        });
    }
}
exports.MySQLInstrumentation = MySQLInstrumentation;
//# sourceMappingURL=instrumentation.js.map