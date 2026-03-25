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
//
// Wrappers for primitive (non-message) types. These types are useful
// for embedding primitives in the `google.protobuf.Any` type and for places
// where we need to distinguish between the absence of a primitive
// typed field and its default value.
//
// These wrappers have no meaningful use within repeated fields as they lack
// the ability to detect presence on individual elements.
// These wrappers have no meaningful use within a map or a oneof since
// individual entries of a map or fields of a oneof can already detect presence.

syntax = "proto3";

package google.protobuf;

option cc_enable_arenas = true;
option go_package = "google.golang.org/protobuf/types/known/wrapperspb";
option java_package = "com.google.protobuf";
option java_outer_classname = "WrappersProto";
option java_multiple_files = true;
option objc_class_prefix = "GPB";
option csharp_namespace = "Google.Protobuf.WellKnownTypes";

// Wrapper message for `double`.
//
// The JSON representation for `DoubleValue` is JSON number.
message DoubleValue {
  // The double value.
  double value = 1;
}

// Wrapper message for `float`.
//
// The JSON representation for `FloatValue` is JSON number.
message FloatValue {
  // The float value.
  float value = 1;
}

// Wrapper message for `int64`.
//
// The JSON representation for `Int64Value` is JSON string.
message Int64Value {
  // The int64 value.
  int64 value = 1;
}

// Wrapper message for `uint64`.
//
// The JSON representation for `UInt64Value` is JSON string.
message UInt64Value {
  // The uint64 value.
  uint64 value = 1;
}

// Wrapper message for `int32`.
//
// The JSON representation for `Int32Value` is JSON number.
message Int32Value {
  // The int32 value.
  int32 value = 1;
}

// Wrapper message for `uint32`.
//
// The JSON representation for `UInt32Value` is JSON number.
message UInt32Value {
  // The uint32 value.
  uint32 value = 1;
}

// Wrapper message for `bool`.
//
// The JSON representation for `BoolValue` is JSON `true` and `false`.
message BoolValue {
  // The bool value.
  bool value = 1;
}

// Wrapper message for `string`.
//
// The JSON representation for `StringValue` is JSON string.
message StringValue {
  // The string value.
  string value = 1;
}

// Wrapper message for `bytes`.
//
// The JSON representation for `BytesValue` is JSON string.
message BytesValue {
  // The bytes value.
  bytes value = 1;
}
