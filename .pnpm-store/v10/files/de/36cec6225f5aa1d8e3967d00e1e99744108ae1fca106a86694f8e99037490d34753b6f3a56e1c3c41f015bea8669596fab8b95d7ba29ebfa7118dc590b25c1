// Protocol Buffers - Google's data interchange format
// Copyright 2008 Google Inc.  All rights reserved.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file or at
// https://developers.google.com/open-source/licenses/bsd

syntax = "proto3";

package A.B.C;

import "ruby_generated_code_proto2_import.proto";

message TestMessage {
  int32 optional_int32 = 1;
  int64 optional_int64 = 2;
  uint32 optional_uint32 = 3;
  uint64 optional_uint64 = 4;
  bool optional_bool = 5;
  double optional_double = 6;
  float optional_float = 7;
  string optional_string = 8;
  bytes optional_bytes = 9;
  TestEnum optional_enum = 10;
  TestMessage optional_msg = 11;
  TestImportedMessage optional_proto2_submessage = 12;

  repeated int32 repeated_int32 = 21;
  repeated int64 repeated_int64 = 22;
  repeated uint32 repeated_uint32 = 23;
  repeated uint64 repeated_uint64 = 24;
  repeated bool repeated_bool = 25;
  repeated double repeated_double = 26;
  repeated float repeated_float = 27;
  repeated string repeated_string = 28;
  repeated bytes repeated_bytes = 29;
  repeated TestEnum repeated_enum = 30;
  repeated TestMessage repeated_msg = 31;

  oneof my_oneof {
    int32 oneof_int32 = 41;
    int64 oneof_int64 = 42;
    uint32 oneof_uint32 = 43;
    uint64 oneof_uint64 = 44;
    bool oneof_bool = 45;
    double oneof_double = 46;
    float oneof_float = 47;
    string oneof_string = 48;
    bytes oneof_bytes = 49;
    TestEnum oneof_enum = 50;
    TestMessage oneof_msg = 51;
  }

  map<int32, string> map_int32_string = 61;
  map<int64, string> map_int64_string = 62;
  map<uint32, string> map_uint32_string = 63;
  map<uint64, string> map_uint64_string = 64;
  map<bool, string> map_bool_string = 65;
  map<string, string> map_string_string = 66;
  map<string, TestMessage> map_string_msg = 67;
  map<string, TestEnum> map_string_enum = 68;
  map<string, int32> map_string_int32 = 69;
  map<string, bool> map_string_bool = 70;

  message NestedMessage {
    int32 foo = 1;
  }

  NestedMessage nested_message = 80;
}

enum TestEnum {
  Default = 0;
  A = 1;
  B = 2;
  C = 3;
}
