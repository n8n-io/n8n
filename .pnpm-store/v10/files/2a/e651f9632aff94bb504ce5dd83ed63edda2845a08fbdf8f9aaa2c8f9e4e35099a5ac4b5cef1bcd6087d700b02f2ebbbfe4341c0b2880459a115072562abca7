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

package google.monitoring.v3;

import "google/api/annotations.proto";
import "google/monitoring/v3/metric_service.proto";
import "google/api/client.proto";

option csharp_namespace = "Google.Cloud.Monitoring.V3";
option go_package = "cloud.google.com/go/monitoring/apiv3/v2/monitoringpb;monitoringpb";
option java_multiple_files = true;
option java_outer_classname = "QueryServiceProto";
option java_package = "com.google.monitoring.v3";
option php_namespace = "Google\\Cloud\\Monitoring\\V3";
option ruby_package = "Google::Cloud::Monitoring::V3";

// The QueryService API is used to manage time series data in Stackdriver
// Monitoring. Time series data is a collection of data points that describes
// the time-varying values of a metric.
service QueryService {
  option (google.api.default_host) = "monitoring.googleapis.com";
  option (google.api.oauth_scopes) =
      "https://www.googleapis.com/auth/cloud-platform,"
      "https://www.googleapis.com/auth/monitoring,"
      "https://www.googleapis.com/auth/monitoring.read";

  // Queries time series using Monitoring Query Language. This method does not require a Workspace.
  rpc QueryTimeSeries(QueryTimeSeriesRequest) returns (QueryTimeSeriesResponse) {
    option (google.api.http) = {
      post: "/v3/{name=projects/*}/timeSeries:query"
      body: "*"
    };
  }
}
