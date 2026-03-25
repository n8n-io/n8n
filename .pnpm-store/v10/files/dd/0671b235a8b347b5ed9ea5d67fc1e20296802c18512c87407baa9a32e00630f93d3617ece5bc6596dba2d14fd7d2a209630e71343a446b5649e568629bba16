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
import "google/api/client.proto";
import "google/api/field_behavior.proto";
import "google/api/metric.proto";
import "google/api/monitored_resource.proto";
import "google/api/resource.proto";
import "google/monitoring/v3/common.proto";
import "google/monitoring/v3/metric.proto";
import "google/protobuf/empty.proto";
import "google/rpc/status.proto";

option csharp_namespace = "Google.Cloud.Monitoring.V3";
option go_package = "cloud.google.com/go/monitoring/apiv3/v2/monitoringpb;monitoringpb";
option java_multiple_files = true;
option java_outer_classname = "MetricServiceProto";
option java_package = "com.google.monitoring.v3";
option php_namespace = "Google\\Cloud\\Monitoring\\V3";
option ruby_package = "Google::Cloud::Monitoring::V3";
option (google.api.resource_definition) = {
  type: "monitoring.googleapis.com/MetricDescriptor"
  pattern: "projects/{project}/metricDescriptors/{metric_descriptor=**}"
  pattern: "organizations/{organization}/metricDescriptors/{metric_descriptor=**}"
  pattern: "folders/{folder}/metricDescriptors/{metric_descriptor=**}"
  pattern: "*"
  history: ORIGINALLY_SINGLE_PATTERN
};
option (google.api.resource_definition) = {
  type: "monitoring.googleapis.com/MonitoredResourceDescriptor"
  pattern: "projects/{project}/monitoredResourceDescriptors/{monitored_resource_descriptor}"
  pattern: "organizations/{organization}/monitoredResourceDescriptors/{monitored_resource_descriptor}"
  pattern: "folders/{folder}/monitoredResourceDescriptors/{monitored_resource_descriptor}"
  pattern: "*"
  history: ORIGINALLY_SINGLE_PATTERN
};
option (google.api.resource_definition) = {
  type: "monitoring.googleapis.com/Workspace"
  pattern: "projects/{project}"
  pattern: "workspaces/{workspace}"
};
option (google.api.resource_definition) = {
  type: "monitoring.googleapis.com/TimeSeries"
  pattern: "projects/{project}/timeSeries/{time_series}"
  pattern: "organizations/{organization}/timeSeries/{time_series}"
  pattern: "folders/{folder}/timeSeries/{time_series}"
};

