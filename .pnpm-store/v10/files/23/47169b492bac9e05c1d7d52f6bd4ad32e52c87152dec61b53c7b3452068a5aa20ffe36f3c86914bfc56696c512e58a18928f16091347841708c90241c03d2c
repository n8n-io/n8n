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

import "google/api/label.proto";

option go_package = "google.golang.org/genproto/googleapis/api/serviceconfig;serviceconfig";
option java_multiple_files = true;
option java_outer_classname = "LogProto";
option java_package = "com.google.api";
option objc_class_prefix = "GAPI";

// A description of a log type. Example in YAML format:
//
//     - name: library.googleapis.com/activity_history
//       description: The history of borrowing and returning library items.
//       display_name: Activity
//       labels:
//       - key: /customer_id
//         description: Identifier of a library customer
message LogDescriptor {
  // The name of the log. It must be less than 512 characters long and can
  // include the following characters: upper- and lower-case alphanumeric
  // characters [A-Za-z0-9], and punctuation characters including
  // slash, underscore, hyphen, period [/_-.].
  string name = 1;

  // The set of labels that are available to describe a specific log entry.
  // Runtime requests that contain labels not specified here are
  // considered invalid.
  repeated LabelDescriptor labels = 2;

  // A human-readable description of this log. This information appears in
  // the documentation and can contain details.
  string description = 3;

  // The human-readable name for this log. This information appears on
  // the user interface and should be concise.
  string display_name = 4;
}
