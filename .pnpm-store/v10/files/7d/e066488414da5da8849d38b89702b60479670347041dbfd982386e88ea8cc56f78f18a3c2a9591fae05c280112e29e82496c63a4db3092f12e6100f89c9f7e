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

import "google/protobuf/any.proto";

option go_package = "google.golang.org/genproto/googleapis/api/serviceconfig;serviceconfig";
option java_multiple_files = true;
option java_outer_classname = "SourceInfoProto";
option java_package = "com.google.api";
option objc_class_prefix = "GAPI";

// Source information used to create a Service Config
message SourceInfo {
  // All files used during config generation.
  repeated google.protobuf.Any source_files = 1;
}
