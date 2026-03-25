// Protocol Buffers - Google's data interchange format
// Copyright 2008 Google Inc.  All rights reserved.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file or at
// https://developers.google.com/open-source/licenses/bsd

syntax = "proto3";

package proto3;

import "google/protobuf/any.proto";
import "google/protobuf/duration.proto";
import "google/protobuf/field_mask.proto";
import "google/protobuf/struct.proto";
import "google/protobuf/timestamp.proto";
import "google/protobuf/wrappers.proto";
import "google/protobuf/unittest.proto";

option java_package = "com.google.protobuf.util";
option java_outer_classname = "JsonFormatProto3";

enum EnumType {
  FOO = 0;
  BAR = 1;
  TLSv1_2 = 2;
}

message MessageType {
  int32 value = 1;
}

message TestMessage {
  bool bool_value = 1;
  int32 int32_value = 2;
  int64 int64_value = 3;
  uint32 uint32_value = 4;
  uint64 uint64_value = 5;
  float float_value = 6;
  double double_value = 7;
  string string_value = 8;
  bytes bytes_value = 9;
  EnumType enum_value = 10;
  MessageType message_value = 11;

  repeated bool repeated_bool_value = 21;
  repeated int32 repeated_int32_value = 22;
  repeated int64 repeated_int64_value = 23;
  repeated uint32 repeated_uint32_value = 24;
  repeated uint64 repeated_uint64_value = 25;
  repeated float repeated_float_value = 26;
  repeated double repeated_double_value = 27;
  repeated string repeated_string_value = 28;
  repeated bytes repeated_bytes_value = 29;
  repeated EnumType repeated_enum_value = 30;
  repeated MessageType repeated_message_value = 31;

  optional bool optional_bool_value = 41;
  optional int32 optional_int32_value = 42;
  optional int64 optional_int64_value = 43;
  optional uint32 optional_uint32_value = 44;
  optional uint64 optional_uint64_value = 45;
  optional float optional_float_value = 46;
  optional double optional_double_value = 47;
  optional string optional_string_value = 48;
  optional bytes optional_bytes_value = 49;
  optional EnumType optional_enum_value = 50;
  optional MessageType optional_message_value = 51;
}

message TestOneof {
  // In JSON format oneof fields behave mostly the same as optional
  // fields except that:
  //   1. Oneof fields have field presence information and will be
  //      printed if it's set no matter whether it's the default value.
  //   2. Multiple oneof fields in the same oneof cannot appear at the
  //      same time in the input.
  oneof oneof_value {
    int32 oneof_int32_value = 1;
    string oneof_string_value = 2;
    bytes oneof_bytes_value = 3;
    EnumType oneof_enum_value = 4;
    MessageType oneof_message_value = 5;
    google.protobuf.NullValue oneof_null_value = 6;
  }
}

message TestMap {
  map<bool, int32> bool_map = 1;
  map<int32, int32> int32_map = 2;
  map<int64, int32> int64_map = 3;
  map<uint32, int32> uint32_map = 4;
  map<uint64, int32> uint64_map = 5;
  map<string, int32> string_map = 6;
}

message TestNestedMap {
  map<bool, int32> bool_map = 1;
  map<int32, int32> int32_map = 2;
  map<int64, int32> int64_map = 3;
  map<uint32, int32> uint32_map = 4;
  map<uint64, int32> uint64_map = 5;
  map<string, int32> string_map = 6;
  map<string, TestNestedMap> map_map = 7;
}

message TestStringMap {
  map<string, string> string_map = 1;
}

message TestWrapper {
  google.protobuf.BoolValue bool_value = 1;
  google.protobuf.Int32Value int32_value = 2;
  google.protobuf.Int64Value int64_value = 3;
  google.protobuf.UInt32Value uint32_value = 4;
  google.protobuf.UInt64Value uint64_value = 5;
  google.protobuf.FloatValue float_value = 6;
  google.protobuf.DoubleValue double_value = 7;
  google.protobuf.StringValue string_value = 8;
  google.protobuf.BytesValue bytes_value = 9;

  repeated google.protobuf.BoolValue repeated_bool_value = 11;
  repeated google.protobuf.Int32Value repeated_int32_value = 12;
  repeated google.protobuf.Int64Value repeated_int64_value = 13;
  repeated google.protobuf.UInt32Value repeated_uint32_value = 14;
  repeated google.protobuf.UInt64Value repeated_uint64_value = 15;
  repeated google.protobuf.FloatValue repeated_float_value = 16;
  repeated google.protobuf.DoubleValue repeated_double_value = 17;
  repeated google.protobuf.StringValue repeated_string_value = 18;
  repeated google.protobuf.BytesValue repeated_bytes_value = 19;
}

