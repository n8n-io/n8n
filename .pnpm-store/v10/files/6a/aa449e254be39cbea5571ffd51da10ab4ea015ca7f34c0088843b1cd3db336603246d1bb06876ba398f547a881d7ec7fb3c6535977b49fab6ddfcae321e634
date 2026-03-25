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

package google.api.serviceusage.v1beta1;

import "google/api/annotations.proto";
import "google/api/client.proto";
import "google/api/field_behavior.proto";
import "google/api/serviceusage/v1beta1/resources.proto";
import "google/longrunning/operations.proto";
import "google/protobuf/empty.proto";
import "google/protobuf/field_mask.proto";

option csharp_namespace = "Google.Api.ServiceUsage.V1Beta1";
option go_package = "google.golang.org/genproto/googleapis/api/serviceusage/v1beta1;serviceusage";
option java_multiple_files = true;
option java_outer_classname = "ServiceUsageProto";
option java_package = "com.google.api.serviceusage.v1beta1";
option php_namespace = "Google\\Api\\ServiceUsage\\V1beta1";
option ruby_package = "Google::Api::ServiceUsage::V1beta1";

// [Service Usage API](https://cloud.google.com/service-usage/docs/overview)
service ServiceUsage {
  option (google.api.default_host) = "serviceusage.googleapis.com";
  option (google.api.oauth_scopes) =
      "https://www.googleapis.com/auth/cloud-platform,"
      "https://www.googleapis.com/auth/cloud-platform.read-only,"
      "https://www.googleapis.com/auth/service.management";

  // Enables a service so that it can be used with a project.
  //
  // Operation response type: `google.protobuf.Empty`
  rpc EnableService(EnableServiceRequest)
      returns (google.longrunning.Operation) {
    option deprecated = true;
    option (google.api.http) = {
      post: "/v1beta1/{name=*/*/services/*}:enable"
      body: "*"
    };
    option (google.longrunning.operation_info) = {
      response_type: "google.protobuf.Empty"
      metadata_type: "OperationMetadata"
    };
  }

  // Disables a service so that it can no longer be used with a project.
  // This prevents unintended usage that may cause unexpected billing
  // charges or security leaks.
  //
  // It is not valid to call the disable method on a service that is not
  // currently enabled. Callers will receive a `FAILED_PRECONDITION` status if
  // the target service is not currently enabled.
  //
  // Operation response type: `google.protobuf.Empty`
  rpc DisableService(DisableServiceRequest)
      returns (google.longrunning.Operation) {
    option deprecated = true;
    option (google.api.http) = {
      post: "/v1beta1/{name=*/*/services/*}:disable"
      body: "*"
    };
    option (google.longrunning.operation_info) = {
      response_type: "google.protobuf.Empty"
      metadata_type: "OperationMetadata"
    };
  }

  // Returns the service configuration and enabled state for a given service.
  rpc GetService(GetServiceRequest) returns (Service) {
    option deprecated = true;
    option (google.api.http) = {
      get: "/v1beta1/{name=*/*/services/*}"
    };
  }

  // Lists all services available to the specified project, and the current
  // state of those services with respect to the project. The list includes
  // all public services, all services for which the calling user has the
  // `servicemanagement.services.bind` permission, and all services that have
  // already been enabled on the project. The list can be filtered to
  // only include services in a specific state, for example to only include
  // services enabled on the project.
  rpc ListServices(ListServicesRequest) returns (ListServicesResponse) {
    option deprecated = true;
    option (google.api.http) = {
      get: "/v1beta1/{parent=*/*}/services"
    };
  }

  // Enables multiple services on a project. The operation is atomic: if
  // enabling any service fails, then the entire batch fails, and no state
  // changes occur.
  //
  // Operation response type: `google.protobuf.Empty`
  rpc BatchEnableServices(BatchEnableServicesRequest)
      returns (google.longrunning.Operation) {
    option deprecated = true;
    option (google.api.http) = {
      post: "/v1beta1/{parent=*/*}/services:batchEnable"
      body: "*"
    };
    option (google.longrunning.operation_info) = {
      response_type: "google.protobuf.Empty"
      metadata_type: "OperationMetadata"
    };
  }

  // Retrieves a summary of all quota information visible to the service
  // consumer, organized by service metric. Each metric includes information
  // about all of its defined limits. Each limit includes the limit
  // configuration (quota unit, preciseness, default value), the current
  // effective limit value, and all of the overrides applied to the limit.
  rpc ListConsumerQuotaMetrics(ListConsumerQuotaMetricsRequest)
      returns (ListConsumerQuotaMetricsResponse) {
    option (google.api.http) = {
      get: "/v1beta1/{parent=*/*/services/*}/consumerQuotaMetrics"
    };
  }

  // Retrieves a summary of quota information for a specific quota metric
  rpc GetConsumerQuotaMetric(GetConsumerQuotaMetricRequest)
      returns (ConsumerQuotaMetric) {
    option (google.api.http) = {
      get: "/v1beta1/{name=*/*/services/*/consumerQuotaMetrics/*}"
    };
  }

  // Retrieves a summary of quota information for a specific quota limit.
  rpc GetConsumerQuotaLimit(GetConsumerQuotaLimitRequest)
      returns (ConsumerQuotaLimit) {
    option (google.api.http) = {
      get: "/v1beta1/{name=*/*/services/*/consumerQuotaMetrics/*/limits/*}"
    };
  }

  // Creates an admin override.
  // An admin override is applied by an administrator of a parent folder or
  // parent organization of the consumer receiving the override. An admin
  // override is intended to limit the amount of quota the consumer can use out
  // of the total quota pool allocated to all children of the folder or
  // organization.
  rpc CreateAdminOverride(CreateAdminOverrideRequest)
      returns (google.longrunning.Operation) {
    option (google.api.http) = {
      post: "/v1beta1/{parent=*/*/services/*/consumerQuotaMetrics/*/limits/*}/adminOverrides"
      body: "override"
    };
    option (google.longrunning.operation_info) = {
      response_type: "QuotaOverride"
      metadata_type: "OperationMetadata"
    };
  }

  // Updates an admin override.
  rpc UpdateAdminOverride(UpdateAdminOverrideRequest)
      returns (google.longrunning.Operation) {
    option (google.api.http) = {
      patch: "/v1beta1/{name=*/*/services/*/consumerQuotaMetrics/*/limits/*/adminOverrides/*}"
      body: "override"
    };
    option (google.longrunning.operation_info) = {
      response_type: "QuotaOverride"
      metadata_type: "OperationMetadata"
    };
  }

  // Deletes an admin override.
  rpc DeleteAdminOverride(DeleteAdminOverrideRequest)
      returns (google.longrunning.Operation) {
    option (google.api.http) = {
      delete: "/v1beta1/{name=*/*/services/*/consumerQuotaMetrics/*/limits/*/adminOverrides/*}"
    };
    option (google.longrunning.operation_info) = {
      response_type: "google.protobuf.Empty"
      metadata_type: "OperationMetadata"
    };
  }

  // Lists all admin overrides on this limit.
  rpc ListAdminOverrides(ListAdminOverridesRequest)
      returns (ListAdminOverridesResponse) {
    option (google.api.http) = {
      get: "/v1beta1/{parent=*/*/services/*/consumerQuotaMetrics/*/limits/*}/adminOverrides"
    };
  }

  // Creates or updates multiple admin overrides atomically, all on the
  // same consumer, but on many different metrics or limits.
  // The name field in the quota override message should not be set.
  rpc ImportAdminOverrides(ImportAdminOverridesRequest)
      returns (google.longrunning.Operation) {
    option (google.api.http) = {
      post: "/v1beta1/{parent=*/*/services/*}/consumerQuotaMetrics:importAdminOverrides"
      body: "*"
    };
    option (google.longrunning.operation_info) = {
      response_type: "ImportAdminOverridesResponse"
      metadata_type: "ImportAdminOverridesMetadata"
    };
  }

  // Creates a consumer override.
  // A consumer override is applied to the consumer on its own authority to
  // limit its own quota usage. Consumer overrides cannot be used to grant more
  // quota than would be allowed by admin overrides, producer overrides, or the
  // default limit of the service.
  rpc CreateConsumerOverride(CreateConsumerOverrideRequest)
      returns (google.longrunning.Operation) {
    option (google.api.http) = {
      post: "/v1beta1/{parent=*/*/services/*/consumerQuotaMetrics/*/limits/*}/consumerOverrides"
      body: "override"
    };
    option (google.longrunning.operation_info) = {
      response_type: "QuotaOverride"
      metadata_type: "OperationMetadata"
    };
  }

  // Updates a consumer override.
  rpc UpdateConsumerOverride(UpdateConsumerOverrideRequest)
      returns (google.longrunning.Operation) {
    option (google.api.http) = {
      patch: "/v1beta1/{name=*/*/services/*/consumerQuotaMetrics/*/limits/*/consumerOverrides/*}"
      body: "override"
    };
    option (google.longrunning.operation_info) = {
      response_type: "QuotaOverride"
      metadata_type: "OperationMetadata"
    };
  }

  // Deletes a consumer override.
  rpc DeleteConsumerOverride(DeleteConsumerOverrideRequest)
      returns (google.longrunning.Operation) {
    option (google.api.http) = {
      delete: "/v1beta1/{name=*/*/services/*/consumerQuotaMetrics/*/limits/*/consumerOverrides/*}"
    };
    option (google.longrunning.operation_info) = {
      response_type: "google.protobuf.Empty"
      metadata_type: "OperationMetadata"
    };
  }

  // Lists all consumer overrides on this limit.
  rpc ListConsumerOverrides(ListConsumerOverridesRequest)
      returns (ListConsumerOverridesResponse) {
    option (google.api.http) = {
      get: "/v1beta1/{parent=*/*/services/*/consumerQuotaMetrics/*/limits/*}/consumerOverrides"
    };
  }

  // Creates or updates multiple consumer overrides atomically, all on the
  // same consumer, but on many different metrics or limits.
  // The name field in the quota override message should not be set.
  rpc ImportConsumerOverrides(ImportConsumerOverridesRequest)
      returns (google.longrunning.Operation) {
    option (google.api.http) = {
      post: "/v1beta1/{parent=*/*/services/*}/consumerQuotaMetrics:importConsumerOverrides"
      body: "*"
    };
    option (google.longrunning.operation_info) = {
      response_type: "ImportConsumerOverridesResponse"
      metadata_type: "ImportConsumerOverridesMetadata"
    };
  }

  // Generates service identity for service.
  rpc GenerateServiceIdentity(GenerateServiceIdentityRequest)
      returns (google.longrunning.Operation) {
    option (google.api.http) = {
      post: "/v1beta1/{parent=*/*/services/*}:generateServiceIdentity"
    };
    option (google.longrunning.operation_info) = {
      response_type: "ServiceIdentity"
      metadata_type: "google.protobuf.Empty"
    };
  }
}