// Manages metric descriptors, monitored resource descriptors, and
// time series data.
service MetricService {
  option (google.api.default_host) = "monitoring.googleapis.com";
  option (google.api.oauth_scopes) =
      "https://www.googleapis.com/auth/cloud-platform,"
      "https://www.googleapis.com/auth/monitoring,"
      "https://www.googleapis.com/auth/monitoring.read,"
      "https://www.googleapis.com/auth/monitoring.write";

  // Lists monitored resource descriptors that match a filter. This method does not require a Workspace.
  rpc ListMonitoredResourceDescriptors(ListMonitoredResourceDescriptorsRequest) returns (ListMonitoredResourceDescriptorsResponse) {
    option (google.api.http) = {
      get: "/v3/{name=projects/*}/monitoredResourceDescriptors"
    };
    option (google.api.method_signature) = "name";
  }

  // Gets a single monitored resource descriptor. This method does not require a Workspace.
  rpc GetMonitoredResourceDescriptor(GetMonitoredResourceDescriptorRequest) returns (google.api.MonitoredResourceDescriptor) {
    option (google.api.http) = {
      get: "/v3/{name=projects/*/monitoredResourceDescriptors/**}"
    };
    option (google.api.method_signature) = "name";
  }

  // Lists metric descriptors that match a filter. This method does not require a Workspace.
  rpc ListMetricDescriptors(ListMetricDescriptorsRequest) returns (ListMetricDescriptorsResponse) {
    option (google.api.http) = {
      get: "/v3/{name=projects/*}/metricDescriptors"
    };
    option (google.api.method_signature) = "name";
  }

  // Gets a single metric descriptor. This method does not require a Workspace.
  rpc GetMetricDescriptor(GetMetricDescriptorRequest) returns (google.api.MetricDescriptor) {
    option (google.api.http) = {
      get: "/v3/{name=projects/*/metricDescriptors/**}"
    };
    option (google.api.method_signature) = "name";
  }

  // Creates a new metric descriptor.
  // The creation is executed asynchronously and callers may check the returned
  // operation to track its progress.
  // User-created metric descriptors define
  // [custom metrics](https://cloud.google.com/monitoring/custom-metrics).
  rpc CreateMetricDescriptor(CreateMetricDescriptorRequest) returns (google.api.MetricDescriptor) {
    option (google.api.http) = {
      post: "/v3/{name=projects/*}/metricDescriptors"
      body: "metric_descriptor"
    };
    option (google.api.method_signature) = "name,metric_descriptor";
  }

  // Deletes a metric descriptor. Only user-created
  // [custom metrics](https://cloud.google.com/monitoring/custom-metrics) can be
  // deleted.
  rpc DeleteMetricDescriptor(DeleteMetricDescriptorRequest) returns (google.protobuf.Empty) {
    option (google.api.http) = {
      delete: "/v3/{name=projects/*/metricDescriptors/**}"
    };
    option (google.api.method_signature) = "name";
  }

  // Lists time series that match a filter. This method does not require a Workspace.
  rpc ListTimeSeries(ListTimeSeriesRequest) returns (ListTimeSeriesResponse) {
    option (google.api.http) = {
      get: "/v3/{name=projects/*}/timeSeries"
      additional_bindings {
        get: "/v3/{name=organizations/*}/timeSeries"
      }
      additional_bindings {
        get: "/v3/{name=folders/*}/timeSeries"
      }
    };
    option (google.api.method_signature) = "name,filter,interval,view";
  }

  // Creates or adds data to one or more time series.
  // The response is empty if all time series in the request were written.
  // If any time series could not be written, a corresponding failure message is
  // included in the error response.
  rpc CreateTimeSeries(CreateTimeSeriesRequest) returns (google.protobuf.Empty) {
    option (google.api.http) = {
      post: "/v3/{name=projects/*}/timeSeries"
      body: "*"
    };
    option (google.api.method_signature) = "name,time_series";
  }

  // Creates or adds data to one or more service time series. A service time
  // series is a time series for a metric from a Google Cloud service. The
  // response is empty if all time series in the request were written. If any
  // time series could not be written, a corresponding failure message is
  // included in the error response. This endpoint rejects writes to
  // user-defined metrics.
  // This method is only for use by Google Cloud services. Use
  // [projects.timeSeries.create][google.monitoring.v3.MetricService.CreateTimeSeries]
  // instead.
  rpc CreateServiceTimeSeries(CreateTimeSeriesRequest) returns (google.protobuf.Empty) {
    option (google.api.http) = {
      post: "/v3/{name=projects/*}/timeSeries:createService"
      body: "*"
    };
    option (google.api.method_signature) = "name,time_series";
  }
}

// The `ListMonitoredResourceDescriptors` request.
message ListMonitoredResourceDescriptorsRequest {
  // Required. The [project](https://cloud.google.com/monitoring/api/v3#project_name) on
  // which to execute the request. The format is:
  //
  //     projects/[PROJECT_ID_OR_NUMBER]
  string name = 5 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      child_type: "monitoring.googleapis.com/MonitoredResourceDescriptor"
    }
  ];

  // An optional [filter](https://cloud.google.com/monitoring/api/v3/filters)
  // describing the descriptors to be returned.  The filter can reference the
  // descriptor's type and labels. For example, the following filter returns
  // only Google Compute Engine descriptors that have an `id` label:
  //
  //     resource.type = starts_with("gce_") AND resource.label:id
  string filter = 2;

  // A positive number that is the maximum number of results to return.
  int32 page_size = 3;

  // If this field is not empty then it must contain the `nextPageToken` value
  // returned by a previous call to this method.  Using this field causes the
  // method to return additional results from the previous method call.
  string page_token = 4;
}

// The `ListMonitoredResourceDescriptors` response.
message ListMonitoredResourceDescriptorsResponse {
  // The monitored resource descriptors that are available to this project
  // and that match `filter`, if present.
  repeated google.api.MonitoredResourceDescriptor resource_descriptors = 1;

  // If there are more results than have been returned, then this field is set
  // to a non-empty value.  To see the additional results,
  // use that value as `page_token` in the next call to this method.
  string next_page_token = 2;
}

// The `GetMonitoredResourceDescriptor` request.
message GetMonitoredResourceDescriptorRequest {
  // Required. The monitored resource descriptor to get.  The format is:
  //
  //     projects/[PROJECT_ID_OR_NUMBER]/monitoredResourceDescriptors/[RESOURCE_TYPE]
  //
  // The `[RESOURCE_TYPE]` is a predefined type, such as
  // `cloudsql_database`.
  string name = 3 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      type: "monitoring.googleapis.com/MonitoredResourceDescriptor"
    }
  ];
}

