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

import "google/api/policy.proto";

option go_package = "google.golang.org/genproto/googleapis/api/serviceconfig;serviceconfig";
option java_multiple_files = true;
option java_outer_classname = "ControlProto";
option java_package = "com.google.api";
option objc_class_prefix = "GAPI";

// Selects and configures the service controller used by the service.
//
// Example:
//
//     control:
//       environment: servicecontrol.googleapis.com
message Control {
  // The service controller environment to use. If empty, no control plane
  // feature (like quota and billing) will be enabled. The recommended value for
  // most services is servicecontrol.googleapis.com
  string environment = 1;

  // Defines policies applying to the API methods of the service.
  repeated MethodPolicy method_policies = 4;
}