// Request message for the `EnableService` method.
message EnableServiceRequest {
  // Name of the consumer and service to enable the service on.
  //
  // The `EnableService` and `DisableService` methods currently only support
  // projects.
  //
  // Enabling a service requires that the service is public or is shared with
  // the user enabling the service.
  //
  // An example name would be:
  // `projects/123/services/serviceusage.googleapis.com`
  // where `123` is the project number (not project ID).
  string name = 1;
}

// Request message for the `DisableService` method.
message DisableServiceRequest {
  // Name of the consumer and service to disable the service on.
  //
  // The enable and disable methods currently only support projects.
  //
  // An example name would be:
  // `projects/123/services/serviceusage.googleapis.com`
  // where `123` is the project number (not project ID).
  string name = 1;
}

// Request message for the `GetService` method.
message GetServiceRequest {
  // Name of the consumer and service to get the `ConsumerState` for.
  //
  // An example name would be:
  // `projects/123/services/serviceusage.googleapis.com`
  // where `123` is the project number (not project ID).
  string name = 1;
}

// Request message for the `ListServices` method.
message ListServicesRequest {
  // Parent to search for services on.
  //
  // An example name would be:
  // `projects/123`
  // where `123` is the project number (not project ID).
  string parent = 1;

  // Requested size of the next page of data.
  // Requested page size cannot exceed 200.
  //  If not set, the default page size is 50.
  int32 page_size = 2;

  // Token identifying which result to start with, which is returned by a
  // previous list call.
  string page_token = 3;

  // Only list services that conform to the given filter.
  // The allowed filter strings are `state:ENABLED` and `state:DISABLED`.
  string filter = 4;
}

