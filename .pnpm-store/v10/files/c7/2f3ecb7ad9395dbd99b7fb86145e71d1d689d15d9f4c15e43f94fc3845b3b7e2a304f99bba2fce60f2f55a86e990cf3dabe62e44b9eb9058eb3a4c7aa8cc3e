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
exports.sanitizedErrorMessage = exports.isObjectWithTextString = exports.getErrorMessage = exports.patchClientConnectCallback = exports.patchCallbackPGPool = exports.updateCounter = exports.getPoolName = exports.patchCallback = exports.handleExecutionResult = exports.handleConfigQuery = exports.shouldSkipInstrumentation = exports.getSemanticAttributesFromPoolConnection = exports.getSemanticAttributesFromConnection = exports.getConnectionString = exports.parseAndMaskConnectionString = exports.parseNormalizedOperationName = exports.getQuerySpanName = void 0;
const api_1 = require("@opentelemetry/api");
const AttributeNames_1 = require("./enums/AttributeNames");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const semconv_1 = require("./semconv");
const instrumentation_1 = require("@opentelemetry/instrumentation");
const SpanNames_1 = require("./enums/SpanNames");
/**
 * Helper function to get a low cardinality span name from whatever info we have
 * about the query.
 *
 * This is tricky, because we don't have most of the information (table name,
 * operation name, etc) the spec recommends using to build a low-cardinality
 * value w/o parsing. So, we use db.name and assume that, if the query's a named
 * prepared statement, those `name` values will be low cardinality. If we don't
 * have a named prepared statement, we try to parse an operation (despite the
 * spec's warnings).
 *
 * @params dbName The name of the db against which this query is being issued,
 *   which could be missing if no db name was given at the time that the
 *   connection was established.
 * @params queryConfig Information we have about the query being issued, typed
 *   to reflect only the validation we've actually done on the args to
 *   `client.query()`. This will be undefined if `client.query()` was called
 *   with invalid arguments.
 */
