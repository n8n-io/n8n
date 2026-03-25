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
exports.getConnectionPrototypeToInstrument = exports.once = exports.getSpanName = exports.getQueryText = exports.getConnectionAttributes = void 0;
const semconv_1 = require("./semconv");
const instrumentation_1 = require("@opentelemetry/instrumentation");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
/**
 * Get an Attributes map from a mysql connection config object
 *
 * @param config ConnectionConfig
 */
function getConnectionAttributes(config, dbSemconvStability, netSemconvStability) {
    const { host, port, database, user } = getConfig(config);
    const attrs = {};
    if (dbSemconvStability & instrumentation_1.SemconvStability.OLD) {
        attrs[semconv_1.ATTR_DB_CONNECTION_STRING] = getJDBCString(host, port, database);
        attrs[semconv_1.ATTR_DB_NAME] = database;
        attrs[semconv_1.ATTR_DB_USER] = user;
    }
    if (dbSemconvStability & instrumentation_1.SemconvStability.STABLE) {
        attrs[semantic_conventions_1.ATTR_DB_NAMESPACE] = database;
    }
    const portNumber = parseInt(port, 10);
    if (netSemconvStability & instrumentation_1.SemconvStability.OLD) {
        attrs[semconv_1.ATTR_NET_PEER_NAME] = host;
        if (!isNaN(portNumber)) {
            attrs[semconv_1.ATTR_NET_PEER_PORT] = portNumber;
        }
    }
    if (netSemconvStability & instrumentation_1.SemconvStability.STABLE) {
        attrs[semantic_conventions_1.ATTR_SERVER_ADDRESS] = host;
        if (!isNaN(portNumber)) {
            attrs[semantic_conventions_1.ATTR_SERVER_PORT] = portNumber;
        }
    }
    return attrs;
}
exports.getConnectionAttributes = getConnectionAttributes;
function getConfig(config) {
    const { host, port, database, user } = (config && config.connectionConfig) || config || {};
    return { host, port, database, user };
}
function getJDBCString(host, port, database) {
    let jdbcString = `jdbc:mysql://${host || 'localhost'}`;
    if (typeof port === 'number') {
        jdbcString += `:${port}`;
    }
    if (typeof database === 'string') {
        jdbcString += `/${database}`;
    }
    return jdbcString;
}
/**
 * Conjures up the value for the db.query.text attribute by formatting a SQL query.
 */
function getQueryText(query, format, values, maskStatement = false, maskStatementHook = defaultMaskingHook) {
    const [querySql, queryValues] = typeof query === 'string'
        ? [query, values]
        : [query.sql, hasValues(query) ? values || query.values : values];
    try {
        if (maskStatement) {
            return maskStatementHook(querySql);
        }
        else if (format && queryValues) {
            return format(querySql, queryValues);
        }
        else {
            return querySql;
        }
    }
    catch (e) {
        return 'Could not determine the query due to an error in masking or formatting';
    }
}
exports.getQueryText = getQueryText;
/**
 * Replaces numeric values and quoted strings in the query with placeholders ('?').
 *
 * - `\b\d+\b`: Matches whole numbers (integers) and replaces them with '?'.
 * - `(["'])(?:(?=(\\?))\2.)*?\1`:
 *   - Matches quoted strings (both single `'` and double `"` quotes).
 *   - Uses a lookahead `(?=(\\?))` to detect an optional backslash without consuming it immediately.
 *   - Captures the optional backslash `\2` and ensures escaped quotes inside the string are handled correctly.
 *   - Ensures that only complete quoted strings are replaced with '?'.
 *
 * This prevents accidental replacement of escaped quotes within strings and ensures that the
 * query structure remains intact while masking sensitive data.
 */
function defaultMaskingHook(query) {
    return query
        .replace(/\b\d+\b/g, '?')
        .replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '?');
}
function hasValues(obj) {
    return 'values' in obj;
}
/**
 * The span name SHOULD be set to a low cardinality value
 * representing the statement executed on the database.
 *
 * @returns SQL statement without variable arguments or SQL verb
 */
function getSpanName(query) {
    const rawQuery = typeof query === 'object' ? query.sql : query;
    // Extract the SQL verb
    const firstSpace = rawQuery?.indexOf(' ');
    if (typeof firstSpace === 'number' && firstSpace !== -1) {
        return rawQuery?.substring(0, firstSpace);
    }
    return rawQuery;
}
exports.getSpanName = getSpanName;
const once = (fn) => {
    let called = false;
    return (...args) => {
        if (called)
            return;
        called = true;
        return fn(...args);
    };
};
exports.once = once;
function getConnectionPrototypeToInstrument(connection) {
    const connectionPrototype = connection.prototype;
    const basePrototype = Object.getPrototypeOf(connectionPrototype);
    // mysql2@3.11.5 included a refactoring, where most code was moved out of the `Connection` class and into a shared base
    // so we need to instrument that instead, see https://github.com/sidorares/node-mysql2/pull/3081
    // This checks if the functions we're instrumenting are there on the base - we cannot use the presence of a base
    // prototype since EventEmitter is the base for mysql2@<=3.11.4
    if (typeof basePrototype?.query === 'function' &&
        typeof basePrototype?.execute === 'function') {
        return basePrototype;
    }
    // otherwise instrument the connection directly.
    return connectionPrototype;
}
exports.getConnectionPrototypeToInstrument = getConnectionPrototypeToInstrument;
//# sourceMappingURL=utils.js.map