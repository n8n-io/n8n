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
exports.once = exports.getSpanName = void 0;
/**
 * The span name SHOULD be set to a low cardinality value
 * representing the statement executed on the database.
 *
 * @returns Operation executed on Tedious Connection. Does not map to SQL statement in any way.
 */
function getSpanName(operation, db, sql, bulkLoadTable) {
    if (operation === 'execBulkLoad' && bulkLoadTable && db) {
        return `${operation} ${bulkLoadTable} ${db}`;
    }
    if (operation === 'callProcedure') {
        // `sql` refers to procedure name with `callProcedure`
        if (db) {
            return `${operation} ${sql} ${db}`;
        }
        return `${operation} ${sql}`;
    }
    // do not use `sql` in general case because of high-cardinality
    if (db) {
        return `${operation} ${db}`;
    }
    return `${operation}`;
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
//# sourceMappingURL=utils.js.map