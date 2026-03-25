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

package google.api.servicemanagement.v1;

import "google/api/annotations.proto";
import "google/api/client.proto";
import "google/api/field_behavior.proto";
import "google/api/service.proto";
import "google/api/servicemanagement/v1/resources.proto";
import "google/longrunning/operations.proto";
import "google/protobuf/any.proto";
import "google/protobuf/empty.proto";

option csharp_namespace = "Google.Cloud.ServiceManagement.V1";
option go_package = "cloud.google.com/go/servicemanagement/apiv1/servicemanagementpb;servicemanagementpb";
option java_multiple_files = true;
option java_outer_classname = "ServiceManagerProto";
option java_package = "com.google.api.servicemanagement.v1";
option objc_class_prefix = "GASM";
option php_namespace = "Google\\Cloud\\ServiceManagement\\V1";
option ruby_package = "Google::Cloud::ServiceManagement::V1";

// [Google Service Management
// API](https://cloud.google.com/service-infrastructure/docs/overview)
service ServiceManager {
  option (google.api.default_host) = "servicemanagement.googleapis.com";
  option (google.api.oauth_scopes) =
      "https://www.googleapis.com/auth/cloud-platform,"
      "https://www.googleapis.com/auth/cloud-platform.read-only,"
      "https://www.googleapis.com/auth/service.management,"
      "https://www.googleapis.com/auth/service.management.readonly";

  // Lists managed services.
  //
  // Returns all public services. For authenticated users, also returns all
  // services the calling user has "servicemanagement.services.get" permission
  // for.
  rpc ListServices(ListServicesRequest) returns (ListServicesResponse) {
    option (google.api.http) = {
      get: "/v1/services"
    };
    option (google.api.method_signature) = "producer_project_id,consumer_id";
  }

  // Gets a managed service. Authentication is required unless the service is
  // public.
  rpc GetService(GetServiceRequest) returns (ManagedService) {
    option (google.api.http) = {
      get: "/v1/services/{service_name}"
    };
    option (google.api.method_signature) = "service_name";
  }

  // Creates a new managed service.
  //
  // A managed service is immutable, and is subject to mandatory 30-day
  // data retention. You cannot move a service or recreate it within 30 days
  // after deletion.
  //
  // One producer project can own no more than 500 services. For security and
  // reliability purposes, a production service should be hosted in a
  // dedicated producer project.
  //
  // Operation<response: ManagedService>
  rpc CreateService(CreateServiceRequest)
      returns (google.longrunning.Operation) {
    option (google.api.http) = {
      post: "/v1/services"
      body: "service"
    };
    option (google.api.method_signature) = "service";
    option (google.longrunning.operation_info) = {
      response_type: "google.api.servicemanagement.v1.ManagedService"
      metadata_type: "google.api.servicemanagement.v1.OperationMetadata"
    };
  }

  // Deletes a managed service. This method will change the service to the
  // `Soft-Delete` state for 30 days. Within this period, service producers may
  // call
  // [UndeleteService][google.api.servicemanagement.v1.ServiceManager.UndeleteService]
  // to restore the service. After 30 days, the service will be permanently
  // deleted.
  //
  // Operation<response: google.protobuf.Empty>
  rpc DeleteService(DeleteServiceRequest)
      returns (google.longrunning.Operation) {
    option (google.api.http) = {
      delete: "/v1/services/{service_name}"
    };
    option (google.api.method_signature) = "service_name";
    option (google.longrunning.operation_info) = {
      response_type: "google.protobuf.Empty"
      metadata_type: "google.api.servicemanagement.v1.OperationMetadata"
    };
  }

  // Revives a previously deleted managed service. The method restores the
  // service using the configuration at the time the service was deleted.
  // The target service must exist and must have been deleted within the
  // last 30 days.
  //
  // Operation<response: UndeleteServiceResponse>
  rpc UndeleteService(UndeleteServiceRequest)
      returns (google.longrunning.Operation) {
    option (google.api.http) = {
      post: "/v1/services/{service_name}:undelete"
    };
    option (google.api.method_signature) = "service_name";
    option (google.longrunning.operation_info) = {
      response_type: "google.api.servicemanagement.v1.UndeleteServiceResponse"
      metadata_type: "google.api.servicemanagement.v1.OperationMetadata"
    };
  }

  // Lists the history of the service configuration for a managed service,
  // from the newest to the oldest.
  rpc ListServiceConfigs(ListServiceConfigsRequest)
      returns (ListServiceConfigsResponse) {
    option (google.api.http) = {
      get: "/v1/services/{service_name}/configs"
    };
    option (google.api.method_signature) = "service_name";
  }

  // Gets a service configuration (version) for a managed service.
  rpc GetServiceConfig(GetServiceConfigRequest) returns (google.api.Service) {
    option (google.api.http) = {
      get: "/v1/services/{service_name}/configs/{config_id}"
      additional_bindings { get: "/v1/services/{service_name}/config" }
    };
    option (google.api.method_signature) = "service_name,config_id,view";
  }

  // Creates a new service configuration (version) for a managed service.
  // This method only stores the service configuration. To roll out the service
  // configuration to backend systems please call
  // [CreateServiceRollout][google.api.servicemanagement.v1.ServiceManager.CreateServiceRollout].
  //
  // Only the 100 most recent service configurations and ones referenced by
  // existing rollouts are kept for each service. The rest will be deleted
  // eventually.
  rpc CreateServiceConfig(CreateServiceConfigRequest)
      returns (google.api.Service) {
    option (google.api.http) = {
      post: "/v1/services/{service_name}/configs"
      body: "service_config"
    };
    option (google.api.method_signature) = "service_name,service_config";
  }

  // Creates a new service configuration (version) for a managed service based
  // on
  // user-supplied configuration source files (for example: OpenAPI
  // Specification). This method stores the source configurations as well as the
  // generated service configuration. To rollout the service configuration to
  // other services,
  // please call
  // [CreateServiceRollout][google.api.servicemanagement.v1.ServiceManager.CreateServiceRollout].
  //
  // Only the 100 most recent configuration sources and ones referenced by
  // existing service configurtions are kept for each service. The rest will be
  // deleted eventually.
  //
  // Operation<response: SubmitConfigSourceResponse>
  rpc SubmitConfigSource(SubmitConfigSourceRequest)
      returns (google.longrunning.Operation) {
    option (google.api.http) = {
      post: "/v1/services/{service_name}/configs:submit"
      body: "*"
    };
    option (google.api.method_signature) =
        "service_name,config_source,validate_only";
    option (google.longrunning.operation_info) = {
      response_type: "google.api.servicemanagement.v1.SubmitConfigSourceResponse"
      metadata_type: "google.api.servicemanagement.v1.OperationMetadata"
    };
  }

  // Lists the history of the service configuration rollouts for a managed
  // service, from the newest to the oldest.
  rpc ListServiceRollouts(ListServiceRolloutsRequest)
      returns (ListServiceRolloutsResponse) {
    option (google.api.http) = {
      get: "/v1/services/{service_name}/rollouts"
    };
    option (google.api.method_signature) = "service_name,filter";
  }

  // Gets a service configuration
  // [rollout][google.api.servicemanagement.v1.Rollout].
  rpc GetServiceRollout(GetServiceRolloutRequest) returns (Rollout) {
    option (google.api.http) = {
      get: "/v1/services/{service_name}/rollouts/{rollout_id}"
    };
    option (google.api.method_signature) = "service_name,rollout_id";
  }

  // Creates a new service configuration rollout. Based on rollout, the
  // Google Service Management will roll out the service configurations to
  // different backend services. For example, the logging configuration will be
  // pushed to Google Cloud Logging.
  //
  // Please note that any previous pending and running Rollouts and associated
  // Operations will be automatically cancelled so that the latest Rollout will
  // not be blocked by previous Rollouts.
  //
  // Only the 100 most recent (in any state) and the last 10 successful (if not
  // already part of the set of 100 most recent) rollouts are kept for each
  // service. The rest will be deleted eventually.
  //
  // Operation<response: Rollout>
  rpc CreateServiceRollout(CreateServiceRolloutRequest)
      returns (google.longrunning.Operation) {
    option (google.api.http) = {
      post: "/v1/services/{service_name}/rollouts"
      body: "rollout"
    };
    option (google.api.method_signature) = "service_name,rollout";
    option (google.longrunning.operation_info) = {
      response_type: "google.api.servicemanagement.v1.Rollout"
      metadata_type: "google.api.servicemanagement.v1.OperationMetadata"
    };
  }

  // Generates and returns a report (errors, warnings and changes from
  // existing configurations) associated with
  // GenerateConfigReportRequest.new_value
  //
  // If GenerateConfigReportRequest.old_value is specified,
  // GenerateConfigReportRequest will contain a single ChangeReport based on the
  // comparison between GenerateConfigReportRequest.new_value and
  // GenerateConfigReportRequest.old_value.
  // If GenerateConfigReportRequest.old_value is not specified, this method
  // will compare GenerateConfigReportRequest.new_value with the last pushed
  // service configuration.
  rpc GenerateConfigReport(GenerateConfigReportRequest)
      returns (GenerateConfigReportResponse) {
    option (google.api.http) = {
      post: "/v1/services:generateConfigReport"
      body: "*"
    };
    option (google.api.method_signature) = "new_config,old_config";
  }
}

