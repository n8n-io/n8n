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

import "google/api/expr/v1alpha1/syntax.proto";
import "google/protobuf/empty.proto";
import "google/protobuf/struct.proto";

option cc_enable_arenas = true;
option go_package = "google.golang.org/genproto/googleapis/api/expr/v1alpha1;expr";
option java_multiple_files = true;
option java_outer_classname = "DeclProto";
option java_package = "com.google.api.expr.v1alpha1";

// Protos for representing CEL declarations and typed checked expressions.

// A CEL expression which has been successfully type checked.
message CheckedExpr {
  // A map from expression ids to resolved references.
  //
  // The following entries are in this table:
  //
  // - An Ident or Select expression is represented here if it resolves to a
  //   declaration. For instance, if `a.b.c` is represented by
  //   `select(select(id(a), b), c)`, and `a.b` resolves to a declaration,
  //   while `c` is a field selection, then the reference is attached to the
  //   nested select expression (but not to the id or or the outer select).
  //   In turn, if `a` resolves to a declaration and `b.c` are field selections,
  //   the reference is attached to the ident expression.
  // - Every Call expression has an entry here, identifying the function being
  //   called.
  // - Every CreateStruct expression for a message has an entry, identifying
  //   the message.
  map<int64, Reference> reference_map = 2;

  // A map from expression ids to types.
  //
  // Every expression node which has a type different than DYN has a mapping
  // here. If an expression has type DYN, it is omitted from this map to save
  // space.
  map<int64, Type> type_map = 3;

  // The source info derived from input that generated the parsed `expr` and
  // any optimizations made during the type-checking pass.
  SourceInfo source_info = 5;

  // The expr version indicates the major / minor version number of the `expr`
  // representation.
  //
  // The most common reason for a version change will be to indicate to the CEL
  // runtimes that transformations have been performed on the expr during static
  // analysis. In some cases, this will save the runtime the work of applying
  // the same or similar transformations prior to evaluation.
  string expr_version = 6;

  // The checked expression. Semantically equivalent to the parsed `expr`, but
  // may have structural differences.
  Expr expr = 4;
}

// Represents a CEL type.
message Type {
  // List type with typed elements, e.g. `list<example.proto.MyMessage>`.
  message ListType {
    // The element type.
    Type elem_type = 1;
  }

  // Map type with parameterized key and value types, e.g. `map<string, int>`.
  message MapType {
    // The type of the key.
    Type key_type = 1;

    // The type of the value.
    Type value_type = 2;
  }

  // Function type with result and arg types.
  message FunctionType {
    // Result type of the function.
    Type result_type = 1;

    // Argument types of the function.
    repeated Type arg_types = 2;
  }

  // Application defined abstract type.
  message AbstractType {
    // The fully qualified name of this abstract type.
    string name = 1;

    // Parameter types for this abstract type.
    repeated Type parameter_types = 2;
  }

  // CEL primitive types.
  enum PrimitiveType {
    // Unspecified type.
    PRIMITIVE_TYPE_UNSPECIFIED = 0;

    // Boolean type.
    BOOL = 1;

    // Int64 type.
    //
    // Proto-based integer values are widened to int64.
    INT64 = 2;

    // Uint64 type.
    //
    // Proto-based unsigned integer values are widened to uint64.
    UINT64 = 3;

    // Double type.
    //
    // Proto-based float values are widened to double values.
    DOUBLE = 4;

    // String type.
    STRING = 5;

    // Bytes type.
    BYTES = 6;
  }

  // Well-known protobuf types treated with first-class support in CEL.
  enum WellKnownType {
    // Unspecified type.
    WELL_KNOWN_TYPE_UNSPECIFIED = 0;

    // Well-known protobuf.Any type.
    //
    // Any types are a polymorphic message type. During type-checking they are
    // treated like `DYN` types, but at runtime they are resolved to a specific
    // message type specified at evaluation time.
    ANY = 1;

    // Well-known protobuf.Timestamp type, internally referenced as `timestamp`.
    TIMESTAMP = 2;

    // Well-known protobuf.Duration type, internally referenced as `duration`.
    DURATION = 3;
  }

  // The kind of type.
  oneof type_kind {
    // Dynamic type.
    google.protobuf.Empty dyn = 1;

    // Null value.
    google.protobuf.NullValue null = 2;

    // Primitive types: `true`, `1u`, `-2.0`, `'string'`, `b'bytes'`.
    PrimitiveType primitive = 3;

    // Wrapper of a primitive type, e.g. `google.protobuf.Int64Value`.
    PrimitiveType wrapper = 4;

    // Well-known protobuf type such as `google.protobuf.Timestamp`.
    WellKnownType well_known = 5;

    // Parameterized list with elements of `list_type`, e.g. `list<timestamp>`.
    ListType list_type = 6;

    // Parameterized map with typed keys and values.
    MapType map_type = 7;

    // Function type.
    FunctionType function = 8;

    // Protocol buffer message type.
    //
    // The `message_type` string specifies the qualified message type name. For
    // example, `google.plus.Profile`.
    string message_type = 9;

    // Type param type.
    //
    // The `type_param` string specifies the type parameter name, e.g. `list<E>`
    // would be a `list_type` whose element type was a `type_param` type
    // named `E`.
    string type_param = 10;

    // Type type.
    //
    // The `type` value specifies the target type. e.g. int is type with a
    // target type of `Primitive.INT`.
    Type type = 11;

    // Error type.
    //
    // During type-checking if an expression is an error, its type is propagated
    // as the `ERROR` type. This permits the type-checker to discover other
    // errors present in the expression.
    google.protobuf.Empty error = 12;

    // Abstract, application defined type.
    AbstractType abstract_type = 14;
  }
}

