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
import "google/api/resource.proto";
import "google/monitoring/v3/service.proto";
import "google/protobuf/empty.proto";
import "google/protobuf/field_mask.proto";

option csharp_namespace = "Google.Cloud.Monitoring.V3";
option go_package = "cloud.google.com/go/monitoring/apiv3/v2/monitoringpb;monitoringpb";
option java_multiple_files = true;
option java_outer_classname = "ServiceMonitoringServiceProto";
option java_package = "com.google.monitoring.v3";
option php_namespace = "Google\\Cloud\\Monitoring\\V3";
option ruby_package = "Google::Cloud::Monitoring::V3";

// The Cloud Monitoring Service-Oriented Monitoring API has endpoints for
// managing and querying aspects of a workspace's services. These include the
// `Service`'s monitored resources, its Service-Level Objectives, and a taxonomy
// of categorized Health Metrics.
service ServiceMonitoringService {
  option (google.api.default_host) = "monitoring.googleapis.com";
  option (google.api.oauth_scopes) =
      "https://www.googleapis.com/auth/cloud-platform,"
      "https://www.googleapis.com/auth/monitoring,"
      "https://www.googleapis.com/auth/monitoring.read";

  // Create a `Service`.
  rpc CreateService(CreateServiceRequest) returns (Service) {
    option (google.api.http) = {
      post: "/v3/{parent=*/*}/services"
      body: "service"
    };
    option (google.api.method_signature) = "parent,service";
  }

  // Get the named `Service`.
  rpc GetService(GetServiceRequest) returns (Service) {
    option (google.api.http) = {
      get: "/v3/{name=*/*/services/*}"
    };
    option (google.api.method_signature) = "name";
  }

  // List `Service`s for this workspace.
  rpc ListServices(ListServicesRequest) returns (ListServicesResponse) {
    option (google.api.http) = {
      get: "/v3/{parent=*/*}/services"
    };
    option (google.api.method_signature) = "parent";
  }

  // Update this `Service`.
  rpc UpdateService(UpdateServiceRequest) returns (Service) {
    option (google.api.http) = {
      patch: "/v3/{service.name=*/*/services/*}"
      body: "service"
    };
    option (google.api.method_signature) = "service";
  }

  // Soft delete this `Service`.
  rpc DeleteService(DeleteServiceRequest) returns (google.protobuf.Empty) {
    option (google.api.http) = {
      delete: "/v3/{name=*/*/services/*}"
    };
    option (google.api.method_signature) = "name";
  }

  // Create a `ServiceLevelObjective` for the given `Service`.
  rpc CreateServiceLevelObjective(CreateServiceLevelObjectiveRequest) returns (ServiceLevelObjective) {
    option (google.api.http) = {
      post: "/v3/{parent=*/*/services/*}/serviceLevelObjectives"
      body: "service_level_objective"
    };
    option (google.api.method_signature) = "parent,service_level_objective";
  }

  // Get a `ServiceLevelObjective` by name.
  rpc GetServiceLevelObjective(GetServiceLevelObjectiveRequest) returns (ServiceLevelObjective) {
    option (google.api.http) = {
      get: "/v3/{name=*/*/services/*/serviceLevelObjectives/*}"
    };
    option (google.api.method_signature) = "name";
  }

  // List the `ServiceLevelObjective`s for the given `Service`.
  rpc ListServiceLevelObjectives(ListServiceLevelObjectivesRequest) returns (ListServiceLevelObjectivesResponse) {
    option (google.api.http) = {
      get: "/v3/{parent=*/*/services/*}/serviceLevelObjectives"
    };
    option (google.api.method_signature) = "parent";
  }

  // Update the given `ServiceLevelObjective`.
  rpc UpdateServiceLevelObjective(UpdateServiceLevelObjectiveRequest) returns (ServiceLevelObjective) {
    option (google.api.http) = {
      patch: "/v3/{service_level_objective.name=*/*/services/*/serviceLevelObjectives/*}"
      body: "service_level_objective"
    };
    option (google.api.method_signature) = "service_level_objective";
  }

  // Delete the given `ServiceLevelObjective`.
  rpc DeleteServiceLevelObjective(DeleteServiceLevelObjectiveRequest) returns (google.protobuf.Empty) {
    option (google.api.http) = {
      delete: "/v3/{name=*/*/services/*/serviceLevelObjectives/*}"
    };
    option (google.api.method_signature) = "name";
  }
}