// Request message for `ListServices` method.
message ListServicesRequest {
  // Include services produced by the specified project.
  string producer_project_id = 1;

  // The max number of items to include in the response list. Page size is 50
  // if not specified. Maximum value is 500.
  int32 page_size = 5;

  // Token identifying which result to start with; returned by a previous list
  // call.
  string page_token = 6;

  // Include services consumed by the specified consumer.
  //
  // The Google Service Management implementation accepts the following
  // forms:
  // - project:<project_id>
  string consumer_id = 7 [deprecated = true];
}

// Response message for `ListServices` method.
message ListServicesResponse {
  // The returned services will only have the name field set.
  repeated ManagedService services = 1;

  // Token that can be passed to `ListServices` to resume a paginated query.
  string next_page_token = 2;
}

// Request message for `GetService` method.
message GetServiceRequest {
  // Required. The name of the service.  See the `ServiceManager` overview for
  // naming requirements.  For example: `example.googleapis.com`.
  string service_name = 1 [(google.api.field_behavior) = REQUIRED];
}

// Request message for CreateService method.
message CreateServiceRequest {
  // Required. Initial values for the service resource.
  ManagedService service = 1 [(google.api.field_behavior) = REQUIRED];
}

// Request message for DeleteService method.
message DeleteServiceRequest {
  // Required. The name of the service.  See the
  // [overview](https://cloud.google.com/service-management/overview) for naming
  // requirements.  For example: `example.googleapis.com`.
  string service_name = 1 [(google.api.field_behavior) = REQUIRED];
}