// Response message for the `ListServices` method.
message ListServicesResponse {
  // The available services for the requested project.
  repeated Service services = 1;

  // Token that can be passed to `ListServices` to resume a paginated
  // query.
  string next_page_token = 2;
}

// Request message for the `BatchEnableServices` method.
message BatchEnableServicesRequest {
  // Parent to enable services on.
  //
  // An example name would be:
  // `projects/123`
  // where `123` is the project number (not project ID).
  //
  // The `BatchEnableServices` method currently only supports projects.
  string parent = 1;

  // The identifiers of the services to enable on the project.
  //
  // A valid identifier would be:
  // serviceusage.googleapis.com
  //
  // Enabling services requires that each service is public or is shared with
  // the user enabling the service.
  //
  // Two or more services must be specified. To enable a single service,
  // use the `EnableService` method instead.
  //
  // A single request can enable a maximum of 20 services at a time. If more
  // than 20 services are specified, the request will fail, and no state changes
  // will occur.
  repeated string service_ids = 2;
}

// Request message for ListConsumerQuotaMetrics
message ListConsumerQuotaMetricsRequest {
  // Parent of the quotas resource.
  //
  // Some example names would be:
  // `projects/123/services/serviceconsumermanagement.googleapis.com`
  // `folders/345/services/serviceconsumermanagement.googleapis.com`
  // `organizations/456/services/serviceconsumermanagement.googleapis.com`
  string parent = 1;

  // Requested size of the next page of data.
  int32 page_size = 2;

  // Token identifying which result to start with; returned by a previous list
  // call.
  string page_token = 3;

  // Specifies the level of detail for quota information in the response.
  QuotaView view = 4;
}

