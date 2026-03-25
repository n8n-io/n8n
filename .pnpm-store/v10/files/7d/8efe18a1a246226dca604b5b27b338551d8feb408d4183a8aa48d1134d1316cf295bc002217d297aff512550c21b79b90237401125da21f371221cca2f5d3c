// Protocol Buffers - Google's data interchange format
// Copyright 2023 Google Inc.  All rights reserved.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file or at
// https://developers.google.com/open-source/licenses/bsd

syntax = "proto3";

package protobuf_editions_test.proto3;

enum Proto3Enum {
  UNKNOWN = 0;
  BAR = 1;
  BAZ = 2;
}

message Proto3EnumMessage {
  Proto3Enum enum_field = 1;
  enum Proto3NestedEnum {
    UNKNOWN = 0;
    FOO = 1;
    BAT = 2;
  }
  optional Proto3NestedEnum nested_enum_field = 3;
}
