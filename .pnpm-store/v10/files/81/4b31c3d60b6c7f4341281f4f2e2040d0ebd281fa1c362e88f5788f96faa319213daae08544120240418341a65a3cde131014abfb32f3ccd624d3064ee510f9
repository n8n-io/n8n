"use strict";
/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpCodeToRpcCodeMap = exports.Status = void 0;
exports.rpcCodeFromHttpStatusCode = rpcCodeFromHttpStatusCode;
// The following is a copy of the Status enum defined in @grpc/grpc-js,
// src/constants.ts. We need to use some of these statuses here and there,
// but we don't want to include the whole @grpc/grpc-js into the browser
// bundle just to have this small enum.
var Status;
(function (Status) {
    Status[Status["OK"] = 0] = "OK";
    Status[Status["CANCELLED"] = 1] = "CANCELLED";
    Status[Status["UNKNOWN"] = 2] = "UNKNOWN";
    Status[Status["INVALID_ARGUMENT"] = 3] = "INVALID_ARGUMENT";
    Status[Status["DEADLINE_EXCEEDED"] = 4] = "DEADLINE_EXCEEDED";
    Status[Status["NOT_FOUND"] = 5] = "NOT_FOUND";
    Status[Status["ALREADY_EXISTS"] = 6] = "ALREADY_EXISTS";
    Status[Status["PERMISSION_DENIED"] = 7] = "PERMISSION_DENIED";
    Status[Status["RESOURCE_EXHAUSTED"] = 8] = "RESOURCE_EXHAUSTED";
    Status[Status["FAILED_PRECONDITION"] = 9] = "FAILED_PRECONDITION";
    Status[Status["ABORTED"] = 10] = "ABORTED";
    Status[Status["OUT_OF_RANGE"] = 11] = "OUT_OF_RANGE";
    Status[Status["UNIMPLEMENTED"] = 12] = "UNIMPLEMENTED";
    Status[Status["INTERNAL"] = 13] = "INTERNAL";
    Status[Status["UNAVAILABLE"] = 14] = "UNAVAILABLE";
    Status[Status["DATA_LOSS"] = 15] = "DATA_LOSS";
    Status[Status["UNAUTHENTICATED"] = 16] = "UNAUTHENTICATED";
})(Status || (exports.Status = Status = {}));
exports.HttpCodeToRpcCodeMap = new Map([
    [400, Status.INVALID_ARGUMENT],
    [401, Status.UNAUTHENTICATED],
    [403, Status.PERMISSION_DENIED],
    [404, Status.NOT_FOUND],
    [409, Status.ABORTED],
    [416, Status.OUT_OF_RANGE],
    [429, Status.RESOURCE_EXHAUSTED],
    [499, Status.CANCELLED],
    [501, Status.UNIMPLEMENTED],
    [503, Status.UNAVAILABLE],
    [504, Status.DEADLINE_EXCEEDED],
]);
// Maps HTTP status codes to gRPC status codes above.
function rpcCodeFromHttpStatusCode(httpStatusCode) {
    if (exports.HttpCodeToRpcCodeMap.has(httpStatusCode)) {
        return exports.HttpCodeToRpcCodeMap.get(httpStatusCode);
    }
    // All 2xx
    if (httpStatusCode >= 200 && httpStatusCode < 300) {
        return Status.OK;
    }
    // All other 4xx
    if (httpStatusCode >= 400 && httpStatusCode < 500) {
        return Status.FAILED_PRECONDITION;
    }
    // All other 5xx
    if (httpStatusCode >= 500 && httpStatusCode < 600) {
        return Status.INTERNAL;
    }
    // Everything else
    return Status.UNKNOWN;
}
//# sourceMappingURL=status.js.map