// Response message for ListConsumerQuotaMetrics
message ListConsumerQuotaMetricsResponse {
  // Quota settings for the consumer, organized by quota metric.
  repeated ConsumerQuotaMetric metrics = 1;

  // Token identifying which result to start with; returned by a previous list
  // call.
  string next_page_token = 2;
}

// Request message for GetConsumerQuotaMetric
message GetConsumerQuotaMetricRequest {
  // The resource name of the quota limit.
  //
  // An example name would be:
  // `projects/123/services/serviceusage.googleapis.com/quotas/metrics/serviceusage.googleapis.com%2Fmutate_requests`
  string name = 1;

  // Specifies the level of detail for quota information in the response.
  QuotaView view = 2;
}

// Request message for GetConsumerQuotaLimit
message GetConsumerQuotaLimitRequest {
  // The resource name of the quota limit.
  //
  // Use the quota limit resource name returned by previous
  // ListConsumerQuotaMetrics and GetConsumerQuotaMetric API calls.
  string name = 1;

  // Specifies the level of detail for quota information in the response.
  QuotaView view = 2;
}

// Request message for CreateAdminOverride.
message CreateAdminOverrideRequest {
  // The resource name of the parent quota limit, returned by a
  // ListConsumerQuotaMetrics or GetConsumerQuotaMetric call.
  //
  // An example name would be:
  // `projects/123/services/compute.googleapis.com/consumerQuotaMetrics/compute.googleapis.com%2Fcpus/limits/%2Fproject%2Fregion`
  string parent = 1;

  // The admin override to create.
  QuotaOverride override = 2;

  // Whether to force the creation of the quota override.
  // Setting the force parameter to 'true' ignores all quota safety checks that
  // would fail the request. QuotaSafetyCheck lists all such validations.
  bool force = 3;

  // The list of quota safety checks to ignore before the override mutation.
  // Unlike 'force' field that ignores all the quota safety checks, the
  // 'force_only' field ignores only the specified checks; other checks are
  // still enforced. The 'force' and 'force_only' fields cannot both be set.
  repeated QuotaSafetyCheck force_only = 4;
}

