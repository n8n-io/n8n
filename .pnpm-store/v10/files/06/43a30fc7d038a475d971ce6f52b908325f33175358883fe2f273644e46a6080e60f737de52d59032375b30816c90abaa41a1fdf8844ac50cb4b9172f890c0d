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

import "google/api/annotations.proto";
import "google/api/servicecontrol/v1/metric_value.proto";
import "google/rpc/status.proto";
import "google/api/client.proto";

option cc_enable_arenas = true;
option csharp_namespace = "Google.Cloud.ServiceControl.V1";
option go_package = "cloud.google.com/go/servicecontrol/apiv1/servicecontrolpb;servicecontrolpb";
option java_multiple_files = true;
option java_outer_classname = "QuotaControllerProto";
option java_package = "com.google.api.servicecontrol.v1";
option php_namespace = "Google\\Cloud\\ServiceControl\\V1";
option ruby_package = "Google::Cloud::ServiceControl::V1";

// [Google Quota Control API](/service-control/overview)
//
// Allows clients to allocate and release quota against a [managed
// service](https://cloud.google.com/service-management/reference/rpc/google.api/servicemanagement.v1#google.api.servicemanagement.v1.ManagedService).
service QuotaController {
  option (google.api.default_host) = "servicecontrol.googleapis.com";
  option (google.api.oauth_scopes) =
      "https://www.googleapis.com/auth/cloud-platform,"
      "https://www.googleapis.com/auth/servicecontrol";

  // Attempts to allocate quota for the specified consumer. It should be called
  // before the operation is executed.
  //
  // This method requires the `servicemanagement.services.quota`
  // permission on the specified service. For more information, see
  // [Cloud IAM](https://cloud.google.com/iam).
  //
  // **NOTE:** The client **must** fail-open on server errors `INTERNAL`,
  // `UNKNOWN`, `DEADLINE_EXCEEDED`, and `UNAVAILABLE`. To ensure system
  // reliability, the server may inject these errors to prohibit any hard
  // dependency on the quota functionality.
  rpc AllocateQuota(AllocateQuotaRequest) returns (AllocateQuotaResponse) {
    option (google.api.http) = {
      post: "/v1/services/{service_name}:allocateQuota"
      body: "*"
    };
  }
}

// Request message for the AllocateQuota method.
message AllocateQuotaRequest {
  // Name of the service as specified in the service configuration. For example,
  // `"pubsub.googleapis.com"`.
  //
  // See [google.api.Service][google.api.Service] for the definition of a service name.
  string service_name = 1;

  // Operation that describes the quota allocation.
  QuotaOperation allocate_operation = 2;

  // Specifies which version of service configuration should be used to process
  // the request. If unspecified or no matching version can be found, the latest
  // one will be used.
  string service_config_id = 4;
}