function getQuerySpanName(dbName, queryConfig) {
    // NB: when the query config is invalid, we omit the dbName too, so that
    // someone (or some tool) reading the span name doesn't misinterpret the
    // dbName as being a prepared statement or sql commit name.
    if (!queryConfig)
        return SpanNames_1.SpanNames.QUERY_PREFIX;
    // Either the name of a prepared statement; or an attempted parse
    // of the SQL command, normalized to uppercase; or unknown.
    const command = typeof queryConfig.name === 'string' && queryConfig.name
        ? queryConfig.name
        : parseNormalizedOperationName(queryConfig.text);
    return `${SpanNames_1.SpanNames.QUERY_PREFIX}:${command}${dbName ? ` ${dbName}` : ''}`;
}
exports.getQuerySpanName = getQuerySpanName;
function parseNormalizedOperationName(queryText) {
    // Trim the query text to handle leading/trailing whitespace
    const trimmedQuery = queryText.trim();
    const indexOfFirstSpace = trimmedQuery.indexOf(' ');
    let sqlCommand = indexOfFirstSpace === -1
        ? trimmedQuery
        : trimmedQuery.slice(0, indexOfFirstSpace);
    sqlCommand = sqlCommand.toUpperCase();
    // Handle query text being "COMMIT;", which has an extra semicolon before the space.
    return sqlCommand.endsWith(';') ? sqlCommand.slice(0, -1) : sqlCommand;
}
exports.parseNormalizedOperationName = parseNormalizedOperationName;
function parseAndMaskConnectionString(connectionString) {
    try {
        // Parse the connection string
        const url = new URL(connectionString);
        // Remove all auth information (username and password)
        url.username = '';
        url.password = '';
        return url.toString();
    }
    catch (e) {
        // If parsing fails, return a generic connection string
        return 'postgresql://localhost:5432/';
    }
}
exports.parseAndMaskConnectionString = parseAndMaskConnectionString;
function getConnectionString(params) {
    if ('connectionString' in params && params.connectionString) {
        return parseAndMaskConnectionString(params.connectionString);
    }
    const host = params.host || 'localhost';
    const port = params.port || 5432;
    const database = params.database || '';
    return `postgresql://${host}:${port}/${database}`;
}
exports.getConnectionString = getConnectionString;
function getPort(port) {
    // Port may be NaN as parseInt() is used on the value, passing null will result in NaN being parsed.
    // https://github.com/brianc/node-postgres/blob/2a8efbee09a284be12748ed3962bc9b816965e36/packages/pg/lib/connection-parameters.js#L66
    if (Number.isInteger(port)) {
        return port;
    }
    // Unable to find the default used in pg code, so falling back to 'undefined'.
    return undefined;
}
function getSemanticAttributesFromConnection(params, semconvStability) {
    let attributes = {};
    if (semconvStability & instrumentation_1.SemconvStability.OLD) {
        attributes = {
            ...attributes,
            [semconv_1.ATTR_DB_SYSTEM]: semconv_1.DB_SYSTEM_VALUE_POSTGRESQL,
            [semconv_1.ATTR_DB_NAME]: params.database,
            [semconv_1.ATTR_DB_CONNECTION_STRING]: getConnectionString(params),
            [semconv_1.ATTR_DB_USER]: params.user,
            [semconv_1.ATTR_NET_PEER_NAME]: params.host,
            [semconv_1.ATTR_NET_PEER_PORT]: getPort(params.port),
        };
    }
    if (semconvStability & instrumentation_1.SemconvStability.STABLE) {
        attributes = {
            ...attributes,
            [semantic_conventions_1.ATTR_DB_SYSTEM_NAME]: semantic_conventions_1.DB_SYSTEM_NAME_VALUE_POSTGRESQL,
            [semantic_conventions_1.ATTR_DB_NAMESPACE]: params.namespace,
            [semantic_conventions_1.ATTR_SERVER_ADDRESS]: params.host,
            [semantic_conventions_1.ATTR_SERVER_PORT]: getPort(params.port),
        };
    }
    return attributes;
}
exports.getSemanticAttributesFromConnection = getSemanticAttributesFromConnection;
function getSemanticAttributesFromPoolConnection(params, semconvStability) {
    let url;
    try {
        url = params.connectionString
            ? new URL(params.connectionString)
            : undefined;
    }
    catch (e) {
        url = undefined;
    }
    let attributes = {
        [AttributeNames_1.AttributeNames.IDLE_TIMEOUT_MILLIS]: params.idleTimeoutMillis,
        [AttributeNames_1.AttributeNames.MAX_CLIENT]: params.maxClient,
    };
    if (semconvStability & instrumentation_1.SemconvStability.OLD) {
        attributes = {
            ...attributes,
            [semconv_1.ATTR_DB_SYSTEM]: semconv_1.DB_SYSTEM_VALUE_POSTGRESQL,
            [semconv_1.ATTR_DB_NAME]: url?.pathname.slice(1) ?? params.database,
            [semconv_1.ATTR_DB_CONNECTION_STRING]: getConnectionString(params),
            [semconv_1.ATTR_NET_PEER_NAME]: url?.hostname ?? params.host,
            [semconv_1.ATTR_NET_PEER_PORT]: Number(url?.port) || getPort(params.port),
            [semconv_1.ATTR_DB_USER]: url?.username ?? params.user,
        };
    }
    if (semconvStability & instrumentation_1.SemconvStability.STABLE) {
        attributes = {
            ...attributes,
            [semantic_conventions_1.ATTR_DB_SYSTEM_NAME]: semantic_conventions_1.DB_SYSTEM_NAME_VALUE_POSTGRESQL,
            [semantic_conventions_1.ATTR_DB_NAMESPACE]: params.namespace,
            [semantic_conventions_1.ATTR_SERVER_ADDRESS]: url?.hostname ?? params.host,
            [semantic_conventions_1.ATTR_SERVER_PORT]: Number(url?.port) || getPort(params.port),
        };
    }
    return attributes;
}
exports.getSemanticAttributesFromPoolConnection = getSemanticAttributesFromPoolConnection;
function shouldSkipInstrumentation(instrumentationConfig) {
    return (instrumentationConfig.requireParentSpan === true &&
        api_1.trace.getSpan(api_1.context.active()) === undefined);
}
exports.shouldSkipInstrumentation = shouldSkipInstrumentation;
// Create a span from our normalized queryConfig object,
// or return a basic span if no queryConfig was given/could be created.
function handleConfigQuery(tracer, instrumentationConfig, semconvStability, queryConfig) {
    // Create child span.
    const { connectionParameters } = this;
    const dbName = connectionParameters.database;
    const spanName = getQuerySpanName(dbName, queryConfig);
    const span = tracer.startSpan(spanName, {
        kind: api_1.SpanKind.CLIENT,
        attributes: getSemanticAttributesFromConnection(connectionParameters, semconvStability),
    });
    if (!queryConfig) {
        return span;
    }
    // Set attributes
    if (queryConfig.text) {
        if (semconvStability & instrumentation_1.SemconvStability.OLD) {
            span.setAttribute(semconv_1.ATTR_DB_STATEMENT, queryConfig.text);
        }
        if (semconvStability & instrumentation_1.SemconvStability.STABLE) {
            span.setAttribute(semantic_conventions_1.ATTR_DB_QUERY_TEXT, queryConfig.text);
        }
    }
    if (instrumentationConfig.enhancedDatabaseReporting &&
        Array.isArray(queryConfig.values)) {
        try {
            const convertedValues = queryConfig.values.map(value => {
                if (value == null) {
                    return 'null';
                }
                else if (value instanceof Buffer) {
                    return value.toString();
                }
                else if (typeof value === 'object') {
                    if (typeof value.toPostgres === 'function') {
                        return value.toPostgres();
                    }
                    return JSON.stringify(value);
                }
                else {
                    //string, number
                    return value.toString();
                }
            });
            span.setAttribute(AttributeNames_1.AttributeNames.PG_VALUES, convertedValues);
        }
        catch (e) {
            api_1.diag.error('failed to stringify ', queryConfig.values, e);
        }
    }
    // Set plan name attribute, if present
    if (typeof queryConfig.name === 'string') {
        span.setAttribute(AttributeNames_1.AttributeNames.PG_PLAN, queryConfig.name);
    }
    return span;
}
exports.handleConfigQuery = handleConfigQuery;
function handleExecutionResult(config, span, pgResult) {
    if (typeof config.responseHook === 'function') {
        (0, instrumentation_1.safeExecuteInTheMiddle)(() => {
            config.responseHook(span, {
                data: pgResult,
            });
        }, err => {
            if (err) {
                api_1.diag.error('Error running response hook', err);
            }
        }, true);
    }
}
exports.handleExecutionResult = handleExecutionResult;
function patchCallback(instrumentationConfig, span, cb, attributes, recordDuration) {
    return function patchedCallback(err, res) {
        if (err) {
            if (Object.prototype.hasOwnProperty.call(err, 'code')) {
                attributes[semantic_conventions_1.ATTR_ERROR_TYPE] = err['code'];
            }
            if (err instanceof Error) {
                span.recordException(sanitizedErrorMessage(err));
            }
            span.setStatus({
                code: api_1.SpanStatusCode.ERROR,
                message: err.message,
            });
        }
        else {
            handleExecutionResult(instrumentationConfig, span, res);
        }
        recordDuration();
        span.end();
        cb.call(this, err, res);
    };
}
exports.patchCallback = patchCallback;
function getPoolName(pool) {
    let poolName = '';
    poolName += (pool?.host ? `${pool.host}` : 'unknown_host') + ':';
    poolName += (pool?.port ? `${pool.port}` : 'unknown_port') + '/';
    poolName += pool?.database ? `${pool.database}` : 'unknown_database';
    return poolName.trim();
}
exports.getPoolName = getPoolName;
function updateCounter(poolName, pool, connectionCount, connectionPendingRequests, latestCounter) {
    const all = pool.totalCount;
    const pending = pool.waitingCount;
    const idle = pool.idleCount;
    const used = all - idle;
    connectionCount.add(used - latestCounter.used, {
        [semconv_1.ATTR_DB_CLIENT_CONNECTION_STATE]: semconv_1.DB_CLIENT_CONNECTION_STATE_VALUE_USED,
        [semconv_1.ATTR_DB_CLIENT_CONNECTION_POOL_NAME]: poolName,
    });
    connectionCount.add(idle - latestCounter.idle, {
        [semconv_1.ATTR_DB_CLIENT_CONNECTION_STATE]: semconv_1.DB_CLIENT_CONNECTION_STATE_VALUE_IDLE,
        [semconv_1.ATTR_DB_CLIENT_CONNECTION_POOL_NAME]: poolName,
    });
    connectionPendingRequests.add(pending - latestCounter.pending, {
        [semconv_1.ATTR_DB_CLIENT_CONNECTION_POOL_NAME]: poolName,
    });
    return { used: used, idle: idle, pending: pending };
}
exports.updateCounter = updateCounter;
function patchCallbackPGPool(span, cb) {
    return function patchedCallback(err, res, done) {
        if (err) {
            if (err instanceof Error) {
                span.recordException(sanitizedErrorMessage(err));
            }
            span.setStatus({
                code: api_1.SpanStatusCode.ERROR,
                message: err.message,
            });
        }
        span.end();
        cb.call(this, err, res, done);
    };
}
exports.patchCallbackPGPool = patchCallbackPGPool;
function patchClientConnectCallback(span, cb) {
    return function patchedClientConnectCallback(err) {
        if (err) {
            if (err instanceof Error) {
                span.recordException(sanitizedErrorMessage(err));
            }
            span.setStatus({
                code: api_1.SpanStatusCode.ERROR,
                message: err.message,
            });
        }
        span.end();
        cb.apply(this, arguments);
    };
}
exports.patchClientConnectCallback = patchClientConnectCallback;
/**
 * Attempt to get a message string from a thrown value, while being quite
 * defensive, to recognize the fact that, in JS, any kind of value (even
 * primitives) can be thrown.
 */
function getErrorMessage(e) {
    return typeof e === 'object' && e !== null && 'message' in e
        ? String(e.message)
        : undefined;
}
exports.getErrorMessage = getErrorMessage;
function isObjectWithTextString(it) {
    return (typeof it === 'object' &&
        typeof it?.text === 'string');
}
exports.isObjectWithTextString = isObjectWithTextString;
/**
 * Generates a sanitized message for the error.
 * Only includes the error type and PostgreSQL error code, omitting any sensitive details.
 */
function sanitizedErrorMessage(error) {
    const name = error?.name ?? 'PostgreSQLError';
    const code = error?.code ?? 'UNKNOWN';
    return `PostgreSQL error of type '${name}' occurred (code: ${code})`;
}
exports.sanitizedErrorMessage = sanitizedErrorMessage;
//# sourceMappingURL=utils.js.map