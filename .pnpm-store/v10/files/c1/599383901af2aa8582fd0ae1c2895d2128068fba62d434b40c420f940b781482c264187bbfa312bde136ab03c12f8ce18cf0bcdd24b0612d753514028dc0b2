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

package google.api.serviceusage.v1;

import "google/api/annotations.proto";
import "google/api/client.proto";
import "google/api/serviceusage/v1/resources.proto";
import "google/longrunning/operations.proto";

option csharp_namespace = "Google.Cloud.ServiceUsage.V1";
option go_package = "cloud.google.com/go/serviceusage/apiv1/serviceusagepb;serviceusagepb";
option java_multiple_files = true;
option java_outer_classname = "ServiceUsageProto";
option java_package = "com.google.api.serviceusage.v1";
option php_namespace = "Google\\Cloud\\ServiceUsage\\V1";
option ruby_package = "Google::Cloud::ServiceUsage::V1";

// Enables services that service consumers want to use on Google Cloud Platform,
// lists the available or enabled services, or disables services that service
// consumers no longer use.
//
// See [Service Usage API](https://cloud.google.com/service-usage/docs/overview)
service ServiceUsage {
  option (google.api.default_host) = "serviceusage.googleapis.com";
  option (google.api.oauth_scopes) =
      "https://www.googleapis.com/auth/cloud-platform,"
      "https://www.googleapis.com/auth/cloud-platform.read-only,"
      "https://www.googleapis.com/auth/service.management";

  // Enable a service so that it can be used with a project.
  rpc EnableService(EnableServiceRequest)
      returns (google.longrunning.Operation) {
    option (google.api.http) = {
      post: "/v1/{name=*/*/services/*}:enable"
      body: "*"
    };
    option (google.longrunning.operation_info) = {
      response_type: "EnableServiceResponse"
      metadata_type: "OperationMetadata"
    };
  }

  // Disable a service so that it can no longer be used with a project.
  // This prevents unintended usage that may cause unexpected billing
  // charges or security leaks.
  //
  // It is not valid to call the disable method on a service that is not
  // currently enabled. Callers will receive a `FAILED_PRECONDITION` status if
  // the target service is not currently enabled.
  rpc DisableService(DisableServiceRequest)
      returns (google.longrunning.Operation) {
    option (google.api.http) = {
      post: "/v1/{name=*/*/services/*}:disable"
      body: "*"
    };
    option (google.longrunning.operation_info) = {
      response_type: "DisableServiceResponse"
      metadata_type: "OperationMetadata"
    };
  }

  // Returns the service configuration and enabled state for a given service.
  rpc GetService(GetServiceRequest) returns (Service) {
    option (google.api.http) = {
      get: "/v1/{name=*/*/services/*}"
    };
  }

  // List all services available to the specified project, and the current
  // state of those services with respect to the project. The list includes
  // all public services, all services for which the calling user has the
  // `servicemanagement.services.bind` permission, and all services that have
  // already been enabled on the project. The list can be filtered to
  // only include services in a specific state, for example to only include
  // services enabled on the project.
  //
  // WARNING: If you need to query enabled services frequently or across
  // an organization, you should use
  // [Cloud Asset Inventory
  // API](https://cloud.google.com/asset-inventory/docs/apis), which provides
  // higher throughput and richer filtering capability.
  rpc ListServices(ListServicesRequest) returns (ListServicesResponse) {
    option (google.api.http) = {
      get: "/v1/{parent=*/*}/services"
    };
  }

  // Enable multiple services on a project. The operation is atomic: if enabling
  // any service fails, then the entire batch fails, and no state changes occur.
  // To enable a single service, use the `EnableService` method instead.
  rpc BatchEnableServices(BatchEnableServicesRequest)
      returns (google.longrunning.Operation) {
    option (google.api.http) = {
      post: "/v1/{parent=*/*}/services:batchEnable"
      body: "*"
    };
    option (google.longrunning.operation_info) = {
      response_type: "BatchEnableServicesResponse"
      metadata_type: "OperationMetadata"
    };
  }

  // Returns the service configurations and enabled states for a given list of
  // services.
  rpc BatchGetServices(BatchGetServicesRequest)
      returns (BatchGetServicesResponse) {
    option (google.api.http) = {
      get: "/v1/{parent=*/*}/services:batchGet"
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
  // `projects/123/services/serviceusage.googleapis.com` where `123` is the
  // project number.
  string name = 1;
}

// Response message for the `EnableService` method.
// This response message is assigned to the `response` field of the returned
// Operation when that operation is done.
message EnableServiceResponse {
  // The new state of the service after enabling.
  Service service = 1;
}

// Request message for the `DisableService` method.
message DisableServiceRequest {
  // Enum to determine if service usage should be checked when disabling a
  // service.
  enum CheckIfServiceHasUsage {
    // When unset, the default behavior is used, which is SKIP.
    CHECK_IF_SERVICE_HAS_USAGE_UNSPECIFIED = 0;

    // If set, skip checking service usage when disabling a service.
    SKIP = 1;

    // If set, service usage is checked when disabling the service. If a
    // service, or its dependents, has usage in the last 30 days, the request
    // returns a FAILED_PRECONDITION error.
    CHECK = 2;
  }

  // Name of the consumer and service to disable the service on.
  //
  // The enable and disable methods currently only support projects.
  //
  // An example name would be:
  // `projects/123/services/serviceusage.googleapis.com` where `123` is the
  // project number.
  string name = 1;

  // Indicates if services that are enabled and which depend on this service
  // should also be disabled. If not set, an error will be generated if any
  // enabled services depend on the service to be disabled. When set, the
  // service, and any enabled services that depend on it, will be disabled
  // together.
  bool disable_dependent_services = 2;

  // Defines the behavior for checking service usage when disabling a service.
  CheckIfServiceHasUsage check_if_service_has_usage = 3;
}

// Response message for the `DisableService` method.
// This response message is assigned to the `response` field of the returned
// Operation when that operation is done.
message DisableServiceResponse {
  // The new state of the service after disabling.
  Service service = 1;
}

// Request message for the `GetService` method.
message GetServiceRequest {
  // Name of the consumer and service to get the `ConsumerState` for.
  //
  // An example name would be:
  // `projects/123/services/serviceusage.googleapis.com` where `123` is the
  // project number.
  string name = 1;
}

// Request message for the `ListServices` method.
message ListServicesRequest {
  // Parent to search for services on.
  //
  // An example name would be:
  // `projects/123` where `123` is the project number.
  string parent = 1;

  // Requested size of the next page of data.
  // Requested page size cannot exceed 200.
  // If not set, the default page size is 50.
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
  // `projects/123` where `123` is the project number.
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
  // A single request can enable a maximum of 20 services at a time. If more
  // than 20 services are specified, the request will fail, and no state changes
  // will occur.
  repeated string service_ids = 2;
}

// Response message for the `BatchEnableServices` method.
// This response message is assigned to the `response` field of the returned
// Operation when that operation is done.
message BatchEnableServicesResponse {
  // Provides error messages for the failing services.
  message EnableFailure {
    // The service id of a service that could not be enabled.
    string service_id = 1;

    // An error message describing why the service could not be enabled.
    string error_message = 2;
  }

  // The new state of the services after enabling.
  repeated Service services = 1;

  // If allow_partial_success is true, and one or more services could not be
  // enabled, this field contains the details about each failure.
  repeated EnableFailure failures = 2;
}

// Request message for the `BatchGetServices` method.
message BatchGetServicesRequest {
  // Parent to retrieve services from.
  // If this is set, the parent of all of the services specified in `names` must
  // match this field. An example name would be: `projects/123` where `123` is
  // the project number. The `BatchGetServices` method currently only supports
  // projects.
  string parent = 1;

  // Names of the services to retrieve.
  //
  // An example name would be:
  // `projects/123/services/serviceusage.googleapis.com` where `123` is the
  // project number.
  // A single request can get a maximum of 30 services at a time.
  repeated string names = 2;
}

// Response message for the `BatchGetServices` method.
message BatchGetServicesResponse {
  // The requested Service states.
  repeated Service services = 1;
}