// The `ListMetricDescriptors` request.
message ListMetricDescriptorsRequest {
  // Required. The [project](https://cloud.google.com/monitoring/api/v3#project_name) on
  // which to execute the request. The format is:
  //
  //     projects/[PROJECT_ID_OR_NUMBER]
  string name = 5 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      child_type: "monitoring.googleapis.com/MetricDescriptor"
    }
  ];

  // If this field is empty, all custom and
  // system-defined metric descriptors are returned.
  // Otherwise, the [filter](https://cloud.google.com/monitoring/api/v3/filters)
  // specifies which metric descriptors are to be
  // returned. For example, the following filter matches all
  // [custom metrics](https://cloud.google.com/monitoring/custom-metrics):
  //
  //     metric.type = starts_with("custom.googleapis.com/")
  string filter = 2;

  // A positive number that is the maximum number of results to return.
  int32 page_size = 3;

  // If this field is not empty then it must contain the `nextPageToken` value
  // returned by a previous call to this method.  Using this field causes the
  // method to return additional results from the previous method call.
  string page_token = 4;
}

// The `ListMetricDescriptors` response.
message ListMetricDescriptorsResponse {
  // The metric descriptors that are available to the project
  // and that match the value of `filter`, if present.
  repeated google.api.MetricDescriptor metric_descriptors = 1;

  // If there are more results than have been returned, then this field is set
  // to a non-empty value.  To see the additional results,
  // use that value as `page_token` in the next call to this method.
  string next_page_token = 2;
}

// The `GetMetricDescriptor` request.
message GetMetricDescriptorRequest {
  // Required. The metric descriptor on which to execute the request. The format is:
  //
  //     projects/[PROJECT_ID_OR_NUMBER]/metricDescriptors/[METRIC_ID]
  //
  // An example value of `[METRIC_ID]` is
  // `"compute.googleapis.com/instance/disk/read_bytes_count"`.
  string name = 3 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      type: "monitoring.googleapis.com/MetricDescriptor"
    }
  ];
}

// The `CreateMetricDescriptor` request.
message CreateMetricDescriptorRequest {
  // Required. The [project](https://cloud.google.com/monitoring/api/v3#project_name) on
  // which to execute the request. The format is:
  // 4
  //     projects/[PROJECT_ID_OR_NUMBER]
  string name = 3 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      child_type: "monitoring.googleapis.com/MetricDescriptor"
    }
  ];

  // Required. The new [custom metric](https://cloud.google.com/monitoring/custom-metrics)
  // descriptor.
  google.api.MetricDescriptor metric_descriptor = 2 [(google.api.field_behavior) = REQUIRED];
}

// The `DeleteMetricDescriptor` request.
message DeleteMetricDescriptorRequest {
  // Required. The metric descriptor on which to execute the request. The format is:
  //
  //     projects/[PROJECT_ID_OR_NUMBER]/metricDescriptors/[METRIC_ID]
  //
  // An example of `[METRIC_ID]` is:
  // `"custom.googleapis.com/my_test_metric"`.
  string name = 3 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      type: "monitoring.googleapis.com/MetricDescriptor"
    }
  ];
}

// The `ListTimeSeries` request.
message ListTimeSeriesRequest {
  // Controls which fields are returned by `ListTimeSeries`.
  enum TimeSeriesView {
    // Returns the identity of the metric(s), the time series,
    // and the time series data.
    FULL = 0;

    // Returns the identity of the metric and the time series resource,
    // but not the time series data.
    HEADERS = 1;
  }

  // Required. The [project](https://cloud.google.com/monitoring/api/v3#project_name),
  // organization or folder on which to execute the request. The format is:
  //
  //     projects/[PROJECT_ID_OR_NUMBER]
  //     organizations/[ORGANIZATION_ID]
  //     folders/[FOLDER_ID]
  string name = 10 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      child_type: "monitoring.googleapis.com/TimeSeries"
    }
  ];

  // Required. A [monitoring filter](https://cloud.google.com/monitoring/api/v3/filters)
  // that specifies which time series should be returned.  The filter must
  // specify a single metric type, and can additionally specify metric labels
  // and other information. For example:
  //
  //     metric.type = "compute.googleapis.com/instance/cpu/usage_time" AND
  //         metric.labels.instance_name = "my-instance-name"
  string filter = 2 [(google.api.field_behavior) = REQUIRED];

  // Required. The time interval for which results should be returned. Only time series
  // that contain data points in the specified interval are included
  // in the response.
  TimeInterval interval = 4 [(google.api.field_behavior) = REQUIRED];

  // Specifies the alignment of data points in individual time series as
  // well as how to combine the retrieved time series across specified labels.
  //
  // By default (if no `aggregation` is explicitly specified), the raw time
  // series data is returned.
  Aggregation aggregation = 5;

  // Apply a second aggregation after `aggregation` is applied. May only be
  // specified if `aggregation` is specified.
  Aggregation secondary_aggregation = 11;

  // Unsupported: must be left blank. The points in each time series are
  // currently returned in reverse time order (most recent to oldest).
  string order_by = 6;

  // Required. Specifies which information is returned about the time series.
  TimeSeriesView view = 7 [(google.api.field_behavior) = REQUIRED];

  // A positive number that is the maximum number of results to return. If
  // `page_size` is empty or more than 100,000 results, the effective
  // `page_size` is 100,000 results. If `view` is set to `FULL`, this is the
  // maximum number of `Points` returned. If `view` is set to `HEADERS`, this is
  // the maximum number of `TimeSeries` returned.
  int32 page_size = 8;

  // If this field is not empty then it must contain the `nextPageToken` value
  // returned by a previous call to this method.  Using this field causes the
  // method to return additional results from the previous method call.
  string page_token = 9;
}