// Request message for UndeleteService method.
message UndeleteServiceRequest {
  // Required. The name of the service. See the
  // [overview](https://cloud.google.com/service-management/overview) for naming
  // requirements. For example: `example.googleapis.com`.
  string service_name = 1 [(google.api.field_behavior) = REQUIRED];
}

// Response message for UndeleteService method.
message UndeleteServiceResponse {
  // Revived service resource.
  ManagedService service = 1;
}

// Request message for GetServiceConfig method.
message GetServiceConfigRequest {
  enum ConfigView {
    // Server response includes all fields except SourceInfo.
    BASIC = 0;

    // Server response includes all fields including SourceInfo.
    // SourceFiles are of type 'google.api.servicemanagement.v1.ConfigFile'
    // and are only available for configs created using the
    // SubmitConfigSource method.
    FULL = 1;
  }

  // Required. The name of the service.  See the
  // [overview](https://cloud.google.com/service-management/overview) for naming
  // requirements.  For example: `example.googleapis.com`.
  string service_name = 1 [(google.api.field_behavior) = REQUIRED];

  // Required. The id of the service configuration resource.
  //
  // This field must be specified for the server to return all fields, including
  // `SourceInfo`.
  string config_id = 2 [(google.api.field_behavior) = REQUIRED];

  // Specifies which parts of the Service Config should be returned in the
  // response.
  ConfigView view = 3;
}

// Request message for ListServiceConfigs method.
message ListServiceConfigsRequest {
  // Required. The name of the service.  See the
  // [overview](https://cloud.google.com/service-management/overview) for naming
  // requirements.  For example: `example.googleapis.com`.
  string service_name = 1 [(google.api.field_behavior) = REQUIRED];

  // The token of the page to retrieve.
  string page_token = 2;

  // The max number of items to include in the response list. Page size is 50
  // if not specified. Maximum value is 100.
  int32 page_size = 3;
}

// Response message for ListServiceConfigs method.
message ListServiceConfigsResponse {
  // The list of service configuration resources.
  repeated google.api.Service service_configs = 1;

  // The token of the next page of results.
  string next_page_token = 2;
}

// Request message for CreateServiceConfig method.
message CreateServiceConfigRequest {
  // Required. The name of the service.  See the
  // [overview](https://cloud.google.com/service-management/overview) for naming
  // requirements.  For example: `example.googleapis.com`.
  string service_name = 1 [(google.api.field_behavior) = REQUIRED];

  // Required. The service configuration resource.
  google.api.Service service_config = 2
      [(google.api.field_behavior) = REQUIRED];
}