// Represents information regarding a quota operation.
message QuotaOperation {
  // Supported quota modes.
  enum QuotaMode {
    // Guard against implicit default. Must not be used.
    UNSPECIFIED = 0;

    // For AllocateQuota request, allocates quota for the amount specified in
    // the service configuration or specified using the quota metrics. If the
    // amount is higher than the available quota, allocation error will be
    // returned and no quota will be allocated.
    // If multiple quotas are part of the request, and one fails, none of the
    // quotas are allocated or released.
    NORMAL = 1;

    // The operation allocates quota for the amount specified in the service
    // configuration or specified using the quota metrics. If the amount is
    // higher than the available quota, request does not fail but all available
    // quota will be allocated.
    // For rate quota, BEST_EFFORT will continue to deduct from other groups
    // even if one does not have enough quota. For allocation, it will find the
    // minimum available amount across all groups and deduct that amount from
    // all the affected groups.
    BEST_EFFORT = 2;

    // For AllocateQuota request, only checks if there is enough quota
    // available and does not change the available quota. No lock is placed on
    // the available quota either.
    CHECK_ONLY = 3;

    // Unimplemented. When used in AllocateQuotaRequest, this returns the
    // effective quota limit(s) in the response, and no quota check will be
    // performed. Not supported for other requests, and even for
    // AllocateQuotaRequest, this is currently supported only for allowlisted
    // services.
    QUERY_ONLY = 4;

    // The operation allocates quota for the amount specified in the service
    // configuration or specified using the quota metrics. If the requested
    // amount is higher than the available quota, request does not fail and
    // remaining quota would become negative (going over the limit).
    // Not supported for Rate Quota.
    ADJUST_ONLY = 5;
  }

  // Identity of the operation. This is expected to be unique within the scope
  // of the service that generated the operation, and guarantees idempotency in
  // case of retries.
  //
  // In order to ensure best performance and latency in the Quota backends,
  // operation_ids are optimally associated with time, so that related
  // operations can be accessed fast in storage. For this reason, the
  // recommended token for services that intend to operate at a high QPS is
  // Unix time in nanos + UUID
  string operation_id = 1;

  // Fully qualified name of the API method for which this quota operation is
  // requested. This name is used for matching quota rules or metric rules and
  // billing status rules defined in service configuration.
  //
  // This field should not be set if any of the following is true:
  // (1) the quota operation is performed on non-API resources.
  // (2) quota_metrics is set because the caller is doing quota override.
  //
  //
  // Example of an RPC method name:
  //     google.example.library.v1.LibraryService.CreateShelf
  string method_name = 2;

  // Identity of the consumer for whom this quota operation is being performed.
  //
  // This can be in one of the following formats:
  //   project:<project_id>,
  //   project_number:<project_number>,
  //   api_key:<api_key>.
  string consumer_id = 3;

  // Labels describing the operation.
  map<string, string> labels = 4;

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
  //
  // This field is mutually exclusive with method_name.
  repeated MetricValueSet quota_metrics = 5;

  // Quota mode for this operation.
  QuotaMode quota_mode = 6;
}

// Response message for the AllocateQuota method.
message AllocateQuotaResponse {
  // The same operation_id value used in the AllocateQuotaRequest. Used for
  // logging and diagnostics purposes.
  string operation_id = 1;

  // Indicates the decision of the allocate.
  repeated QuotaError allocate_errors = 2;

  // Quota metrics to indicate the result of allocation. Depending on the
  // request, one or more of the following metrics will be included:
  //
  // 1. Per quota group or per quota metric incremental usage will be specified
  // using the following delta metric :
  //   "serviceruntime.googleapis.com/api/consumer/quota_used_count"
  //
  // 2. The quota limit reached condition will be specified using the following
  // boolean metric :
  //   "serviceruntime.googleapis.com/quota/exceeded"
  repeated MetricValueSet quota_metrics = 3;

  // ID of the actual config used to process the request.
  string service_config_id = 4;
}

// Represents error information for [QuotaOperation][google.api.servicecontrol.v1.QuotaOperation].
message QuotaError {
  // Error codes related to project config validations are deprecated since the
  // quota controller methods do not perform these validations. Instead services
  // have to call the Check method, without quota_properties field, to perform
  // these validations before calling the quota controller methods. These
  // methods check only for project deletion to be wipe out compliant.
  enum Code {
    // This is never used.
    UNSPECIFIED = 0;

    // Quota allocation failed.
    // Same as [google.rpc.Code.RESOURCE_EXHAUSTED][google.rpc.Code.RESOURCE_EXHAUSTED].
    RESOURCE_EXHAUSTED = 8;

    // Consumer cannot access the service because the service requires active
    // billing.
    BILLING_NOT_ACTIVE = 107;

    // Consumer's project has been marked as deleted (soft deletion).
    PROJECT_DELETED = 108;

    // Specified API key is invalid.
    API_KEY_INVALID = 105;

    // Specified API Key has expired.
    API_KEY_EXPIRED = 112;
  }

  // Error code.
  Code code = 1;

  // Subject to whom this error applies. See the specific enum for more details
  // on this field. For example, "clientip:<ip address of client>" or
  // "project:<Google developer project id>".
  string subject = 2;

  // Free-form text that provides details on the cause of the error.
  string description = 3;

  // Contains additional information about the quota error.
  // If available, `status.code` will be non zero.
  google.rpc.Status status = 4;
}
