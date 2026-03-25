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
option java_outer_classname = "QuotaProto";
option java_package = "com.google.api";
option objc_class_prefix = "GAPI";

// Quota configuration helps to achieve fairness and budgeting in service
// usage.
//
// The metric based quota configuration works this way:
// - The service configuration defines a set of metrics.
// - For API calls, the quota.metric_rules maps methods to metrics with
//   corresponding costs.
// - The quota.limits defines limits on the metrics, which will be used for
//   quota checks at runtime.
//
// An example quota configuration in yaml format:
//
//    quota:
//      limits:
//
//      - name: apiWriteQpsPerProject
//        metric: library.googleapis.com/write_calls
//        unit: "1/min/{project}"  # rate limit for consumer projects
//        values:
//          STANDARD: 10000
//
//
//      (The metric rules bind all methods to the read_calls metric,
//       except for the UpdateBook and DeleteBook methods. These two methods
//       are mapped to the write_calls metric, with the UpdateBook method
//       consuming at twice rate as the DeleteBook method.)
//      metric_rules:
//      - selector: "*"
//        metric_costs:
//          library.googleapis.com/read_calls: 1
//      - selector: google.example.library.v1.LibraryService.UpdateBook
//        metric_costs:
//          library.googleapis.com/write_calls: 2
//      - selector: google.example.library.v1.LibraryService.DeleteBook
//        metric_costs:
//          library.googleapis.com/write_calls: 1
//
//  Corresponding Metric definition:
//
//      metrics:
//      - name: library.googleapis.com/read_calls
//        display_name: Read requests
//        metric_kind: DELTA
//        value_type: INT64
//
//      - name: library.googleapis.com/write_calls
//        display_name: Write requests
//        metric_kind: DELTA
//        value_type: INT64
//
//
message Quota {
  // List of QuotaLimit definitions for the service.
  repeated QuotaLimit limits = 3;

  // List of MetricRule definitions, each one mapping a selected method to one
  // or more metrics.
  repeated MetricRule metric_rules = 4;
}

// Bind API methods to metrics. Binding a method to a metric causes that
// metric's configured quota behaviors to apply to the method call.
message MetricRule {
  // Selects the methods to which this rule applies.
  //
  // Refer to [selector][google.api.DocumentationRule.selector] for syntax
  // details.
  string selector = 1;

  // Metrics to update when the selected methods are called, and the associated
  // cost applied to each metric.
  //
  // The key of the map is the metric name, and the values are the amount
  // increased for the metric against which the quota limits are defined.
  // The value must not be negative.
  map<string, int64> metric_costs = 2;
}

// `QuotaLimit` defines a specific limit that applies over a specified duration
// for a limit type. There can be at most one limit for a duration and limit
// type combination defined within a `QuotaGroup`.
message QuotaLimit {
  // Name of the quota limit.
  //
  // The name must be provided, and it must be unique within the service. The
  // name can only include alphanumeric characters as well as '-'.
  //
  // The maximum length of the limit name is 64 characters.
  string name = 6;

  // Optional. User-visible, extended description for this quota limit.
  // Should be used only when more context is needed to understand this limit
  // than provided by the limit's display name (see: `display_name`).
  string description = 2;

  // Default number of tokens that can be consumed during the specified
  // duration. This is the number of tokens assigned when a client
  // application developer activates the service for his/her project.
  //
  // Specifying a value of 0 will block all requests. This can be used if you
  // are provisioning quota to selected consumers and blocking others.
  // Similarly, a value of -1 will indicate an unlimited quota. No other
  // negative values are allowed.
  //
  // Used by group-based quotas only.
  int64 default_limit = 3;

  // Maximum number of tokens that can be consumed during the specified
  // duration. Client application developers can override the default limit up
  // to this maximum. If specified, this value cannot be set to a value less
  // than the default limit. If not specified, it is set to the default limit.
  //
  // To allow clients to apply overrides with no upper bound, set this to -1,
  // indicating unlimited maximum quota.
  //
  // Used by group-based quotas only.
  int64 max_limit = 4;

  // Free tier value displayed in the Developers Console for this limit.
  // The free tier is the number of tokens that will be subtracted from the
  // billed amount when billing is enabled.
  // This field can only be set on a limit with duration "1d", in a billable
  // group; it is invalid on any other limit. If this field is not set, it
  // defaults to 0, indicating that there is no free tier for this service.
  //
  // Used by group-based quotas only.
  int64 free_tier = 7;

  // Duration of this limit in textual notation. Must be "100s" or "1d".
  //
  // Used by group-based quotas only.
  string duration = 5;

  // The name of the metric this quota limit applies to. The quota limits with
  // the same metric will be checked together during runtime. The metric must be
  // defined within the service config.
  string metric = 8;

  // Specify the unit of the quota limit. It uses the same syntax as
  // [Metric.unit][]. The supported unit kinds are determined by the quota
  // backend system.
  //
  // Here are some examples:
  // * "1/min/{project}" for quota per minute per project.
  //
  // Note: the order of unit components is insignificant.
  // The "1" at the beginning is required to follow the metric unit syntax.
  string unit = 9;

  // Tiered limit values. You must specify this as a key:value pair, with an
  // integer value that is the maximum number of requests allowed for the
  // specified unit. Currently only STANDARD is supported.
  map<string, int64> values = 10;

  // User-visible display name for this limit.
  // Optional. If not set, the UI will provide a default display name based on
  // the quota configuration. This field can be used to override the default
  // display name generated from the configuration.
  string display_name = 12;
}
