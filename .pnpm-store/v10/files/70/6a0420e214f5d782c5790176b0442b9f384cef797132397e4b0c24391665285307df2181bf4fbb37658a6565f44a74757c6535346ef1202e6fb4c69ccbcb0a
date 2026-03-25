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
option java_outer_classname = "BillingProto";
option java_package = "com.google.api";
option objc_class_prefix = "GAPI";

// Billing related configuration of the service.
//
// The following example shows how to configure monitored resources and metrics
// for billing, `consumer_destinations` is the only supported destination and
// the monitored resources need at least one label key
// `cloud.googleapis.com/location` to indicate the location of the billing
// usage, using different monitored resources between monitoring and billing is
// recommended so they can be evolved independently:
//
//
//     monitored_resources:
//     - type: library.googleapis.com/billing_branch
//       labels:
//       - key: cloud.googleapis.com/location
//         description: |
//           Predefined label to support billing location restriction.
//       - key: city
//         description: |
//           Custom label to define the city where the library branch is located
//           in.
//       - key: name
//         description: Custom label to define the name of the library branch.
//     metrics:
//     - name: library.googleapis.com/book/borrowed_count
//       metric_kind: DELTA
//       value_type: INT64
//       unit: "1"
//     billing:
//       consumer_destinations:
//       - monitored_resource: library.googleapis.com/billing_branch
//         metrics:
//         - library.googleapis.com/book/borrowed_count
message Billing {
  // Configuration of a specific billing destination (Currently only support
  // bill against consumer project).
  message BillingDestination {
    // The monitored resource type. The type must be defined in
    // [Service.monitored_resources][google.api.Service.monitored_resources]
    // section.
    string monitored_resource = 1;

    // Names of the metrics to report to this billing destination.
    // Each name must be defined in
    // [Service.metrics][google.api.Service.metrics] section.
    repeated string metrics = 2;
  }

  // Billing configurations for sending metrics to the consumer project.
  // There can be multiple consumer destinations per service, each one must have
  // a different monitored resource type. A metric can be used in at most
  // one consumer destination.
  repeated BillingDestination consumer_destinations = 8;
}
