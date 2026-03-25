// Copyright 2021 Google LLC
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

package google.api.servicecontrol.v1;

import "google/api/servicecontrol/v1/log_entry.proto";
import "google/api/servicecontrol/v1/metric_value.proto";
import "google/protobuf/any.proto";
import "google/protobuf/timestamp.proto";

option cc_enable_arenas = true;
option csharp_namespace = "Google.Cloud.ServiceControl.V1";
option go_package = "cloud.google.com/go/servicecontrol/apiv1/servicecontrolpb;servicecontrolpb";
option java_multiple_files = true;
option java_outer_classname = "OperationProto";
option java_package = "com.google.api.servicecontrol.v1";
option php_namespace = "Google\\Cloud\\ServiceControl\\V1";
option ruby_package = "Google::Cloud::ServiceControl::V1";

// Represents information regarding an operation.
message Operation {
  // Defines the importance of the data contained in the operation.
  enum Importance {
    // Allows data caching, batching, and aggregation. It provides
    // higher performance with higher data loss risk.
    LOW = 0;

    // Disables data aggregation to minimize data loss. It is for operations
    // that contains significant monetary value or audit trail. This feature
    // only applies to the client libraries.
    HIGH = 1;
  }

  // Identity of the operation. This must be unique within the scope of the
  // service that generated the operation. If the service calls
  // Check() and Report() on the same operation, the two calls should carry
  // the same id.
  //
  // UUID version 4 is recommended, though not required.
  // In scenarios where an operation is computed from existing information
  // and an idempotent id is desirable for deduplication purpose, UUID version 5
  // is recommended. See RFC 4122 for details.
  string operation_id = 1;

  // Fully qualified name of the operation. Reserved for future use.
  string operation_name = 2;

  // Identity of the consumer who is using the service.
  // This field should be filled in for the operations initiated by a
  // consumer, but not for service-initiated operations that are
  // not related to a specific consumer.
  //
  // - This can be in one of the following formats:
  //     - project:PROJECT_ID,
  //     - project`_`number:PROJECT_NUMBER,
  //     - projects/PROJECT_ID or PROJECT_NUMBER,
  //     - folders/FOLDER_NUMBER,
  //     - organizations/ORGANIZATION_NUMBER,
  //     - api`_`key:API_KEY.
  string consumer_id = 3;

  // Required. Start time of the operation.
  google.protobuf.Timestamp start_time = 4;

  // End time of the operation.
  // Required when the operation is used in
  // [ServiceController.Report][google.api.servicecontrol.v1.ServiceController.Report],
  // but optional when the operation is used in
  // [ServiceController.Check][google.api.servicecontrol.v1.ServiceController.Check].
  google.protobuf.Timestamp end_time = 5;

  // Labels describing the operation. Only the following labels are allowed:
  //
  // - Labels describing monitored resources as defined in
  //   the service configuration.
  // - Default labels of metric values. When specified, labels defined in the
  //   metric value override these default.
  // - The following labels defined by Google Cloud Platform:
  //     - `cloud.googleapis.com/location` describing the location where the
  //        operation happened,
  //     - `servicecontrol.googleapis.com/user_agent` describing the user agent
  //        of the API request,
  //     - `servicecontrol.googleapis.com/service_agent` describing the service
  //        used to handle the API request (e.g. ESP),
  //     - `servicecontrol.googleapis.com/platform` describing the platform
  //        where the API is served, such as App Engine, Compute Engine, or
  //        Kubernetes Engine.
  map<string, string> labels = 6;

  // Represents information about this operation. Each MetricValueSet
  // corresponds to a metric defined in the service configuration.
  // The data type used in the MetricValueSet must agree with
  // the data type specified in the metric definition.
  //
  // Within a single operation, it is not allowed to have more than one
  // MetricValue instances that have the same metric names and identical
  // label value combinations. If a request has such duplicated MetricValue
  // instances, the entire request is rejected with
  // an invalid argument error.
  repeated MetricValueSet metric_value_sets = 7;

  // Represents information to be logged.
  repeated LogEntry log_entries = 8;

  // DO NOT USE. This is an experimental field.
  Importance importance = 11;

  // Unimplemented.
  repeated google.protobuf.Any extensions = 16;
}