// Represents a declaration of a named value or function.
//
// A declaration is part of the contract between the expression, the agent
// evaluating that expression, and the caller requesting evaluation.
message Decl {
  // Identifier declaration which specifies its type and optional `Expr` value.
  //
  // An identifier without a value is a declaration that must be provided at
  // evaluation time. An identifier with a value should resolve to a constant,
  // but may be used in conjunction with other identifiers bound at evaluation
  // time.
  message IdentDecl {
    // Required. The type of the identifier.
    Type type = 1;

    // The constant value of the identifier. If not specified, the identifier
    // must be supplied at evaluation time.
    Constant value = 2;

    // Documentation string for the identifier.
    string doc = 3;
  }

  // Function declaration specifies one or more overloads which indicate the
  // function's parameter types and return type.
  //
  // Functions have no observable side-effects (there may be side-effects like
  // logging which are not observable from CEL).
  message FunctionDecl {
    // An overload indicates a function's parameter types and return type, and
    // may optionally include a function body described in terms of
    // [Expr][google.api.expr.v1alpha1.Expr] values.
    //
    // Functions overloads are declared in either a function or method
    // call-style. For methods, the `params[0]` is the expected type of the
    // target receiver.
    //
    // Overloads must have non-overlapping argument types after erasure of all
    // parameterized type variables (similar as type erasure in Java).
    message Overload {
      // Required. Globally unique overload name of the function which reflects
      // the function name and argument types.
      //
      // This will be used by a [Reference][google.api.expr.v1alpha1.Reference]
      // to indicate the `overload_id` that was resolved for the function
      // `name`.
      string overload_id = 1;

      // List of function parameter [Type][google.api.expr.v1alpha1.Type]
      // values.
      //
      // Param types are disjoint after generic type parameters have been
      // replaced with the type `DYN`. Since the `DYN` type is compatible with
      // any other type, this means that if `A` is a type parameter, the
      // function types `int<A>` and `int<int>` are not disjoint. Likewise,
      // `map<string, string>` is not disjoint from `map<K, V>`.
      //
      // When the `result_type` of a function is a generic type param, the
      // type param name also appears as the `type` of on at least one params.
      repeated Type params = 2;

      // The type param names associated with the function declaration.
      //
      // For example, `function ex<K,V>(K key, map<K, V> map) : V` would yield
      // the type params of `K, V`.
      repeated string type_params = 3;

      // Required. The result type of the function. For example, the operator
      // `string.isEmpty()` would have `result_type` of `kind: BOOL`.
      Type result_type = 4;

      // Whether the function is to be used in a method call-style `x.f(...)`
      // or a function call-style `f(x, ...)`.
      //
      // For methods, the first parameter declaration, `params[0]` is the
      // expected type of the target receiver.
      bool is_instance_function = 5;

      // Documentation string for the overload.
      string doc = 6;
    }

    // Required. List of function overloads, must contain at least one overload.
    repeated Overload overloads = 1;
  }

  // The fully qualified name of the declaration.
  //
  // Declarations are organized in containers and this represents the full path
  // to the declaration in its container, as in `google.api.expr.Decl`.
  //
  // Declarations used as
  // [FunctionDecl.Overload][google.api.expr.v1alpha1.Decl.FunctionDecl.Overload]
  // parameters may or may not have a name depending on whether the overload is
  // function declaration or a function definition containing a result
  // [Expr][google.api.expr.v1alpha1.Expr].
  string name = 1;

  // Required. The declaration kind.
  oneof decl_kind {
    // Identifier declaration.
    IdentDecl ident = 2;

    // Function declaration.
    FunctionDecl function = 3;
  }
}

// Describes a resolved reference to a declaration.
message Reference {
  // The fully qualified name of the declaration.
  string name = 1;

  // For references to functions, this is a list of `Overload.overload_id`
  // values which match according to typing rules.
  //
  // If the list has more than one element, overload resolution among the
  // presented candidates must happen at runtime because of dynamic types. The
  // type checker attempts to narrow down this list as much as possible.
  //
  // Empty if this is not a reference to a
  // [Decl.FunctionDecl][google.api.expr.v1alpha1.Decl.FunctionDecl].
  repeated string overload_id = 3;

  // For references to constants, this may contain the value of the
  // constant if known at compile time.
  Constant value = 4;
}