// Request message for UpdateAdminOverride.
message UpdateAdminOverrideRequest {
  // The resource name of the override to update.
  //
  // An example name would be:
  // `projects/123/services/compute.googleapis.com/consumerQuotaMetrics/compute.googleapis.com%2Fcpus/limits/%2Fproject%2Fregion/adminOverrides/4a3f2c1d`
  string name = 1;

  // The new override.
  // Only the override_value is updated; all other fields are ignored.
  QuotaOverride override = 2;

  // Whether to force the update of the quota override.
  // Setting the force parameter to 'true' ignores all quota safety checks that
  // would fail the request. QuotaSafetyCheck lists all such validations.
  bool force = 3;

  // Update only the specified fields of the override.
  // If unset, all fields will be updated.
  google.protobuf.FieldMask update_mask = 4;

  // The list of quota safety checks to ignore before the override mutation.
  // Unlike 'force' field that ignores all the quota safety checks, the
  // 'force_only' field ignores only the specified checks; other checks are
  // still enforced. The 'force' and 'force_only' fields cannot both be set.
  repeated QuotaSafetyCheck force_only = 5;
}

// Request message for DeleteAdminOverride.
message DeleteAdminOverrideRequest {
  // The resource name of the override to delete.
  //
  // An example name would be:
  // `projects/123/services/compute.googleapis.com/consumerQuotaMetrics/compute.googleapis.com%2Fcpus/limits/%2Fproject%2Fregion/adminOverrides/4a3f2c1d`
  string name = 1;

  // Whether to force the deletion of the quota override.
  // Setting the force parameter to 'true' ignores all quota safety checks that
  // would fail the request. QuotaSafetyCheck lists all such validations.
  bool force = 2;

  // The list of quota safety checks to ignore before the override mutation.
  // Unlike 'force' field that ignores all the quota safety checks, the
  // 'force_only' field ignores only the specified checks; other checks are
  // still enforced. The 'force' and 'force_only' fields cannot both be set.
  repeated QuotaSafetyCheck force_only = 3;
}

// Request message for ListAdminOverrides
message ListAdminOverridesRequest {
  // The resource name of the parent quota limit, returned by a
  // ListConsumerQuotaMetrics or GetConsumerQuotaMetric call.
  //
  // An example name would be:
  // `projects/123/services/compute.googleapis.com/consumerQuotaMetrics/compute.googleapis.com%2Fcpus/limits/%2Fproject%2Fregion`
  string parent = 1;

  // Requested size of the next page of data.
  int32 page_size = 2;

  // Token identifying which result to start with; returned by a previous list
  // call.
  string page_token = 3;
}

// Response message for ListAdminOverrides.
message ListAdminOverridesResponse {
  // Admin overrides on this limit.
  repeated QuotaOverride overrides = 1;

  // Token identifying which result to start with; returned by a previous list
  // call.
  string next_page_token = 2;
}

// Response message for BatchCreateAdminOverrides
message BatchCreateAdminOverridesResponse {
  // The overrides that were created.
  repeated QuotaOverride overrides = 1;
}

// Request message for ImportAdminOverrides
message ImportAdminOverridesRequest {
  // The resource name of the consumer.
  //
  // An example name would be:
  // `projects/123/services/compute.googleapis.com`
  string parent = 1;

  // Source of import data
  oneof source {
    // The import data is specified in the request message itself
    OverrideInlineSource inline_source = 2;
  }

  // Whether to force the creation of the quota overrides.
  // Setting the force parameter to 'true' ignores all quota safety checks that
  // would fail the request. QuotaSafetyCheck lists all such validations.
  bool force = 3;

  // The list of quota safety checks to ignore before the override mutation.
  // Unlike 'force' field that ignores all the quota safety checks, the
  // 'force_only' field ignores only the specified checks; other checks are
  // still enforced. The 'force' and 'force_only' fields cannot both be set.
  repeated QuotaSafetyCheck force_only = 4;
}

