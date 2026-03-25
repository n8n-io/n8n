// Protocol Buffers - Google's data interchange format
// Copyright 2023 Google Inc.  All rights reserved.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file or at
// https://developers.google.com/open-source/licenses/bsd

syntax = "proto2";

package protobuf_editions_test.proto2;

import "google/protobuf/editions/codegen_tests/proto3_enum.proto";

message Proto2ImportedEnumMessage {
  optional protobuf_editions_test.proto3.Proto3Enum enum_field = 1;
  optional protobuf_editions_test.proto3.Proto3Enum enum_field_default = 2
      [default = BAZ];
}
