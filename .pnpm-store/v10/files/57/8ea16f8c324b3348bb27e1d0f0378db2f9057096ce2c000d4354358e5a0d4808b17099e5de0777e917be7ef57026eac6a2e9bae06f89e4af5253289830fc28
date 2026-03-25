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
exports.extractTableName = exports.limitLength = exports.getName = exports.mapSystem = exports.otelExceptionFromKnexError = exports.getFormatter = void 0;
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const semconv_1 = require("./semconv");
const getFormatter = (runner) => {
    if (runner) {
        if (runner.client) {
            if (runner.client._formatQuery) {
                return runner.client._formatQuery.bind(runner.client);
            }
            else if (runner.client.SqlString) {
                return runner.client.SqlString.format.bind(runner.client.SqlString);
            }
        }
        if (runner.builder) {
            return runner.builder.toString.bind(runner.builder);
        }
    }
    return () => '<noop formatter>';
};
exports.getFormatter = getFormatter;
function otelExceptionFromKnexError(err, message) {
    if (!(err && err instanceof Error)) {
        return err;
    }
    return {
        message,
        code: err.code,
        stack: err.stack,
        name: err.name,
    };
}
exports.otelExceptionFromKnexError = otelExceptionFromKnexError;
const systemMap = new Map([
    ['sqlite3', semconv_1.DB_SYSTEM_NAME_VALUE_SQLITE],
    ['pg', semantic_conventions_1.DB_SYSTEM_NAME_VALUE_POSTGRESQL],
]);
const mapSystem = (knexSystem) => {
    return systemMap.get(knexSystem) || knexSystem;
};
exports.mapSystem = mapSystem;
const getName = (db, operation, table) => {
    if (operation) {
        if (table) {
            return `${operation} ${db}.${table}`;
        }
        return `${operation} ${db}`;
    }
    return db;
};
exports.getName = getName;
const limitLength = (str, maxLength) => {
    if (typeof str === 'string' &&
        typeof maxLength === 'number' &&
        0 < maxLength &&
        maxLength < str.length) {
        return str.substring(0, maxLength) + '..';
    }
    return str;
};
exports.limitLength = limitLength;
const extractTableName = (builder) => {
    const table = builder?._single?.table;
    if (typeof table === 'object') {
        return (0, exports.extractTableName)(table);
    }
    return table;
};
exports.extractTableName = extractTableName;
//# sourceMappingURL=utils.js.map