// Request message for SubmitConfigSource method.
message SubmitConfigSourceRequest {
  // Required. The name of the service.  See the
  // [overview](https://cloud.google.com/service-management/overview) for naming
  // requirements.  For example: `example.googleapis.com`.
  string service_name = 1 [(google.api.field_behavior) = REQUIRED];

  // Required. The source configuration for the service.
  ConfigSource config_source = 2 [(google.api.field_behavior) = REQUIRED];

  // Optional. If set, this will result in the generation of a
  // `google.api.Service` configuration based on the `ConfigSource` provided,
  // but the generated config and the sources will NOT be persisted.
  bool validate_only = 3 [(google.api.field_behavior) = OPTIONAL];
}

// Response message for SubmitConfigSource method.
message SubmitConfigSourceResponse {
  // The generated service configuration.
  google.api.Service service_config = 1;
}

//
// Request message for 'CreateServiceRollout'
message CreateServiceRolloutRequest {
  // Required. The name of the service.  See the
  // [overview](https://cloud.google.com/service-management/overview) for naming
  // requirements.  For example: `example.googleapis.com`.
  string service_name = 1 [(google.api.field_behavior) = REQUIRED];

  // Required. The rollout resource. The `service_name` field is output only.
  Rollout rollout = 2 [(google.api.field_behavior) = REQUIRED];
}

// Request message for 'ListServiceRollouts'
message ListServiceRolloutsRequest {
  // Required. The name of the service.  See the
  // [overview](https://cloud.google.com/service-management/overview) for naming
  // requirements.  For example: `example.googleapis.com`.
  string service_name = 1 [(google.api.field_behavior) = REQUIRED];

  // The token of the page to retrieve.
  string page_token = 2;

  // The max number of items to include in the response list. Page size is 50
  // if not specified. Maximum value is 100.
  int32 page_size = 3;

  // Required. Use `filter` to return subset of rollouts.
  // The following filters are supported:
  //
  //  -- By [status]
  //  [google.api.servicemanagement.v1.Rollout.RolloutStatus]. For example,
  //  `filter='status=SUCCESS'`
  //
  //  -- By [strategy]
  //  [google.api.servicemanagement.v1.Rollout.strategy]. For example,
  //  `filter='strategy=TrafficPercentStrategy'`
  string filter = 4 [(google.api.field_behavior) = REQUIRED];
}

// Response message for ListServiceRollouts method.
message ListServiceRolloutsResponse {
  // The list of rollout resources.
  repeated Rollout rollouts = 1;

  // The token of the next page of results.
  string next_page_token = 2;
}

// Request message for GetServiceRollout method.
message GetServiceRolloutRequest {
  // Required. The name of the service.  See the
  // [overview](https://cloud.google.com/service-management/overview) for naming
  // requirements.  For example: `example.googleapis.com`.
  string service_name = 1 [(google.api.field_behavior) = REQUIRED];

  // Required. The id of the rollout resource.
  string rollout_id = 2 [(google.api.field_behavior) = REQUIRED];
}

// Operation payload for EnableService method.
message EnableServiceResponse {}

// Request message for GenerateConfigReport method.
message GenerateConfigReportRequest {
  // Required. Service configuration for which we want to generate the report.
  // For this version of API, the supported types are
  // [google.api.servicemanagement.v1.ConfigRef][google.api.servicemanagement.v1.ConfigRef],
  // [google.api.servicemanagement.v1.ConfigSource][google.api.servicemanagement.v1.ConfigSource],
  // and [google.api.Service][google.api.Service]
  google.protobuf.Any new_config = 1 [(google.api.field_behavior) = REQUIRED];

  // Optional. Service configuration against which the comparison will be done.
  // For this version of API, the supported types are
  // [google.api.servicemanagement.v1.ConfigRef][google.api.servicemanagement.v1.ConfigRef],
  // [google.api.servicemanagement.v1.ConfigSource][google.api.servicemanagement.v1.ConfigSource],
  // and [google.api.Service][google.api.Service]
  google.protobuf.Any old_config = 2 [(google.api.field_behavior) = OPTIONAL];
}

// Response message for GenerateConfigReport method.
message GenerateConfigReportResponse {
  // Name of the service this report belongs to.
  string service_name = 1;

  // ID of the service configuration this report belongs to.
  string id = 2;

  // list of ChangeReport, each corresponding to comparison between two
  // service configurations.
  repeated ChangeReport change_reports = 3;

  // Errors / Linter warnings associated with the service definition this
  // report
  // belongs to.
  repeated Diagnostic diagnostics = 4;
}
