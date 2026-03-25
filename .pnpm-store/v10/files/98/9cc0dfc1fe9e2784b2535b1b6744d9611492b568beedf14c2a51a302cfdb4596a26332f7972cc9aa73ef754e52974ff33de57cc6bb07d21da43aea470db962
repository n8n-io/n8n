// Protocol Buffers - Google's data interchange format
// Copyright 2008 Google Inc.  All rights reserved.
// https://developers.google.com/protocol-buffers/
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
//     * Redistributions of source code must retain the above copyright
// notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above
// copyright notice, this list of conditions and the following disclaimer
// in the documentation and/or other materials provided with the
// distribution.
//     * Neither the name of Google Inc. nor the names of its
// contributors may be used to endorse or promote products derived from
// this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

syntax = "proto3";

package google.protobuf;

import "google/protobuf/any.proto";
import "google/protobuf/source_context.proto";

option cc_enable_arenas = true;
option java_package = "com.google.protobuf";
option java_outer_classname = "TypeProto";
option java_multiple_files = true;
option objc_class_prefix = "GPB";
option csharp_namespace = "Google.Protobuf.WellKnownTypes";
option go_package = "google.golang.org/protobuf/types/known/typepb";

// A protocol buffer message type.
message Type {
  // The fully qualified message name.
  string name = 1;
  // The list of fields.
  repeated Field fields = 2;
  // The list of types appearing in `oneof` definitions in this type.
  repeated string oneofs = 3;
  // The protocol buffer options.
  repeated Option options = 4;
  // The source context.
  SourceContext source_context = 5;
  // The source syntax.
  Syntax syntax = 6;
  // The source edition string, only valid when syntax is SYNTAX_EDITIONS.
  string edition = 7;
}

// A single field of a message type.
message Field {
  // Basic field types.
  enum Kind {
    // Field type unknown.
    TYPE_UNKNOWN = 0;
    // Field type double.
    TYPE_DOUBLE = 1;
    // Field type float.
    TYPE_FLOAT = 2;
    // Field type int64.
    TYPE_INT64 = 3;
    // Field type uint64.
    TYPE_UINT64 = 4;
    // Field type int32.
    TYPE_INT32 = 5;
    // Field type fixed64.
    TYPE_FIXED64 = 6;
    // Field type fixed32.
    TYPE_FIXED32 = 7;
    // Field type bool.
    TYPE_BOOL = 8;
    // Field type string.
    TYPE_STRING = 9;
    // Field type group. Proto2 syntax only, and deprecated.
    TYPE_GROUP = 10;
    // Field type message.
    TYPE_MESSAGE = 11;
    // Field type bytes.
    TYPE_BYTES = 12;
    // Field type uint32.
    TYPE_UINT32 = 13;
    // Field type enum.
    TYPE_ENUM = 14;
    // Field type sfixed32.
    TYPE_SFIXED32 = 15;
    // Field type sfixed64.
    TYPE_SFIXED64 = 16;
    // Field type sint32.
    TYPE_SINT32 = 17;
    // Field type sint64.
    TYPE_SINT64 = 18;
  }

  // Whether a field is optional, required, or repeated.
  enum Cardinality {
    // For fields with unknown cardinality.
    CARDINALITY_UNKNOWN = 0;
    // For optional fields.
    CARDINALITY_OPTIONAL = 1;
    // For required fields. Proto2 syntax only.
    CARDINALITY_REQUIRED = 2;
    // For repeated fields.
    CARDINALITY_REPEATED = 3;
  }

  // The field type.
  Kind kind = 1;
  // The field cardinality.
  Cardinality cardinality = 2;
  // The field number.
  int32 number = 3;
  // The field name.
  string name = 4;
  // The field type URL, without the scheme, for message or enumeration
  // types. Example: `"type.googleapis.com/google.protobuf.Timestamp"`.
  string type_url = 6;
  // The index of the field type in `Type.oneofs`, for message or enumeration
  // types. The first type has index 1; zero means the type is not in the list.
  int32 oneof_index = 7;
  // Whether to use alternative packed wire representation.
  bool packed = 8;
  // The protocol buffer options.
  repeated Option options = 9;
  // The field JSON name.
  string json_name = 10;
  // The string value of the default value of this field. Proto2 syntax only.
  string default_value = 11;
}

// Enum type definition.
message Enum {
  // Enum type name.
  string name = 1;
  // Enum value definitions.
  repeated EnumValue enumvalue = 2;
  // Protocol buffer options.
  repeated Option options = 3;
  // The source context.
  SourceContext source_context = 4;
  // The source syntax.
  Syntax syntax = 5;
  // The source edition string, only valid when syntax is SYNTAX_EDITIONS.
  string edition = 6;
}

// Enum value definition.
message EnumValue {
  // Enum value name.
  string name = 1;
  // Enum value number.
  int32 number = 2;
  // Protocol buffer options.
  repeated Option options = 3;
}

// A protocol buffer option, which can be attached to a message, field,
// enumeration, etc.
message Option {
  // The option's name. For protobuf built-in options (options defined in
  // descriptor.proto), this is the short name. For example, `"map_entry"`.
  // For custom options, it should be the fully-qualified name. For example,
  // `"google.api.http"`.
  string name = 1;
  // The option's value packed in an Any message. If the value is a primitive,
  // the corresponding wrapper type defined in google/protobuf/wrappers.proto
  // should be used. If the value is an enum, it should be stored as an int32
  // value using the google.protobuf.Int32Value type.
  Any value = 2;
}

// The syntax in which a protocol buffer element is defined.
enum Syntax {
  // Syntax `proto2`.
  SYNTAX_PROTO2 = 0;
  // Syntax `proto3`.
  SYNTAX_PROTO3 = 1;
  // Syntax `editions`.
  SYNTAX_EDITIONS = 2;
}
