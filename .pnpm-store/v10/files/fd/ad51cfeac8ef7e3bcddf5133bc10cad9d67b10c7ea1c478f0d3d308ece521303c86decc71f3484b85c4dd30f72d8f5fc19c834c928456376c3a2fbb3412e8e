"use strict";
/*
 * Copyright 2019 gRPC authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_MAX_RECEIVE_MESSAGE_LENGTH = exports.DEFAULT_MAX_SEND_MESSAGE_LENGTH = exports.Propagate = exports.LogVerbosity = exports.Status = void 0;
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
var LogVerbosity;
(function (LogVerbosity) {
    LogVerbosity[LogVerbosity["DEBUG"] = 0] = "DEBUG";
    LogVerbosity[LogVerbosity["INFO"] = 1] = "INFO";
    LogVerbosity[LogVerbosity["ERROR"] = 2] = "ERROR";
    LogVerbosity[LogVerbosity["NONE"] = 3] = "NONE";
})(LogVerbosity || (exports.LogVerbosity = LogVerbosity = {}));
/**
 * NOTE: This enum is not currently used in any implemented API in this
 * library. It is included only for type parity with the other implementation.
 */
var Propagate;
(function (Propagate) {
    Propagate[Propagate["DEADLINE"] = 1] = "DEADLINE";
    Propagate[Propagate["CENSUS_STATS_CONTEXT"] = 2] = "CENSUS_STATS_CONTEXT";
    Propagate[Propagate["CENSUS_TRACING_CONTEXT"] = 4] = "CENSUS_TRACING_CONTEXT";
    Propagate[Propagate["CANCELLATION"] = 8] = "CANCELLATION";
    // https://github.com/grpc/grpc/blob/master/include/grpc/impl/codegen/propagation_bits.h#L43
    Propagate[Propagate["DEFAULTS"] = 65535] = "DEFAULTS";
})(Propagate || (exports.Propagate = Propagate = {}));
// -1 means unlimited
exports.DEFAULT_MAX_SEND_MESSAGE_LENGTH = -1;
// 4 MB default
exports.DEFAULT_MAX_RECEIVE_MESSAGE_LENGTH = 4 * 1024 * 1024;
//# sourceMappingURL=constants.js.map