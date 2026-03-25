// Copyright 2023 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

syntax = "proto3";

package google.api.expr.v1alpha1;

import "google/api/expr/v1alpha1/value.proto";
import "google/rpc/status.proto";

option cc_enable_arenas = true;
option go_package = "google.golang.org/genproto/googleapis/api/expr/v1alpha1;expr";
option java_multiple_files = true;
option java_outer_classname = "EvalProto";
option java_package = "com.google.api.expr.v1alpha1";

// The state of an evaluation.
//
// Can represent an inital, partial, or completed state of evaluation.
message EvalState {
  // A single evalution result.
  message Result {
    // The id of the expression this result if for.
    int64 expr = 1;

    // The index in `values` of the resulting value.
    int64 value = 2;
  }

  // The unique values referenced in this message.
  repeated ExprValue values = 1;

  // An ordered list of results.
  //
  // Tracks the flow of evaluation through the expression.
  // May be sparse.
  repeated Result results = 3;
}

// The value of an evaluated expression.
message ExprValue {
  // An expression can resolve to a value, error or unknown.
  oneof kind {
    // A concrete value.
    Value value = 1;

    // The set of errors in the critical path of evalution.
    //
    // Only errors in the critical path are included. For example,
    // `(<error1> || true) && <error2>` will only result in `<error2>`,
    // while `<error1> || <error2>` will result in both `<error1>` and
    // `<error2>`.
    //
    // Errors cause by the presence of other errors are not included in the
    // set. For example `<error1>.foo`, `foo(<error1>)`, and `<error1> + 1` will
    // only result in `<error1>`.
    //
    // Multiple errors *might* be included when evaluation could result
    // in different errors. For example `<error1> + <error2>` and
    // `foo(<error1>, <error2>)` may result in `<error1>`, `<error2>` or both.
    // The exact subset of errors included for this case is unspecified and
    // depends on the implementation details of the evaluator.
    ErrorSet error = 2;

    // The set of unknowns in the critical path of evaluation.
    //
    // Unknown behaves identically to Error with regards to propagation.
    // Specifically, only unknowns in the critical path are included, unknowns
    // caused by the presence of other unknowns are not included, and multiple
    // unknowns *might* be included included when evaluation could result in
    // different unknowns. For example:
    //
    //     (<unknown[1]> || true) && <unknown[2]> -> <unknown[2]>
    //     <unknown[1]> || <unknown[2]> -> <unknown[1,2]>
    //     <unknown[1]>.foo -> <unknown[1]>
    //     foo(<unknown[1]>) -> <unknown[1]>
    //     <unknown[1]> + <unknown[2]> -> <unknown[1]> or <unknown[2[>
    //
    // Unknown takes precidence over Error in cases where a `Value` can short
    // circuit the result:
    //
    //     <error> || <unknown> -> <unknown>
    //     <error> && <unknown> -> <unknown>
    //
    // Errors take precidence in all other cases:
    //
    //     <unknown> + <error> -> <error>
    //     foo(<unknown>, <error>) -> <error>
    UnknownSet unknown = 3;
  }
}

// A set of errors.
//
// The errors included depend on the context. See `ExprValue.error`.
message ErrorSet {
  // The errors in the set.
  repeated google.rpc.Status errors = 1;
}

// A set of expressions for which the value is unknown.
//
// The unknowns included depend on the context. See `ExprValue.unknown`.
message UnknownSet {
  // The ids of the expressions with unknown values.
  repeated int64 exprs = 1;
}
