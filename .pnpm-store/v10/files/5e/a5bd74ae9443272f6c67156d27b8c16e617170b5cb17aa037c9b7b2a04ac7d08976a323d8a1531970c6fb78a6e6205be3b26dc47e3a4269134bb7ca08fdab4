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

import "google/protobuf/duration.proto";
import "google/protobuf/struct.proto";
import "google/protobuf/timestamp.proto";

option cc_enable_arenas = true;
option go_package = "google.golang.org/genproto/googleapis/api/expr/v1alpha1;expr";
option java_multiple_files = true;
option java_outer_classname = "SyntaxProto";
option java_package = "com.google.api.expr.v1alpha1";

// A representation of the abstract syntax of the Common Expression Language.

// An expression together with source information as returned by the parser.
message ParsedExpr {
  // The parsed expression.
  Expr expr = 2;

  // The source info derived from input that generated the parsed `expr`.
  SourceInfo source_info = 3;
}

// An abstract representation of a common expression.
//
// Expressions are abstractly represented as a collection of identifiers,
// select statements, function calls, literals, and comprehensions. All
// operators with the exception of the '.' operator are modelled as function
// calls. This makes it easy to represent new operators into the existing AST.
//
// All references within expressions must resolve to a
// [Decl][google.api.expr.v1alpha1.Decl] provided at type-check for an
// expression to be valid. A reference may either be a bare identifier `name` or
// a qualified identifier `google.api.name`. References may either refer to a
// value or a function declaration.
//
// For example, the expression `google.api.name.startsWith('expr')` references
// the declaration `google.api.name` within a
// [Expr.Select][google.api.expr.v1alpha1.Expr.Select] expression, and the
// function declaration `startsWith`.
message Expr {
  // An identifier expression. e.g. `request`.
  message Ident {
    // Required. Holds a single, unqualified identifier, possibly preceded by a
    // '.'.
    //
    // Qualified names are represented by the
    // [Expr.Select][google.api.expr.v1alpha1.Expr.Select] expression.
    string name = 1;
  }

  // A field selection expression. e.g. `request.auth`.
  message Select {
    // Required. The target of the selection expression.
    //
    // For example, in the select expression `request.auth`, the `request`
    // portion of the expression is the `operand`.
    Expr operand = 1;

    // Required. The name of the field to select.
    //
    // For example, in the select expression `request.auth`, the `auth` portion
    // of the expression would be the `field`.
    string field = 2;

    // Whether the select is to be interpreted as a field presence test.
    //
    // This results from the macro `has(request.auth)`.
    bool test_only = 3;
  }

  // A call expression, including calls to predefined functions and operators.
  //
  // For example, `value == 10`, `size(map_value)`.
  message Call {
    // The target of an method call-style expression. For example, `x` in
    // `x.f()`.
    Expr target = 1;

    // Required. The name of the function or method being called.
    string function = 2;

    // The arguments.
    repeated Expr args = 3;
  }

  // A list creation expression.
  //
  // Lists may either be homogenous, e.g. `[1, 2, 3]`, or heterogeneous, e.g.
  // `dyn([1, 'hello', 2.0])`
  message CreateList {
    // The elements part of the list.
    repeated Expr elements = 1;

    // The indices within the elements list which are marked as optional
    // elements.
    //
    // When an optional-typed value is present, the value it contains
    // is included in the list. If the optional-typed value is absent, the list
    // element is omitted from the CreateList result.
    repeated int32 optional_indices = 2;
  }

  // A map or message creation expression.
  //
  // Maps are constructed as `{'key_name': 'value'}`. Message construction is
  // similar, but prefixed with a type name and composed of field ids:
  // `types.MyType{field_id: 'value'}`.
  message CreateStruct {
    // Represents an entry.
    message Entry {
      // Required. An id assigned to this node by the parser which is unique
      // in a given expression tree. This is used to associate type
      // information and other attributes to the node.
      int64 id = 1;

      // The `Entry` key kinds.
      oneof key_kind {
        // The field key for a message creator statement.
        string field_key = 2;

        // The key expression for a map creation statement.
        Expr map_key = 3;
      }

      // Required. The value assigned to the key.
      //
      // If the optional_entry field is true, the expression must resolve to an
      // optional-typed value. If the optional value is present, the key will be
      // set; however, if the optional value is absent, the key will be unset.
      Expr value = 4;

      // Whether the key-value pair is optional.
      bool optional_entry = 5;
    }

    // The type name of the message to be created, empty when creating map
    // literals.
    string message_name = 1;

    // The entries in the creation expression.
    repeated Entry entries = 2;
  }

  // A comprehension expression applied to a list or map.
  //
  // Comprehensions are not part of the core syntax, but enabled with macros.
  // A macro matches a specific call signature within a parsed AST and replaces
  // the call with an alternate AST block. Macro expansion happens at parse
  // time.
  //
  // The following macros are supported within CEL:
  //
  // Aggregate type macros may be applied to all elements in a list or all keys
  // in a map:
  //
  // *  `all`, `exists`, `exists_one` -  test a predicate expression against
  //    the inputs and return `true` if the predicate is satisfied for all,
  //    any, or only one value `list.all(x, x < 10)`.
  // *  `filter` - test a predicate expression against the inputs and return
  //    the subset of elements which satisfy the predicate:
  //    `payments.filter(p, p > 1000)`.
  // *  `map` - apply an expression to all elements in the input and return the
  //    output aggregate type: `[1, 2, 3].map(i, i * i)`.
  //
  // The `has(m.x)` macro tests whether the property `x` is present in struct
  // `m`. The semantics of this macro depend on the type of `m`. For proto2
  // messages `has(m.x)` is defined as 'defined, but not set`. For proto3, the
  // macro tests whether the property is set to its default. For map and struct
  // types, the macro tests whether the property `x` is defined on `m`.
  message Comprehension {
    // The name of the iteration variable.
    string iter_var = 1;

    // The range over which var iterates.
    Expr iter_range = 2;

    // The name of the variable used for accumulation of the result.
    string accu_var = 3;

    // The initial value of the accumulator.
    Expr accu_init = 4;

    // An expression which can contain iter_var and accu_var.
    //
    // Returns false when the result has been computed and may be used as
    // a hint to short-circuit the remainder of the comprehension.
    Expr loop_condition = 5;

    // An expression which can contain iter_var and accu_var.
    //
    // Computes the next value of accu_var.
    Expr loop_step = 6;

    // An expression which can contain accu_var.
    //
    // Computes the result.
    Expr result = 7;
  }

  // Required. An id assigned to this node by the parser which is unique in a
  // given expression tree. This is used to associate type information and other
  // attributes to a node in the parse tree.
  int64 id = 2;

  // Required. Variants of expressions.
  oneof expr_kind {
    // A literal expression.
    Constant const_expr = 3;

    // An identifier expression.
    Ident ident_expr = 4;

    // A field selection expression, e.g. `request.auth`.
    Select select_expr = 5;

    // A call expression, including calls to predefined functions and operators.
    Call call_expr = 6;

    // A list creation expression.
    CreateList list_expr = 7;

    // A map or message creation expression.
    CreateStruct struct_expr = 8;

    // A comprehension expression.
    Comprehension comprehension_expr = 9;
  }
}

