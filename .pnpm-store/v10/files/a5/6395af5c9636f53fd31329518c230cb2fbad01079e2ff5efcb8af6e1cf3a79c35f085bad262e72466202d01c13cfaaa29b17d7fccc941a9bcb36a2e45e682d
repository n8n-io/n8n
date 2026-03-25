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
exports.getPoolNameOld = exports.arrayStringifyHelper = exports.getSpanName = exports.getDbValues = exports.getDbQueryText = exports.getJDBCString = exports.getConfig = void 0;
function getConfig(config) {
    const { host, port, database, user } = (config && config.connectionConfig) || config || {};
    return { host, port, database, user };
}
exports.getConfig = getConfig;
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
exports.getJDBCString = getJDBCString;
/**
 * @returns the database query being executed.
 */
function getDbQueryText(query) {
    if (typeof query === 'string') {
        return query;
    }
    else {
        return query.sql;
    }
}
exports.getDbQueryText = getDbQueryText;
function getDbValues(query, values) {
    if (typeof query === 'string') {
        return arrayStringifyHelper(values);
    }
    else {
        // According to https://github.com/mysqljs/mysql#performing-queries
        // The values argument will override the values in the option object.
        return arrayStringifyHelper(values || query.values);
    }
}
exports.getDbValues = getDbValues;
/**
 * The span name SHOULD be set to a low cardinality value
 * representing the statement executed on the database.
 *
 * TODO: revisit span name based on https://github.com/open-telemetry/semantic-conventions/blob/v1.33.0/docs/database/database-spans.md#name
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
function arrayStringifyHelper(arr) {
    if (arr)
        return `[${arr.toString()}]`;
    return '';
}
exports.arrayStringifyHelper = arrayStringifyHelper;
function getPoolNameOld(pool) {
    const c = pool.config.connectionConfig;
    let poolName = '';
    poolName += c.host ? `host: '${c.host}', ` : '';
    poolName += c.port ? `port: ${c.port}, ` : '';
    poolName += c.database ? `database: '${c.database}', ` : '';
    poolName += c.user ? `user: '${c.user}'` : '';
    if (!c.user) {
        poolName = poolName.substring(0, poolName.length - 2); //omit last comma
    }
    return poolName.trim();
}
exports.getPoolNameOld = getPoolNameOld;
//# sourceMappingURL=utils.js.map