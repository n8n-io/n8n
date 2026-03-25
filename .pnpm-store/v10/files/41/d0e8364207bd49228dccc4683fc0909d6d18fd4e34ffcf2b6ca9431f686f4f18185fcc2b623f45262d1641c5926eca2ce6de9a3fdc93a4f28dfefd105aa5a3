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

import "google/api/servicecontrol/v1/distribution.proto";
import "google/protobuf/timestamp.proto";

option cc_enable_arenas = true;
option csharp_namespace = "Google.Cloud.ServiceControl.V1";
option go_package = "cloud.google.com/go/servicecontrol/apiv1/servicecontrolpb;servicecontrolpb";
option java_multiple_files = true;
option java_outer_classname = "MetricValueSetProto";
option java_package = "com.google.api.servicecontrol.v1";
option php_namespace = "Google\\Cloud\\ServiceControl\\V1";
option ruby_package = "Google::Cloud::ServiceControl::V1";

// Represents a single metric value.
message MetricValue {
  // The labels describing the metric value.
  // See comments on [google.api.servicecontrol.v1.Operation.labels][google.api.servicecontrol.v1.Operation.labels] for
  // the overriding relationship.
  // Note that this map must not contain monitored resource labels.
  map<string, string> labels = 1;

  // The start of the time period over which this metric value's measurement
  // applies. The time period has different semantics for different metric
  // types (cumulative, delta, and gauge). See the metric definition
  // documentation in the service configuration for details. If not specified,
  // [google.api.servicecontrol.v1.Operation.start_time][google.api.servicecontrol.v1.Operation.start_time] will be used.
  google.protobuf.Timestamp start_time = 2;

  // The end of the time period over which this metric value's measurement
  // applies.  If not specified,
  // [google.api.servicecontrol.v1.Operation.end_time][google.api.servicecontrol.v1.Operation.end_time] will be used.
  google.protobuf.Timestamp end_time = 3;

  // The value. The type of value used in the request must
  // agree with the metric definition in the service configuration, otherwise
  // the MetricValue is rejected.
  oneof value {
    // A boolean value.
    bool bool_value = 4;

    // A signed 64-bit integer value.
    int64 int64_value = 5;

    // A double precision floating point value.
    double double_value = 6;

    // A text string value.
    string string_value = 7;

    // A distribution value.
    Distribution distribution_value = 8;
  }
}

// Represents a set of metric values in the same metric.
// Each metric value in the set should have a unique combination of start time,
// end time, and label values.
message MetricValueSet {
  // The metric name defined in the service configuration.
  string metric_name = 1;

  // The values in this metric.
  repeated MetricValue metric_values = 2;
}
