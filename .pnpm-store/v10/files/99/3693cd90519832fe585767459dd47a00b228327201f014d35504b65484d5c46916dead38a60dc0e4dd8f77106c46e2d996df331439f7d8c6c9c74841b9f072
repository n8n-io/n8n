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

option go_package = "google.golang.org/genproto/googleapis/api/serviceconfig;serviceconfig";
option java_multiple_files = true;
option java_outer_classname = "UsageProto";
option java_package = "com.google.api";
option objc_class_prefix = "GAPI";

// Configuration controlling usage of a service.
message Usage {
  // Requirements that must be satisfied before a consumer project can use the
  // service. Each requirement is of the form <service.name>/<requirement-id>;
  // for example 'serviceusage.googleapis.com/billing-enabled'.
  //
  // For Google APIs, a Terms of Service requirement must be included here.
  // Google Cloud APIs must include "serviceusage.googleapis.com/tos/cloud".
  // Other Google APIs should include
  // "serviceusage.googleapis.com/tos/universal". Additional ToS can be
  // included based on the business needs.
  repeated string requirements = 1;

  // A list of usage rules that apply to individual API methods.
  //
  // **NOTE:** All service configuration rules follow "last one wins" order.
  repeated UsageRule rules = 6;

  // The full resource name of a channel used for sending notifications to the
  // service producer.
  //
  // Google Service Management currently only supports
  // [Google Cloud Pub/Sub](https://cloud.google.com/pubsub) as a notification
  // channel. To use Google Cloud Pub/Sub as the channel, this must be the name
  // of a Cloud Pub/Sub topic that uses the Cloud Pub/Sub topic name format
  // documented in https://cloud.google.com/pubsub/docs/overview.
  string producer_notification_channel = 7;
}

// Usage configuration rules for the service.
//
// NOTE: Under development.
//
//
// Use this rule to configure unregistered calls for the service. Unregistered
// calls are calls that do not contain consumer project identity.
// (Example: calls that do not contain an API key).
// By default, API methods do not allow unregistered calls, and each method call
// must be identified by a consumer project identity. Use this rule to
// allow/disallow unregistered calls.
//
// Example of an API that wants to allow unregistered calls for entire service.
//
//     usage:
//       rules:
//       - selector: "*"
//         allow_unregistered_calls: true
//
// Example of a method that wants to allow unregistered calls.
//
//     usage:
//       rules:
//       - selector: "google.example.library.v1.LibraryService.CreateBook"
//         allow_unregistered_calls: true
message UsageRule {
  // Selects the methods to which this rule applies. Use '*' to indicate all
  // methods in all APIs.
  //
  // Refer to [selector][google.api.DocumentationRule.selector] for syntax
  // details.
  string selector = 1;

  // If true, the selected method allows unregistered calls, e.g. calls
  // that don't identify any user or application.
  bool allow_unregistered_calls = 2;

  // If true, the selected method should skip service control and the control
  // plane features, such as quota and billing, will not be available.
  // This flag is used by Google Cloud Endpoints to bypass checks for internal
  // methods, such as service health check methods.
  bool skip_service_control = 3;
}
