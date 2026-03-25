// Copyright 2023 Google LLC
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

syntax = "proto3";

package google.api;

option cc_enable_arenas = true;
option go_package = "google.golang.org/genproto/googleapis/api/label;label";
option java_multiple_files = true;
option java_outer_classname = "LabelProto";
option java_package = "com.google.api";
option objc_class_prefix = "GAPI";

// A description of a label.
message LabelDescriptor {
  // Value types that can be used as label values.
  enum ValueType {
    // A variable-length string. This is the default.
    STRING = 0;

    // Boolean; true or false.
    BOOL = 1;

    // A 64-bit signed integer.
    INT64 = 2;
  }

  // The label key.
  string key = 1;

  // The type of data that can be assigned to the label.
  ValueType value_type = 2;

  // A human-readable description for the label.
  string description = 3;
}
