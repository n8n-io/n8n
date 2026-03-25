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
exports.addSqlCommenterComment = void 0;
const api_1 = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
// NOTE: This function currently is returning false-positives
// in cases where comment characters appear in string literals
// ("SELECT '-- not a comment';" would return true, although has no comment)
function hasValidSqlComment(query) {
    const indexOpeningDashDashComment = query.indexOf('--');
    if (indexOpeningDashDashComment >= 0) {
        return true;
    }
    const indexOpeningSlashComment = query.indexOf('/*');
    if (indexOpeningSlashComment < 0) {
        return false;
    }
    const indexClosingSlashComment = query.indexOf('*/');
    return indexOpeningDashDashComment < indexClosingSlashComment;
}
// sqlcommenter specification (https://google.github.io/sqlcommenter/spec/#value-serialization)
// expects us to URL encode based on the RFC 3986 spec (https://en.wikipedia.org/wiki/Percent-encoding),
// but encodeURIComponent does not handle some characters correctly (! ' ( ) *),
// which means we need special handling for this
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
function fixedEncodeURIComponent(str) {
    return encodeURIComponent(str).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}
function addSqlCommenterComment(span, query) {
    if (typeof query !== 'string' || query.length === 0) {
        return query;
    }
    // As per sqlcommenter spec we shall not add a comment if there already is a comment
    // in the query
    if (hasValidSqlComment(query)) {
        return query;
    }
    const propagator = new core_1.W3CTraceContextPropagator();
    const headers = {};
    propagator.inject(api_1.trace.setSpan(api_1.ROOT_CONTEXT, span), headers, api_1.defaultTextMapSetter);
    // sqlcommenter spec requires keys in the comment to be sorted lexicographically
    const sortedKeys = Object.keys(headers).sort();
    if (sortedKeys.length === 0) {
        return query;
    }
    const commentString = sortedKeys
        .map(key => {
        const encodedValue = fixedEncodeURIComponent(headers[key]);
        return `${key}='${encodedValue}'`;
    })
        .join(',');
    return `${query} /*${commentString}*/`;
}
exports.addSqlCommenterComment = addSqlCommenterComment;
//# sourceMappingURL=index.js.map