// Response message for ImportAdminOverrides
message ImportAdminOverridesResponse {
  // The overrides that were created from the imported data.
  repeated QuotaOverride overrides = 1;
}

// Metadata message that provides information such as progress,
// partial failures, and similar information on each GetOperation call
// of LRO returned by ImportAdminOverrides.
message ImportAdminOverridesMetadata {}

// Request message for CreateConsumerOverride.
message CreateConsumerOverrideRequest {
  // The resource name of the parent quota limit, returned by a
  // ListConsumerQuotaMetrics or GetConsumerQuotaMetric call.
  //
  // An example name would be:
  // `projects/123/services/compute.googleapis.com/consumerQuotaMetrics/compute.googleapis.com%2Fcpus/limits/%2Fproject%2Fregion`
  string parent = 1;

  // The override to create.
  QuotaOverride override = 2;

  // Whether to force the creation of the quota override.
  // Setting the force parameter to 'true' ignores all quota safety checks that
  // would fail the request. QuotaSafetyCheck lists all such validations.
  bool force = 3;

  // The list of quota safety checks to ignore before the override mutation.
  // Unlike 'force' field that ignores all the quota safety checks, the
  // 'force_only' field ignores only the specified checks; other checks are
  // still enforced. The 'force' and 'force_only' fields cannot both be set.
  repeated QuotaSafetyCheck force_only = 4;
}

// Request message for UpdateConsumerOverride.
message UpdateConsumerOverrideRequest {
  // The resource name of the override to update.
  //
  // An example name would be:
  // `projects/123/services/compute.googleapis.com/consumerQuotaMetrics/compute.googleapis.com%2Fcpus/limits/%2Fproject%2Fregion/consumerOverrides/4a3f2c1d`
  string name = 1;

  // The new override.
  // Only the override_value is updated; all other fields are ignored.
  QuotaOverride override = 2;

  // Whether to force the update of the quota override.
  // Setting the force parameter to 'true' ignores all quota safety checks that
  // would fail the request. QuotaSafetyCheck lists all such validations.
  bool force = 3;

  // Update only the specified fields of the override.
  // If unset, all fields will be updated.
  google.protobuf.FieldMask update_mask = 4;

  // The list of quota safety checks to ignore before the override mutation.
  // Unlike 'force' field that ignores all the quota safety checks, the
  // 'force_only' field ignores only the specified checks; other checks are
  // still enforced. The 'force' and 'force_only' fields cannot both be set.
  repeated QuotaSafetyCheck force_only = 5;
}

// Request message for DeleteConsumerOverride.
message DeleteConsumerOverrideRequest {
  // The resource name of the override to delete.
  //
  // An example name would be:
  // `projects/123/services/compute.googleapis.com/consumerQuotaMetrics/compute.googleapis.com%2Fcpus/limits/%2Fproject%2Fregion/consumerOverrides/4a3f2c1d`
  string name = 1;

  // Whether to force the deletion of the quota override.
  // Setting the force parameter to 'true' ignores all quota safety checks that
  // would fail the request. QuotaSafetyCheck lists all such validations.
  bool force = 2;

  // The list of quota safety checks to ignore before the override mutation.
  // Unlike 'force' field that ignores all the quota safety checks, the
  // 'force_only' field ignores only the specified checks; other checks are
  // still enforced. The 'force' and 'force_only' fields cannot both be set.
  repeated QuotaSafetyCheck force_only = 3;
}

// Request message for ListConsumerOverrides
message ListConsumerOverridesRequest {
  // The resource name of the parent quota limit, returned by a
  // ListConsumerQuotaMetrics or GetConsumerQuotaMetric call.
  //
  // An example name would be:
  // `projects/123/services/compute.googleapis.com/consumerQuotaMetrics/compute.googleapis.com%2Fcpus/limits/%2Fproject%2Fregion`
  string parent = 1;

  // Requested size of the next page of data.
  int32 page_size = 2;

  // Token identifying which result to start with; returned by a previous list
  // call.
  string page_token = 3;
}

