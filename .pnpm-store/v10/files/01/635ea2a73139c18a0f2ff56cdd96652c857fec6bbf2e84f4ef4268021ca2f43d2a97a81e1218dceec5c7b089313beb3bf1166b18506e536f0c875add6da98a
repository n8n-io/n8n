// Copyright 2017 Google Inc.
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

package google.iam.v1.logging;

import "google/iam/v1/policy.proto";

option csharp_namespace = "Google.Cloud.Iam.V1.Logging";
option go_package = "cloud.google.com/go/iam/apiv1/logging/loggingpb;loggingpb";
option java_multiple_files = true;
option java_outer_classname = "AuditDataProto";
option java_package = "com.google.iam.v1.logging";

// Audit log information specific to Cloud IAM. This message is serialized
// as an `Any` type in the `ServiceData` message of an
// `AuditLog` message.
message AuditData {
  // Policy delta between the original policy and the newly set policy.
  google.iam.v1.PolicyDelta policy_delta = 2;
}