// Represents a primitive literal.
//
// Named 'Constant' here for backwards compatibility.
//
// This is similar as the primitives supported in the well-known type
// `google.protobuf.Value`, but richer so it can represent CEL's full range of
// primitives.
//
// Lists and structs are not included as constants as these aggregate types may
// contain [Expr][google.api.expr.v1alpha1.Expr] elements which require
// evaluation and are thus not constant.
//
// Examples of literals include: `"hello"`, `b'bytes'`, `1u`, `4.2`, `-2`,
// `true`, `null`.
message Constant {
  // Required. The valid constant kinds.
  oneof constant_kind {
    // null value.
    google.protobuf.NullValue null_value = 1;

    // boolean value.
    bool bool_value = 2;

    // int64 value.
    int64 int64_value = 3;

    // uint64 value.
    uint64 uint64_value = 4;

    // double value.
    double double_value = 5;

    // string value.
    string string_value = 6;

    // bytes value.
    bytes bytes_value = 7;

    // protobuf.Duration value.
    //
    // Deprecated: duration is no longer considered a builtin cel type.
    google.protobuf.Duration duration_value = 8 [deprecated = true];

    // protobuf.Timestamp value.
    //
    // Deprecated: timestamp is no longer considered a builtin cel type.
    google.protobuf.Timestamp timestamp_value = 9 [deprecated = true];
  }
}

// Source information collected at parse time.
message SourceInfo {
  // An extension that was requested for the source expression.
  message Extension {
    // Version
    message Version {
      // Major version changes indicate different required support level from
      // the required components.
      int64 major = 1;

      // Minor version changes must not change the observed behavior from
      // existing implementations, but may be provided informationally.
      int64 minor = 2;
    }

    // CEL component specifier.
    enum Component {
      // Unspecified, default.
      COMPONENT_UNSPECIFIED = 0;

      // Parser. Converts a CEL string to an AST.
      COMPONENT_PARSER = 1;

      // Type checker. Checks that references in an AST are defined and types
      // agree.
      COMPONENT_TYPE_CHECKER = 2;

      // Runtime. Evaluates a parsed and optionally checked CEL AST against a
      // context.
      COMPONENT_RUNTIME = 3;
    }

    // Identifier for the extension. Example: constant_folding
    string id = 1;

    // If set, the listed components must understand the extension for the
    // expression to evaluate correctly.
    //
    // This field has set semantics, repeated values should be deduplicated.
    repeated Component affected_components = 2;

    // Version info. May be skipped if it isn't meaningful for the extension.
    // (for example constant_folding might always be v0.0).
    Version version = 3;
  }

  // The syntax version of the source, e.g. `cel1`.
  string syntax_version = 1;

  // The location name. All position information attached to an expression is
  // relative to this location.
  //
  // The location could be a file, UI element, or similar. For example,
  // `acme/app/AnvilPolicy.cel`.
  string location = 2;

  // Monotonically increasing list of code point offsets where newlines
  // `\n` appear.
  //
  // The line number of a given position is the index `i` where for a given
  // `id` the `line_offsets[i] < id_positions[id] < line_offsets[i+1]`. The
  // column may be derivd from `id_positions[id] - line_offsets[i]`.
  repeated int32 line_offsets = 3;

  // A map from the parse node id (e.g. `Expr.id`) to the code point offset
  // within the source.
  map<int64, int32> positions = 4;

  // A map from the parse node id where a macro replacement was made to the
  // call `Expr` that resulted in a macro expansion.
  //
  // For example, `has(value.field)` is a function call that is replaced by a
  // `test_only` field selection in the AST. Likewise, the call
  // `list.exists(e, e > 10)` translates to a comprehension expression. The key
  // in the map corresponds to the expression id of the expanded macro, and the
  // value is the call `Expr` that was replaced.
  map<int64, Expr> macro_calls = 5;

  // A list of tags for extensions that were used while parsing or type checking
  // the source expression. For example, optimizations that require special
  // runtime support may be specified.
  //
  // These are used to check feature support between components in separate
  // implementations. This can be used to either skip redundant work or
  // report an error if the extension is unsupported.
  repeated Extension extensions = 6;
}

// A specific position in source.
message SourcePosition {
  // The soucre location name (e.g. file name).
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