// Response message for ListConsumerOverrides.
message ListConsumerOverridesResponse {
  // Consumer overrides on this limit.
  repeated QuotaOverride overrides = 1;

  // Token identifying which result to start with; returned by a previous list
  // call.
  string next_page_token = 2;
}

// Response message for BatchCreateConsumerOverrides
message BatchCreateConsumerOverridesResponse {
  // The overrides that were created.
  repeated QuotaOverride overrides = 1;
}

// Request message for ImportConsumerOverrides
message ImportConsumerOverridesRequest {
  // The resource name of the consumer.
  //
  // An example name would be:
  // `projects/123/services/compute.googleapis.com`
  string parent = 1;

  // Source of import data
  oneof source {
    // The import data is specified in the request message itself
    OverrideInlineSource inline_source = 2;
  }

  // Whether to force the creation of the quota overrides.
  // Setting the force parameter to 'true' ignores all quota safety checks that
  // would fail the request. QuotaSafetyCheck lists all such validations.
  bool force = 3;

  // The list of quota safety checks to ignore before the override mutation.
  // Unlike 'force' field that ignores all the quota safety checks, the
  // 'force_only' field ignores only the specified checks; other checks are
  // still enforced. The 'force' and 'force_only' fields cannot both be set.
  repeated QuotaSafetyCheck force_only = 4;
}

// Response message for ImportConsumerOverrides
message ImportConsumerOverridesResponse {
  // The overrides that were created from the imported data.
  repeated QuotaOverride overrides = 1;
}

// Metadata message that provides information such as progress,
// partial failures, and similar information on each GetOperation call
// of LRO returned by ImportConsumerOverrides.
message ImportConsumerOverridesMetadata {}

// Response message for ImportAdminQuotaPolicies
message ImportAdminQuotaPoliciesResponse {
  // The policies that were created from the imported data.
  repeated AdminQuotaPolicy policies = 1;
}

// Metadata message that provides information such as progress,
// partial failures, and similar information on each GetOperation call
// of LRO returned by ImportAdminQuotaPolicies.
message ImportAdminQuotaPoliciesMetadata {}

// Metadata message that provides information such as progress,
// partial failures, and similar information on each GetOperation call
// of LRO returned by CreateAdminQuotaPolicy.
message CreateAdminQuotaPolicyMetadata {}

// Metadata message that provides information such as progress,
// partial failures, and similar information on each GetOperation call
// of LRO returned by UpdateAdminQuotaPolicy.
message UpdateAdminQuotaPolicyMetadata {}

// Metadata message that provides information such as progress,
// partial failures, and similar information on each GetOperation call
// of LRO returned by DeleteAdminQuotaPolicy.
message DeleteAdminQuotaPolicyMetadata {}

// Request message for generating service identity.
message GenerateServiceIdentityRequest {
  // Name of the consumer and service to generate an identity for.
  //
  // The `GenerateServiceIdentity` methods currently support projects, folders,
  // organizations.
  //
  // Example parents would be:
  // `projects/123/services/example.googleapis.com`
  // `folders/123/services/example.googleapis.com`
  // `organizations/123/services/example.googleapis.com`
  string parent = 1;
}

// Response message for getting service identity.
message GetServiceIdentityResponse {
  // Enum for service identity state.
  enum IdentityState {
    // Default service identity state. This value is used if the state is
    // omitted.
    IDENTITY_STATE_UNSPECIFIED = 0;

    // Service identity has been created and can be used.
    ACTIVE = 1;
  }

  // Service identity that service producer can use to access consumer
  // resources. If exists is true, it contains email and unique_id. If exists is
  // false, it contains pre-constructed email and empty unique_id.
  ServiceIdentity identity = 1;

  // Service identity state.
  IdentityState state = 2;
}

// Metadata for the `GetServiceIdentity` method.
message GetServiceIdentityMetadata {}
