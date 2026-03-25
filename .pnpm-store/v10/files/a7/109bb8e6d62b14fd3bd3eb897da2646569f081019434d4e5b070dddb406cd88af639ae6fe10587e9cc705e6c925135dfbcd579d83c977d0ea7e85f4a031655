// Protocol Buffers - Google's data interchange format
// Copyright 2008 Google Inc.  All rights reserved.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file or at
// https://developers.google.com/open-source/licenses/bsd

syntax = "proto2";

package A.B.C;

import "ruby_generated_code_proto2_import.proto";

message TestMessage {
  optional int32 optional_int32 = 1 [default = 1];
  optional int64 optional_int64 = 2 [default = 2];
  optional uint32 optional_uint32 = 3 [default = 3];
  optional uint64 optional_uint64 = 4 [default = 4];
  optional bool optional_bool = 5 [default = true];
  optional double optional_double = 6 [default = 6.0];
  optional float optional_float = 7 [default = 7.0];
  optional string optional_string = 8 [default = "default str"];
  optional bytes optional_bytes = 9 [default = "\0\1\2\100fubar"];
  optional TestEnum optional_enum = 10 [default = A];
  optional TestMessage optional_msg = 11;
  optional TestImportedMessage optional_proto2_submessage = 12;

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

  required int32 required_int32 = 41;
  required int64 required_int64 = 42;
  required uint32 required_uint32 = 43;
  required uint64 required_uint64 = 44;
  required bool required_bool = 45;
  required double required_double = 46;
  required float required_float = 47;
  required string required_string = 48;
  required bytes required_bytes = 49;
  required TestEnum required_enum = 50;
  required TestMessage required_msg = 51;

  oneof my_oneof {
    int32 oneof_int32 = 61;
    int64 oneof_int64 = 62;
    uint32 oneof_uint32 = 63;
    uint64 oneof_uint64 = 64;
    bool oneof_bool = 65;
    double oneof_double = 66;
    float oneof_float = 67;
    string oneof_string = 68;
    bytes oneof_bytes = 69;
    TestEnum oneof_enum = 70;
    TestMessage oneof_msg = 71;
  }

  message NestedMessage {
    optional int32 foo = 1;
  }

  optional NestedMessage nested_message = 80;
}

enum TestEnum {
  Default = 0;
  A = 1;
  B = 2;
  C = 3;
}
