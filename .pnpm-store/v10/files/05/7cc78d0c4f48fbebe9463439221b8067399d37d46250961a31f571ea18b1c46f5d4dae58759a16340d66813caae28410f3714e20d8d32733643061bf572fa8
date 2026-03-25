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
exports.TediousInstrumentation = exports.INJECTED_CTX = void 0;
const api = require("@opentelemetry/api");
const events_1 = require("events");
const instrumentation_1 = require("@opentelemetry/instrumentation");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const semconv_1 = require("./semconv");
const utils_1 = require("./utils");
/** @knipignore */
const version_1 = require("./version");
const CURRENT_DATABASE = Symbol('opentelemetry.instrumentation-tedious.current-database');
exports.INJECTED_CTX = Symbol('opentelemetry.instrumentation-tedious.context-info-injected');
const PATCHED_METHODS = [
    'callProcedure',
    'execSql',
    'execSqlBatch',
    'execBulkLoad',
    'prepare',
    'execute',
];
function setDatabase(databaseName) {
    Object.defineProperty(this, CURRENT_DATABASE, {
        value: databaseName,
        writable: true,
    });
}
class TediousInstrumentation extends instrumentation_1.InstrumentationBase {
    static COMPONENT = 'tedious';
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
        return [
            new instrumentation_1.InstrumentationNodeModuleDefinition(TediousInstrumentation.COMPONENT, ['>=1.11.0 <20'], (moduleExports) => {
                const ConnectionPrototype = moduleExports.Connection.prototype;
                for (const method of PATCHED_METHODS) {
                    if ((0, instrumentation_1.isWrapped)(ConnectionPrototype[method])) {
                        this._unwrap(ConnectionPrototype, method);
                    }
                    this._wrap(ConnectionPrototype, method, this._patchQuery(method, moduleExports));
                }
                if ((0, instrumentation_1.isWrapped)(ConnectionPrototype.connect)) {
                    this._unwrap(ConnectionPrototype, 'connect');
                }
                this._wrap(ConnectionPrototype, 'connect', this._patchConnect);
                return moduleExports;
            }, (moduleExports) => {
                if (moduleExports === undefined)
                    return;
                const ConnectionPrototype = moduleExports.Connection.prototype;
                for (const method of PATCHED_METHODS) {
                    this._unwrap(ConnectionPrototype, method);
                }
                this._unwrap(ConnectionPrototype, 'connect');
            }),
        ];
    }
    _patchConnect(original) {
        return function patchedConnect() {
            setDatabase.call(this, this.config?.options?.database);
            // remove the listener first in case it's already added
            this.removeListener('databaseChange', setDatabase);
            this.on('databaseChange', setDatabase);
            this.once('end', () => {
                this.removeListener('databaseChange', setDatabase);
            });
            return original.apply(this, arguments);
        };
    }
    _buildTraceparent(span) {
        const sc = span.spanContext();
        return `00-${sc.traceId}-${sc.spanId}-0${Number(sc.traceFlags || api.TraceFlags.NONE).toString(16)}`;
    }
    /**
     * Fire a one-off `SET CONTEXT_INFO @opentelemetry_traceparent` on the same
     * connection. Marks the request with INJECTED_CTX so our patch skips it.
     */
    _injectContextInfo(connection, tediousModule, traceparent) {
        return new Promise(resolve => {
            try {
                const sql = 'set context_info @opentelemetry_traceparent';
                const req = new tediousModule.Request(sql, (_err) => {
                    resolve();
                });
                Object.defineProperty(req, exports.INJECTED_CTX, { value: true });
                const buf = Buffer.from(traceparent, 'utf8');
                req.addParameter('opentelemetry_traceparent', tediousModule.TYPES.VarBinary, buf, { length: buf.length });
                connection.execSql(req);
            }
            catch {
                resolve();
            }
        });
    }
    _shouldInjectFor(operation) {
        return (operation === 'execSql' ||
            operation === 'execSqlBatch' ||
            operation === 'callProcedure' ||
            operation === 'execute');
    }
    _patchQuery(operation, tediousModule) {
        return (originalMethod) => {
            const thisPlugin = this;
            function patchedMethod(request) {
                // Skip our own injected request
                if (request?.[exports.INJECTED_CTX]) {
                    return originalMethod.apply(this, arguments);
                }
                if (!(request instanceof events_1.EventEmitter)) {
                    thisPlugin._diag.warn(`Unexpected invocation of patched ${operation} method. Span not recorded`);
                    return originalMethod.apply(this, arguments);
                }
                let procCount = 0;
                let statementCount = 0;
                const incrementStatementCount = () => statementCount++;
                const incrementProcCount = () => procCount++;
                const databaseName = this[CURRENT_DATABASE];
                const sql = (request => {
                    // Required for <11.0.9
                    if (request.sqlTextOrProcedure === 'sp_prepare' &&
                        request.parametersByName?.stmt?.value) {
                        return request.parametersByName.stmt.value;
                    }
                    return request.sqlTextOrProcedure;
                })(request);
                const attributes = {};
                if (thisPlugin._dbSemconvStability & instrumentation_1.SemconvStability.OLD) {
                    attributes[semconv_1.ATTR_DB_SYSTEM] = semconv_1.DB_SYSTEM_VALUE_MSSQL;
                    attributes[semconv_1.ATTR_DB_NAME] = databaseName;
                    // >=4 uses `authentication` object; older versions just userName and password pair
                    attributes[semconv_1.ATTR_DB_USER] =
                        this.config?.userName ??
                            this.config?.authentication?.options?.userName;
                    attributes[semconv_1.ATTR_DB_STATEMENT] = sql;
                    attributes[semconv_1.ATTR_DB_SQL_TABLE] = request.table;
                }
                if (thisPlugin._dbSemconvStability & instrumentation_1.SemconvStability.STABLE) {
                    // The OTel spec for "db.namespace" discusses handling for connection
                    // to MSSQL "named instances". This isn't currently supported.
                    //    https://opentelemetry.io/docs/specs/semconv/database/sql-server/#:~:text=%5B1%5D%20db%2Enamespace
                    attributes[semantic_conventions_1.ATTR_DB_NAMESPACE] = databaseName;
                    attributes[semantic_conventions_1.ATTR_DB_SYSTEM_NAME] =
                        semantic_conventions_1.DB_SYSTEM_NAME_VALUE_MICROSOFT_SQL_SERVER;
                    attributes[semantic_conventions_1.ATTR_DB_QUERY_TEXT] = sql;
                    attributes[semantic_conventions_1.ATTR_DB_COLLECTION_NAME] = request.table;
                    // See https://opentelemetry.io/docs/specs/semconv/database/sql-server/#spans
                    // TODO(3290): can `db.response.status_code` be added?
                    // TODO(3290): is `operation` correct for `db.operation.name`
                    // TODO(3290): can `db.query.summary` reliably be calculated?
                    // TODO(3290): `db.stored_procedure.name`
                }
                if (thisPlugin._netSemconvStability & instrumentation_1.SemconvStability.OLD) {
                    attributes[semconv_1.ATTR_NET_PEER_NAME] = this.config?.server;
                    attributes[semconv_1.ATTR_NET_PEER_PORT] = this.config?.options?.port;
                }
                if (thisPlugin._netSemconvStability & instrumentation_1.SemconvStability.STABLE) {
                    attributes[semantic_conventions_1.ATTR_SERVER_ADDRESS] = this.config?.server;
                    attributes[semantic_conventions_1.ATTR_SERVER_PORT] = this.config?.options?.port;
                }
                const span = thisPlugin.tracer.startSpan((0, utils_1.getSpanName)(operation, databaseName, sql, request.table), {
                    kind: api.SpanKind.CLIENT,
                    attributes,
                });
                const endSpan = (0, utils_1.once)((err) => {
                    request.removeListener('done', incrementStatementCount);
                    request.removeListener('doneInProc', incrementStatementCount);
                    request.removeListener('doneProc', incrementProcCount);
                    request.removeListener('error', endSpan);
                    this.removeListener('end', endSpan);
                    span.setAttribute('tedious.procedure_count', procCount);
                    span.setAttribute('tedious.statement_count', statementCount);
                    if (err) {
                        span.setStatus({
                            code: api.SpanStatusCode.ERROR,
                            message: err.message,
                        });
                        // TODO(3290): set `error.type` attribute?
                    }
                    span.end();
                });
                request.on('done', incrementStatementCount);
                request.on('doneInProc', incrementStatementCount);
                request.on('doneProc', incrementProcCount);
                request.once('error', endSpan);
                this.on('end', endSpan);
                if (typeof request.callback === 'function') {
                    thisPlugin._wrap(request, 'callback', thisPlugin._patchCallbackQuery(endSpan));
                }
                else {
                    thisPlugin._diag.error('Expected request.callback to be a function');
                }
                const runUserRequest = () => {
                    return api.context.with(api.trace.setSpan(api.context.active(), span), originalMethod, this, ...arguments);
                };
                const cfg = thisPlugin.getConfig();
                const shouldInject = cfg.enableTraceContextPropagation &&
                    thisPlugin._shouldInjectFor(operation);
                if (!shouldInject)
                    return runUserRequest();
                const traceparent = thisPlugin._buildTraceparent(span);
                void thisPlugin
                    ._injectContextInfo(this, tediousModule, traceparent)
                    .finally(runUserRequest);
            }
            Object.defineProperty(patchedMethod, 'length', {
                value: originalMethod.length,
                writable: false,
            });
            return patchedMethod;
        };
    }
    _patchCallbackQuery(endSpan) {
        return (originalCallback) => {
            return function (err, rowCount, rows) {
                endSpan(err);
                return originalCallback.apply(this, arguments);
            };
        };
    }
}
exports.TediousInstrumentation = TediousInstrumentation;
//# sourceMappingURL=instrumentation.js.map