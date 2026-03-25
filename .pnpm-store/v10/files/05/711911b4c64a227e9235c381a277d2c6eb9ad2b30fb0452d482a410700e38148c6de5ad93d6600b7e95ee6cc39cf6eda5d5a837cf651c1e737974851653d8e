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

option cc_enable_arenas = true;
option go_package = "google.golang.org/genproto/googleapis/api/expr/v1alpha1;expr";
option java_multiple_files = true;
option java_outer_classname = "ExplainProto";
option java_package = "com.google.api.expr.v1alpha1";

// Values of intermediate expressions produced when evaluating expression.
// Deprecated, use `EvalState` instead.
message Explain {
  option deprecated = true;

  // ID and value index of one step.
  message ExprStep {
    // ID of corresponding Expr node.
    int64 id = 1;

    // Index of the value in the values list.
    int32 value_index = 2;
  }

  // All of the observed values.
  //
  // The field value_index is an index in the values list.
  // Separating values from steps is needed to remove redundant values.
  repeated Value values = 1;

  // List of steps.
  //
  // Repeated evaluations of the same expression generate new ExprStep
  // instances. The order of such ExprStep instances matches the order of
  // elements returned by Comprehension.iter_range.
  repeated ExprStep expr_steps = 2;
}
