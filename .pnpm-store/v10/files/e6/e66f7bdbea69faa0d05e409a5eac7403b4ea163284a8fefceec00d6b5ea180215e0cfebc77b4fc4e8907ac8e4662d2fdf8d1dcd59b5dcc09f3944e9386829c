// Copyright 2019 Google LLC.
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
//

syntax = "proto3";

package google.api.expr.v1beta1;

import "google/api/expr/v1beta1/expr.proto";

option cc_enable_arenas = true;
option go_package = "google.golang.org/genproto/googleapis/api/expr/v1beta1;expr";
option java_multiple_files = true;
option java_outer_classname = "DeclProto";
option java_package = "com.google.api.expr.v1beta1";

// A declaration.
message Decl {
  // The id of the declaration.
  int32 id = 1;

  // The name of the declaration.
  string name = 2;

  // The documentation string for the declaration.
  string doc = 3;

  // The kind of declaration.
  oneof kind {
    // An identifier declaration.
    IdentDecl ident = 4;

    // A function declaration.
    FunctionDecl function = 5;
  }
}

// The declared type of a variable.
//
// Extends runtime type values with extra information used for type checking
// and dispatching.
message DeclType {
  // The expression id of the declared type, if applicable.
  int32 id = 1;

  // The type name, e.g. 'int', 'my.type.Type' or 'T'
  string type = 2;

  // An ordered list of type parameters, e.g. `<string, int>`.
  // Only applies to a subset of types, e.g. `map`, `list`.
  repeated DeclType type_params = 4;
}

// An identifier declaration.
message IdentDecl {
  // Optional type of the identifier.
  DeclType type = 3;

  // Optional value of the identifier.
  Expr value = 4;
}

// A function declaration.
message FunctionDecl {
  // The function arguments.
  repeated IdentDecl args = 1;

  // Optional declared return type.
  DeclType return_type = 2;

  // If the first argument of the function is the receiver.
  bool receiver_function = 3;
}