// The `CreateService` request.
message CreateServiceRequest {
  // Required. Resource [name](https://cloud.google.com/monitoring/api/v3#project_name) of
  // the parent workspace. The format is:
  //
  //     projects/[PROJECT_ID_OR_NUMBER]
  string parent = 1 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      child_type: "monitoring.googleapis.com/Service"
    }
  ];

  // Optional. The Service id to use for this Service. If omitted, an id will be
  // generated instead. Must match the pattern `[a-z0-9\-]+`
  string service_id = 3;

  // Required. The `Service` to create.
  Service service = 2 [(google.api.field_behavior) = REQUIRED];
}

// The `GetService` request.
message GetServiceRequest {
  // Required. Resource name of the `Service`. The format is:
  //
  //     projects/[PROJECT_ID_OR_NUMBER]/services/[SERVICE_ID]
  string name = 1 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      type: "monitoring.googleapis.com/Service"
    }
  ];
}

// The `ListServices` request.
message ListServicesRequest {
  // Required. Resource name of the parent containing the listed services, either a
  // [project](https://cloud.google.com/monitoring/api/v3#project_name) or a
  // Monitoring Workspace. The formats are:
  //
  //     projects/[PROJECT_ID_OR_NUMBER]
  //     workspaces/[HOST_PROJECT_ID_OR_NUMBER]
  string parent = 1 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      child_type: "monitoring.googleapis.com/Service"
    }
  ];

  // A filter specifying what `Service`s to return. The filter currently
  // supports the following fields:
  //
  //     - `identifier_case`
  //     - `app_engine.module_id`
  //     - `cloud_endpoints.service` (reserved for future use)
  //     - `mesh_istio.mesh_uid`
  //     - `mesh_istio.service_namespace`
  //     - `mesh_istio.service_name`
  //     - `cluster_istio.location` (deprecated)
  //     - `cluster_istio.cluster_name` (deprecated)
  //     - `cluster_istio.service_namespace` (deprecated)
  //     - `cluster_istio.service_name` (deprecated)
  //
  // `identifier_case` refers to which option in the identifier oneof is
  // populated. For example, the filter `identifier_case = "CUSTOM"` would match
  // all services with a value for the `custom` field. Valid options are
  // "CUSTOM", "APP_ENGINE", "MESH_ISTIO", plus "CLUSTER_ISTIO" (deprecated)
  // and "CLOUD_ENDPOINTS" (reserved for future use).
  string filter = 2;

  // A non-negative number that is the maximum number of results to return.
  // When 0, use default page size.
  int32 page_size = 3;

  // If this field is not empty then it must contain the `nextPageToken` value
  // returned by a previous call to this method.  Using this field causes the
  // method to return additional results from the previous method call.
  string page_token = 4;
}

// The `ListServices` response.
message ListServicesResponse {
  // The `Service`s matching the specified filter.
  repeated Service services = 1;

  // If there are more results than have been returned, then this field is set
  // to a non-empty value.  To see the additional results,
  // use that value as `page_token` in the next call to this method.
  string next_page_token = 2;
}

// The `UpdateService` request.
message UpdateServiceRequest {
  // Required. The `Service` to draw updates from.
  // The given `name` specifies the resource to update.
  Service service = 1 [(google.api.field_behavior) = REQUIRED];

  // A set of field paths defining which fields to use for the update.
  google.protobuf.FieldMask update_mask = 2;
}

// The `DeleteService` request.
message DeleteServiceRequest {
  // Required. Resource name of the `Service` to delete. The format is:
  //
  //     projects/[PROJECT_ID_OR_NUMBER]/services/[SERVICE_ID]
  string name = 1 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      type: "monitoring.googleapis.com/Service"
    }
  ];
}