// The `ListTimeSeries` response.
message ListTimeSeriesResponse {
  // One or more time series that match the filter included in the request.
  repeated TimeSeries time_series = 1;

  // If there are more results than have been returned, then this field is set
  // to a non-empty value.  To see the additional results,
  // use that value as `page_token` in the next call to this method.
  string next_page_token = 2;

  // Query execution errors that may have caused the time series data returned
  // to be incomplete.
  repeated google.rpc.Status execution_errors = 3;

  // The unit in which all `time_series` point values are reported. `unit`
  // follows the UCUM format for units as seen in
  // https://unitsofmeasure.org/ucum.html.
  // If different `time_series` have different units (for example, because they
  // come from different metric types, or a unit is absent), then `unit` will be
  // "{not_a_unit}".
  string unit = 5;
}

// The `CreateTimeSeries` request.
message CreateTimeSeriesRequest {
  // Required. The [project](https://cloud.google.com/monitoring/api/v3#project_name) on
  // which to execute the request. The format is:
  //
  //     projects/[PROJECT_ID_OR_NUMBER]
  string name = 3 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      type: "cloudresourcemanager.googleapis.com/Project"
    }
  ];

  // Required. The new data to be added to a list of time series.
  // Adds at most one data point to each of several time series.  The new data
  // point must be more recent than any other point in its time series.  Each
  // `TimeSeries` value must fully specify a unique time series by supplying
  // all label values for the metric and the monitored resource.
  //
  // The maximum number of `TimeSeries` objects per `Create` request is 200.
  repeated TimeSeries time_series = 2 [(google.api.field_behavior) = REQUIRED];
}

// DEPRECATED. Used to hold per-time-series error status.
message CreateTimeSeriesError {
  // DEPRECATED. Time series ID that resulted in the `status` error.
  TimeSeries time_series = 1 [deprecated = true];

  // DEPRECATED. The status of the requested write operation for `time_series`.
  google.rpc.Status status = 2 [deprecated = true];
}

// Summary of the result of a failed request to write data to a time series.
message CreateTimeSeriesSummary {
  // Detailed information about an error category.
  message Error {
    // The status of the requested write operation.
    google.rpc.Status status = 1;

    // The number of points that couldn't be written because of `status`.
    int32 point_count = 2;
  }

  // The number of points in the request.
  int32 total_point_count = 1;

  // The number of points that were successfully written.
  int32 success_point_count = 2;

  // The number of points that failed to be written. Order is not guaranteed.
  repeated Error errors = 3;
}

// The `QueryTimeSeries` request.
message QueryTimeSeriesRequest {
  // Required. The [project](https://cloud.google.com/monitoring/api/v3#project_name) on
  // which to execute the request. The format is:
  //
  //     projects/[PROJECT_ID_OR_NUMBER]
  string name = 1 [(google.api.field_behavior) = REQUIRED];

  // Required. The query in the [Monitoring Query
  // Language](https://cloud.google.com/monitoring/mql/reference) format.
  // The default time zone is in UTC.
  string query = 7 [(google.api.field_behavior) = REQUIRED];

  // A positive number that is the maximum number of time_series_data to return.
  int32 page_size = 9;

  // If this field is not empty then it must contain the `nextPageToken` value
  // returned by a previous call to this method.  Using this field causes the
  // method to return additional results from the previous method call.
  string page_token = 10;
}

// The `QueryTimeSeries` response.
message QueryTimeSeriesResponse {
  // The descriptor for the time series data.
  TimeSeriesDescriptor time_series_descriptor = 8;

  // The time series data.
  repeated TimeSeriesData time_series_data = 9;

  // If there are more results than have been returned, then this field is set
  // to a non-empty value.  To see the additional results, use that value as
  // `page_token` in the next call to this method.
  string next_page_token = 10;

  // Query execution errors that may have caused the time series data returned
  // to be incomplete. The available data will be available in the
  // response.
  repeated google.rpc.Status partial_errors = 11;
}

// This is an error detail intended to be used with INVALID_ARGUMENT errors.
message QueryErrorList {
  // Errors in parsing the time series query language text. The number of errors
  // in the response may be limited.
  repeated QueryError errors = 1;

  // A summary of all the errors.
  string error_summary = 2;
}
