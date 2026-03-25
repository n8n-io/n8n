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

import "google/protobuf/any.proto";
import "google/protobuf/struct.proto";

option cc_enable_arenas = true;
option go_package = "google.golang.org/genproto/googleapis/api/expr/v1beta1;expr";
option java_multiple_files = true;
option java_outer_classname = "ValueProto";
option java_package = "com.google.api.expr.v1beta1";

// Represents a CEL value.
//
// This is similar to `google.protobuf.Value`, but can represent CEL's full
// range of values.
message Value {
  // Required. The valid kinds of values.
  oneof kind {
    // Null value.
    google.protobuf.NullValue null_value = 1;

    // Boolean value.
    bool bool_value = 2;

    // Signed integer value.
    int64 int64_value = 3;

    // Unsigned integer value.
    uint64 uint64_value = 4;

    // Floating point value.
    double double_value = 5;

    // UTF-8 string value.
    string string_value = 6;

    // Byte string value.
    bytes bytes_value = 7;

    // An enum value.
    EnumValue enum_value = 9;

    // The proto message backing an object value.
    google.protobuf.Any object_value = 10;

    // Map value.
    MapValue map_value = 11;

    // List value.
    ListValue list_value = 12;

    // A Type value represented by the fully qualified name of the type.
    string type_value = 15;
  }
}

// An enum value.
message EnumValue {
  // The fully qualified name of the enum type.
  string type = 1;

  // The value of the enum.
  int32 value = 2;
}

// A list.
//
// Wrapped in a message so 'not set' and empty can be differentiated, which is
// required for use in a 'oneof'.
message ListValue {
  // The ordered values in the list.
  repeated Value values = 1;
}

// A map.
//
// Wrapped in a message so 'not set' and empty can be differentiated, which is
// required for use in a 'oneof'.
message MapValue {
  // An entry in the map.
  message Entry {
    // The key.
    //
    // Must be unique with in the map.
    // Currently only boolean, int, uint, and string values can be keys.
    Value key = 1;

    // The value.
    Value value = 2;
  }

  // The set of map entries.
  //
  // CEL has fewer restrictions on keys, so a protobuf map represenation
  // cannot be used.
  repeated Entry entries = 1;
}