// The `CreateServiceLevelObjective` request.
message CreateServiceLevelObjectiveRequest {
  // Required. Resource name of the parent `Service`. The format is:
  //
  //     projects/[PROJECT_ID_OR_NUMBER]/services/[SERVICE_ID]
  string parent = 1 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      type: "monitoring.googleapis.com/Service"
    }
  ];

  // Optional. The ServiceLevelObjective id to use for this
  // ServiceLevelObjective. If omitted, an id will be generated instead. Must
  // match the pattern `[a-z0-9\-]+`
  string service_level_objective_id = 3;

  // Required. The `ServiceLevelObjective` to create.
  // The provided `name` will be respected if no `ServiceLevelObjective` exists
  // with this name.
  ServiceLevelObjective service_level_objective = 2 [(google.api.field_behavior) = REQUIRED];
}

// The `GetServiceLevelObjective` request.
message GetServiceLevelObjectiveRequest {
  // Required. Resource name of the `ServiceLevelObjective` to get. The format is:
  //
  //     projects/[PROJECT_ID_OR_NUMBER]/services/[SERVICE_ID]/serviceLevelObjectives/[SLO_NAME]
  string name = 1 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      type: "monitoring.googleapis.com/ServiceLevelObjective"
    }
  ];

  // View of the `ServiceLevelObjective` to return. If `DEFAULT`, return the
  // `ServiceLevelObjective` as originally defined. If `EXPLICIT` and the
  // `ServiceLevelObjective` is defined in terms of a `BasicSli`, replace the
  // `BasicSli` with a `RequestBasedSli` spelling out how the SLI is computed.
  ServiceLevelObjective.View view = 2;
}

// The `ListServiceLevelObjectives` request.
message ListServiceLevelObjectivesRequest {
  // Required. Resource name of the parent containing the listed SLOs, either a
  // project or a Monitoring Workspace. The formats are:
  //
  //     projects/[PROJECT_ID_OR_NUMBER]/services/[SERVICE_ID]
  //     workspaces/[HOST_PROJECT_ID_OR_NUMBER]/services/-
  string parent = 1 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      type: "monitoring.googleapis.com/Service"
    }
  ];

  // A filter specifying what `ServiceLevelObjective`s to return.
  string filter = 2;

  // A non-negative number that is the maximum number of results to return.
  // When 0, use default page size.
  int32 page_size = 3;

  // If this field is not empty then it must contain the `nextPageToken` value
  // returned by a previous call to this method.  Using this field causes the
  // method to return additional results from the previous method call.
  string page_token = 4;

  // View of the `ServiceLevelObjective`s to return. If `DEFAULT`, return each
  // `ServiceLevelObjective` as originally defined. If `EXPLICIT` and the
  // `ServiceLevelObjective` is defined in terms of a `BasicSli`, replace the
  // `BasicSli` with a `RequestBasedSli` spelling out how the SLI is computed.
  ServiceLevelObjective.View view = 5;
}

// The `ListServiceLevelObjectives` response.
message ListServiceLevelObjectivesResponse {
  // The `ServiceLevelObjective`s matching the specified filter.
  repeated ServiceLevelObjective service_level_objectives = 1;

  // If there are more results than have been returned, then this field is set
  // to a non-empty value.  To see the additional results,
  // use that value as `page_token` in the next call to this method.
  string next_page_token = 2;
}

// The `UpdateServiceLevelObjective` request.
message UpdateServiceLevelObjectiveRequest {
  // Required. The `ServiceLevelObjective` to draw updates from.
  // The given `name` specifies the resource to update.
  ServiceLevelObjective service_level_objective = 1 [(google.api.field_behavior) = REQUIRED];

  // A set of field paths defining which fields to use for the update.
  google.protobuf.FieldMask update_mask = 2;
}

// The `DeleteServiceLevelObjective` request.
message DeleteServiceLevelObjectiveRequest {
  // Required. Resource name of the `ServiceLevelObjective` to delete. The format is:
  //
  //     projects/[PROJECT_ID_OR_NUMBER]/services/[SERVICE_ID]/serviceLevelObjectives/[SLO_NAME]
  string name = 1 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      type: "monitoring.googleapis.com/ServiceLevelObjective"
    }
  ];
}