message TestTimestamp {
  google.protobuf.Timestamp value = 1;
  repeated google.protobuf.Timestamp repeated_value = 2;
}

message TestDuration {
  google.protobuf.Duration value = 1;
  repeated google.protobuf.Duration repeated_value = 2;
}

message TestFieldMask {
  google.protobuf.FieldMask value = 1;
}

message TestStruct {
  google.protobuf.Struct value = 1;
  repeated google.protobuf.Struct repeated_value = 2;
}

message TestAny {
  google.protobuf.Any value = 1;
  repeated google.protobuf.Any repeated_value = 2;
}

message TestValue {
  google.protobuf.Value value = 1;
  repeated google.protobuf.Value repeated_value = 2;
}

message TestListValue {
  google.protobuf.ListValue value = 1;
  repeated google.protobuf.ListValue repeated_value = 2;
}

message TestBoolValue {
  bool bool_value = 1;
  map<bool, int32> bool_map = 2;
}

message TestNullValue {
  google.protobuf.NullValue null_value = 20;
  repeated google.protobuf.NullValue repeated_null_value = 21;
}

message TestCustomJsonName {
  int32 value = 1 [json_name = "@value"];
}

message TestEvilJson {
  int32 regular_value = 1 [json_name = "regular_name"];
  int32 script = 2 [json_name = "</script>"];
  int32 quotes = 3 [json_name = "unbalanced\"quotes"];
  int32 script_and_quotes = 4
      [json_name = "\"<script>alert('hello!);</script>"];
}

message TestExtensions {
  .protobuf_unittest.TestAllExtensions extensions = 1;
}

message TestEnumValue {
  EnumType enum_value1 = 1;
  EnumType enum_value2 = 2;
  EnumType enum_value3 = 3;
}

message MapsTestCases {
  EmptyMap empty_map = 1;
  StringtoInt string_to_int = 2;
  IntToString int_to_string = 3;
  Mixed1 mixed1 = 4;
  Mixed2 mixed2 = 5;
  MapOfObjects map_of_objects = 6;

  // Empty key tests
  StringtoInt empty_key_string_to_int1 = 7;
  StringtoInt empty_key_string_to_int2 = 8;
  StringtoInt empty_key_string_to_int3 = 9;
  BoolToString empty_key_bool_to_string = 10;
  IntToString empty_key_int_to_string = 11;
  Mixed1 empty_key_mixed = 12;
  MapOfObjects empty_key_map_objects = 13;
}

message EmptyMap {
  map<int32, int32> map = 1;
}

message StringtoInt {
  map<string, int32> map = 1;
}

message IntToString {
  map<int32, string> map = 1;
}

message BoolToString {
  map<bool, string> map = 1;
}

message Mixed1 {
  string msg = 1;
  map<string, float> map = 2;
}

message Mixed2 {
  enum E {
    E0 = 0;
    E1 = 1;
    E2 = 2;
    E3 = 3;
  }
  map<int32, bool> map = 1;
  E ee = 2;
}

message MapOfObjects {
  message M {
    string inner_text = 1;
  }
  map<string, M> map = 1;
}

message MapIn {
  string other = 1;
  repeated string things = 2;
  map<string, string> map_input = 3;
  map<string, google.protobuf.Any> map_any = 4;
}

message MapOut {
  map<string, MapM> map1 = 1;
  map<string, MapOut> map2 = 2;
  map<int32, string> map3 = 3;
  map<bool, string> map4 = 5;
  string bar = 4;
}

// A message with exactly the same wire representation as MapOut, but using
// repeated message fields instead of map fields. We use this message to test
// the wire-format compatibility of the JSON transcoder (e.g., whether it
// handles missing keys correctly).
message MapOutWireFormat {
  message Map1Entry {
    string key = 1;
    MapM value = 2;
  }
  repeated Map1Entry map1 = 1;
  message Map2Entry {
    string key = 1;
    MapOut value = 2;
  }
  repeated Map2Entry map2 = 2;
  message Map3Entry {
    int32 key = 1;
    string value = 2;
  }
  repeated Map3Entry map3 = 3;
  message Map4Entry {
    bool key = 1;
    string value = 2;
  }
  repeated Map4Entry map4 = 5;
  string bar = 4;
}

message MapM {
  string foo = 1;
}
