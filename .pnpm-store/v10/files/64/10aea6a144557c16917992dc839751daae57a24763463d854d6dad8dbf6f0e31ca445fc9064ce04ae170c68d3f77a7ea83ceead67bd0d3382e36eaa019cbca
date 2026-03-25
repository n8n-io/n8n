// Protocol Buffers - Google's data interchange format
// Copyright 2023 Google Inc.  All rights reserved.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file or at
// https://developers.google.com/open-source/licenses/bsd

syntax = "proto2";

import "google/protobuf/editions/proto/editions_transform_proto3.proto";

// This file contains various edge cases we've collected from migrating real
// protos in order to lock down the transformations.

// LINT: ALLOW_GROUPS

package protobuf_editions_test;

option java_multiple_files = true;
option cc_enable_arenas = true;

message EmptyMessage {}
message EmptyMessage2 {}

service EmptyService {}

service BasicService {
  rpc BasicMethod(EmptyMessage) returns (EmptyMessage) {}
}

// clang-format off
message UnformattedMessage{
  optional int32 a=1 ;
  optional group Foo = 2 { optional int32 a = 1; }
  optional string string_piece_with_zero = 3 [ctype=STRING_PIECE,
                                               default="ab\000c"];
  optional float
      long_float_name_wrapped = 4;

}
// clang-format on

message ParentMessage {
  message ExtendedMessage {
    extensions 536860000 to 536869999 [declaration = {
      number: 536860000
      full_name: ".protobuf_editions_test.extension"
      type: ".protobuf_editions_test.EmptyMessage"
    }];
  }
}

extend ParentMessage.ExtendedMessage {
  optional EmptyMessage extension = 536860000;
}

message TestMessage {
  optional string string_field = 1;

  map<string, string> string_map_field = 7;

  repeated int32 int_field = 8;
  repeated int32 int_field_packed = 9 [packed = true];
  repeated int32 int_field_unpacked = 10 [packed = false];

  repeated int32 options_strip_beginning = 4 [
    packed = false,
    /* inline comment*/ debug_redact = true,
    deprecated = false
  ];
  repeated int32 options_strip_middle = 5
      [debug_redact = true, packed = false, deprecated = false];
  repeated int32 options_strip_end = 6
      [debug_redact = true, deprecated = false, packed = false];

  optional group OptionalGroup = 16 {
    optional int32 a = 17;
  }
}

enum TestEnum {
  FOO = 1;  // Non-zero default
  BAR = 2;
  BAZ = 3;
  NEG = -1;  // Intentionally negative.
}

message TestOpenEnumMessage {
  optional TestEnumProto3 open_enum_field = 1;
  optional TestEnum closed_enum_field = 2;
}