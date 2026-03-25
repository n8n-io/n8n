// Copyright 2022 Google LLC
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

package google.api.expr.conformance.v1alpha1;

import "google/api/client.proto";
import "google/api/expr/v1alpha1/checked.proto";
import "google/api/expr/v1alpha1/eval.proto";
import "google/api/expr/v1alpha1/syntax.proto";
import "google/rpc/status.proto";

option cc_enable_arenas = true;
option go_package = "google.golang.org/genproto/googleapis/api/expr/conformance/v1alpha1;confpb";
option java_multiple_files = true;
option java_outer_classname = "ConformanceServiceProto";
option java_package = "com.google.api.expr.conformance.v1alpha1";

// Access a CEL implementation from another process or machine.
// A CEL implementation is decomposed as a parser, a static checker,
// and an evaluator.  Every CEL implementation is expected to provide
// a server for this API.  The API will be used for conformance testing
// and other utilities.
service ConformanceService {
  option (google.api.default_host) = "cel.googleapis.com";

  // Transforms CEL source text into a parsed representation.
  rpc Parse(ParseRequest) returns (ParseResponse) {
  }

  // Runs static checks on a parsed CEL representation and return
  // an annotated representation, or a set of issues.
  rpc Check(CheckRequest) returns (CheckResponse) {
  }

  // Evaluates a parsed or annotation CEL representation given
  // values of external bindings.
  rpc Eval(EvalRequest) returns (EvalResponse) {
  }
}

// Request message for the Parse method.
message ParseRequest {
  // Required. Source text in CEL syntax.
  string cel_source = 1;

  // Tag for version of CEL syntax, for future use.
  string syntax_version = 2;

  // File or resource for source text, used in [SourceInfo][google.api.SourceInfo].
  string source_location = 3;

  // Prevent macro expansion.  See "Macros" in Language Defiinition.
  bool disable_macros = 4;
}

// Response message for the Parse method.
message ParseResponse {
  // The parsed representation, or unset if parsing failed.
  google.api.expr.v1alpha1.ParsedExpr parsed_expr = 1;

  // Any number of issues with [StatusDetails][] as the details.
  repeated google.rpc.Status issues = 2;
}

// Request message for the Check method.
message CheckRequest {
  // Required. The parsed representation of the CEL program.
  google.api.expr.v1alpha1.ParsedExpr parsed_expr = 1;

  // Declarations of types for external variables and functions.
  // Required if program uses external variables or functions
  // not in the default environment.
  repeated google.api.expr.v1alpha1.Decl type_env = 2;

  // The protocol buffer context.  See "Name Resolution" in the
  // Language Definition.
  string container = 3;

  // If true, use only the declarations in [type_env][google.api.expr.conformance.v1alpha1.CheckRequest.type_env].  If false (default),
  // add declarations for the standard definitions to the type environment.  See
  // "Standard Definitions" in the Language Definition.
  bool no_std_env = 4;
}

// Response message for the Check method.
message CheckResponse {
  // The annotated representation, or unset if checking failed.
  google.api.expr.v1alpha1.CheckedExpr checked_expr = 1;

  // Any number of issues with [StatusDetails][] as the details.
  repeated google.rpc.Status issues = 2;
}

// Request message for the Eval method.
message EvalRequest {
  // Required. Either the parsed or annotated representation of the CEL program.
  oneof expr_kind {
    // Evaluate based on the parsed representation.
    google.api.expr.v1alpha1.ParsedExpr parsed_expr = 1;

    // Evaluate based on the checked representation.
    google.api.expr.v1alpha1.CheckedExpr checked_expr = 2;
  }

  // Bindings for the external variables.  The types SHOULD be compatible
  // with the type environment in [CheckRequest][google.api.expr.conformance.v1alpha1.CheckRequest], if checked.
  map<string, google.api.expr.v1alpha1.ExprValue> bindings = 3;

  // SHOULD be the same container as used in [CheckRequest][google.api.expr.conformance.v1alpha1.CheckRequest], if checked.
  string container = 4;
}

// Response message for the Eval method.
message EvalResponse {
  // The execution result, or unset if execution couldn't start.
  google.api.expr.v1alpha1.ExprValue result = 1;

  // Any number of issues with [StatusDetails][] as the details.
  // Note that CEL execution errors are reified into [ExprValue][].
  // Nevertheless, we'll allow out-of-band issues to be raised,
  // which also makes the replies more regular.
  repeated google.rpc.Status issues = 2;
}

// A specific position in source.
message SourcePosition {
  // The source location name (e.g. file name).
  string location = 1;

  // The UTF-8 code unit offset.
  int32 offset = 2;

  // The 1-based index of the starting line in the source text
  // where the issue occurs, or 0 if unknown.
  int32 line = 3;

  // The 0-based index of the starting position within the line of source text
  // where the issue occurs.  Only meaningful if line is nonzero.
  int32 column = 4;
}

// Warnings or errors in service execution are represented by
// [google.rpc.Status][google.rpc.Status] messages, with the following message
// in the details field.
message IssueDetails {
  // Severities of issues.
  enum Severity {
    // An unspecified severity.
    SEVERITY_UNSPECIFIED = 0;

    // Deprecation issue for statements and method that may no longer be
    // supported or maintained.
    DEPRECATION = 1;

    // Warnings such as: unused variables.
    WARNING = 2;

    // Errors such as: unmatched curly braces or variable redefinition.
    ERROR = 3;
  }

  // The severity of the issue.
  Severity severity = 1;

  // Position in the source, if known.
  SourcePosition position = 2;

  // Expression ID from [Expr][], 0 if unknown.
  int64 id = 3;
}
