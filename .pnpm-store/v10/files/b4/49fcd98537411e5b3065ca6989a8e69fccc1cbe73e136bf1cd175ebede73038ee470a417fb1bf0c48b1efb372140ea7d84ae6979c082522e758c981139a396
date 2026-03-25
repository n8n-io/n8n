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

export enum Status {
  OK = 0,
  CANCELLED,
  UNKNOWN,
  INVALID_ARGUMENT,
  DEADLINE_EXCEEDED,
  NOT_FOUND,
  ALREADY_EXISTS,
  PERMISSION_DENIED,
  RESOURCE_EXHAUSTED,
  FAILED_PRECONDITION,
  ABORTED,
  OUT_OF_RANGE,
  UNIMPLEMENTED,
  INTERNAL,
  UNAVAILABLE,
  DATA_LOSS,
  UNAUTHENTICATED,
}

export enum LogVerbosity {
  DEBUG = 0,
  INFO,
  ERROR,
  NONE,
}

/**
 * NOTE: This enum is not currently used in any implemented API in this
 * library. It is included only for type parity with the other implementation.
 */
export enum Propagate {
  DEADLINE = 1,
  CENSUS_STATS_CONTEXT = 2,
  CENSUS_TRACING_CONTEXT = 4,
  CANCELLATION = 8,
  // https://github.com/grpc/grpc/blob/master/include/grpc/impl/codegen/propagation_bits.h#L43
  DEFAULTS = 0xffff |
    Propagate.DEADLINE |
    Propagate.CENSUS_STATS_CONTEXT |
    Propagate.CENSUS_TRACING_CONTEXT |
    Propagate.CANCELLATION,
}

// -1 means unlimited
export const DEFAULT_MAX_SEND_MESSAGE_LENGTH = -1;

// 4 MB default
export const DEFAULT_MAX_RECEIVE_MESSAGE_LENGTH = 4 * 1024 * 1024;
