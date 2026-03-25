"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCallbackResponse = exports.handlePromiseResponse = exports.getAttributesFromCollection = void 0;
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
const api_1 = require("@opentelemetry/api");
const instrumentation_1 = require("@opentelemetry/instrumentation");
const semconv_1 = require("./semconv");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
function getAttributesFromCollection(collection, dbSemconvStability, netSemconvStability) {
    const attrs = {};
    if (dbSemconvStability & instrumentation_1.SemconvStability.OLD) {
        attrs[semconv_1.ATTR_DB_MONGODB_COLLECTION] = collection.name;
        attrs[semconv_1.ATTR_DB_NAME] = collection.conn.name;
        attrs[semconv_1.ATTR_DB_USER] = collection.conn.user;
    }
    if (dbSemconvStability & instrumentation_1.SemconvStability.STABLE) {
        attrs[semantic_conventions_1.ATTR_DB_COLLECTION_NAME] = collection.name;
        attrs[semantic_conventions_1.ATTR_DB_NAMESPACE] = collection.conn.name;
        // db.user has no stable replacement
    }
    if (netSemconvStability & instrumentation_1.SemconvStability.OLD) {
        attrs[semconv_1.ATTR_NET_PEER_NAME] = collection.conn.host;
        attrs[semconv_1.ATTR_NET_PEER_PORT] = collection.conn.port;
    }
    if (netSemconvStability & instrumentation_1.SemconvStability.STABLE) {
        attrs[semantic_conventions_1.ATTR_SERVER_ADDRESS] = collection.conn.host;
        attrs[semantic_conventions_1.ATTR_SERVER_PORT] = collection.conn.port;
    }
    return attrs;
}
exports.getAttributesFromCollection = getAttributesFromCollection;
function setErrorStatus(span, error = {}) {
    span.recordException(error);
    span.setStatus({
        code: api_1.SpanStatusCode.ERROR,
        message: `${error.message} ${error.code ? `\nMongoose Error Code: ${error.code}` : ''}`,
    });
}
function applyResponseHook(span, response, responseHook, moduleVersion = undefined) {
    if (!responseHook) {
        return;
    }
    (0, instrumentation_1.safeExecuteInTheMiddle)(() => responseHook(span, { moduleVersion, response }), e => {
        if (e) {
            api_1.diag.error('mongoose instrumentation: responseHook error', e);
        }
    }, true);
}
function handlePromiseResponse(execResponse, span, responseHook, moduleVersion = undefined) {
    if (!(execResponse instanceof Promise)) {
        applyResponseHook(span, execResponse, responseHook, moduleVersion);
        span.end();
        return execResponse;
    }
    return execResponse
        .then(response => {
        applyResponseHook(span, response, responseHook, moduleVersion);
        return response;
    })
        .catch(err => {
        setErrorStatus(span, err);
        throw err;
    })
        .finally(() => span.end());
}
exports.handlePromiseResponse = handlePromiseResponse;
function handleCallbackResponse(callback, exec, originalThis, span, args, responseHook, moduleVersion = undefined) {
    let callbackArgumentIndex = 0;
    if (args.length === 2) {
        callbackArgumentIndex = 1;
    }
    else if (args.length === 3) {
        callbackArgumentIndex = 2;
    }
    args[callbackArgumentIndex] = (err, response) => {
        if (err) {
            setErrorStatus(span, err);
        }
        else {
            applyResponseHook(span, response, responseHook, moduleVersion);
        }
        span.end();
        return callback(err, response);
    };
    return exec.apply(originalThis, args);
}
exports.handleCallbackResponse = handleCallbackResponse;
//# sourceMappingURL=utils.js.map