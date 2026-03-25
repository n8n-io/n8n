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
option java_outer_classname = "LoggingProto";
option java_package = "com.google.api";
option objc_class_prefix = "GAPI";

// Logging configuration of the service.
//
// The following example shows how to configure logs to be sent to the
// producer and consumer projects. In the example, the `activity_history`
// log is sent to both the producer and consumer projects, whereas the
// `purchase_history` log is only sent to the producer project.
//
//     monitored_resources:
//     - type: library.googleapis.com/branch
//       labels:
//       - key: /city
//         description: The city where the library branch is located in.
//       - key: /name
//         description: The name of the branch.
//     logs:
//     - name: activity_history
//       labels:
//       - key: /customer_id
//     - name: purchase_history
//     logging:
//       producer_destinations:
//       - monitored_resource: library.googleapis.com/branch
//         logs:
//         - activity_history
//         - purchase_history
//       consumer_destinations:
//       - monitored_resource: library.googleapis.com/branch
//         logs:
//         - activity_history
message Logging {
  // Configuration of a specific logging destination (the producer project
  // or the consumer project).
  message LoggingDestination {
    // The monitored resource type. The type must be defined in the
    // [Service.monitored_resources][google.api.Service.monitored_resources]
    // section.
    string monitored_resource = 3;

    // Names of the logs to be sent to this destination. Each name must
    // be defined in the [Service.logs][google.api.Service.logs] section. If the
    // log name is not a domain scoped name, it will be automatically prefixed
    // with the service name followed by "/".
    repeated string logs = 1;
  }

  // Logging configurations for sending logs to the producer project.
  // There can be multiple producer destinations, each one must have a
  // different monitored resource type. A log can be used in at most
  // one producer destination.
  repeated LoggingDestination producer_destinations = 1;

  // Logging configurations for sending logs to the consumer project.
  // There can be multiple consumer destinations, each one must have a
  // different monitored resource type. A log can be used in at most
  // one consumer destination.
  repeated LoggingDestination consumer_destinations = 2;
}
