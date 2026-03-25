// Protocol Buffers - Google's data interchange format
// Copyright 2023 Google Inc.  All rights reserved.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file or at
// https://developers.google.com/open-source/licenses/bsd

syntax = "proto3";

package protobuf_editions_test;

enum TestEnumProto3 {
  TEST_ENUM_PROTO3_UNKNOWN = 0;
  TEST_ENUM_PROTO3_VALUE = 1;
}

message TestMessageProto3 {
  string string_field = 1;

  map<string, string> string_map_field = 4;

  repeated int32 int_field = 7;
  repeated int32 int_field_packed = 8 [packed = true];
  repeated int32 int_field_unpacked = 9 [packed = false];
}
