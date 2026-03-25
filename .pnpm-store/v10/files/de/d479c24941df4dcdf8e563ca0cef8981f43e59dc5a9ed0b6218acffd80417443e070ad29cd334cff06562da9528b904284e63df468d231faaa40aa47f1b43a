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

package google.monitoring.v3;

import "google/api/annotations.proto";
import "google/api/client.proto";
import "google/api/field_behavior.proto";
import "google/api/resource.proto";
import "google/monitoring/v3/uptime.proto";
import "google/protobuf/empty.proto";
import "google/protobuf/field_mask.proto";

option csharp_namespace = "Google.Cloud.Monitoring.V3";
option go_package = "cloud.google.com/go/monitoring/apiv3/v2/monitoringpb;monitoringpb";
option java_multiple_files = true;
option java_outer_classname = "UptimeServiceProto";
option java_package = "com.google.monitoring.v3";
option php_namespace = "Google\\Cloud\\Monitoring\\V3";
option ruby_package = "Google::Cloud::Monitoring::V3";

// The UptimeCheckService API is used to manage (list, create, delete, edit)
// Uptime check configurations in the Cloud Monitoring product. An Uptime
// check is a piece of configuration that determines which resources and
// services to monitor for availability. These configurations can also be
// configured interactively by navigating to the [Cloud console]
// (https://console.cloud.google.com), selecting the appropriate project,
// clicking on "Monitoring" on the left-hand side to navigate to Cloud
// Monitoring, and then clicking on "Uptime".
service UptimeCheckService {
  option (google.api.default_host) = "monitoring.googleapis.com";
  option (google.api.oauth_scopes) =
      "https://www.googleapis.com/auth/cloud-platform,"
      "https://www.googleapis.com/auth/monitoring,"
      "https://www.googleapis.com/auth/monitoring.read";

  // Lists the existing valid Uptime check configurations for the project
  // (leaving out any invalid configurations).
  rpc ListUptimeCheckConfigs(ListUptimeCheckConfigsRequest)
      returns (ListUptimeCheckConfigsResponse) {
    option (google.api.http) = {
      get: "/v3/{parent=projects/*}/uptimeCheckConfigs"
    };
    option (google.api.method_signature) = "parent";
  }

  // Gets a single Uptime check configuration.
  rpc GetUptimeCheckConfig(GetUptimeCheckConfigRequest)
      returns (UptimeCheckConfig) {
    option (google.api.http) = {
      get: "/v3/{name=projects/*/uptimeCheckConfigs/*}"
    };
    option (google.api.method_signature) = "name";
  }

  // Creates a new Uptime check configuration.
  rpc CreateUptimeCheckConfig(CreateUptimeCheckConfigRequest)
      returns (UptimeCheckConfig) {
    option (google.api.http) = {
      post: "/v3/{parent=projects/*}/uptimeCheckConfigs"
      body: "uptime_check_config"
    };
    option (google.api.method_signature) = "parent,uptime_check_config";
  }

  // Updates an Uptime check configuration. You can either replace the entire
  // configuration with a new one or replace only certain fields in the current
  // configuration by specifying the fields to be updated via `updateMask`.
  // Returns the updated configuration.
  rpc UpdateUptimeCheckConfig(UpdateUptimeCheckConfigRequest)
      returns (UptimeCheckConfig) {
    option (google.api.http) = {
      patch: "/v3/{uptime_check_config.name=projects/*/uptimeCheckConfigs/*}"
      body: "uptime_check_config"
    };
    option (google.api.method_signature) = "uptime_check_config";
  }

  // Deletes an Uptime check configuration. Note that this method will fail
  // if the Uptime check configuration is referenced by an alert policy or
  // other dependent configs that would be rendered invalid by the deletion.
  rpc DeleteUptimeCheckConfig(DeleteUptimeCheckConfigRequest)
      returns (google.protobuf.Empty) {
    option (google.api.http) = {
      delete: "/v3/{name=projects/*/uptimeCheckConfigs/*}"
    };
    option (google.api.method_signature) = "name";
  }

  // Returns the list of IP addresses that checkers run from
  rpc ListUptimeCheckIps(ListUptimeCheckIpsRequest)
      returns (ListUptimeCheckIpsResponse) {
    option (google.api.http) = {
      get: "/v3/uptimeCheckIps"
    };
  }
}

// The protocol for the `ListUptimeCheckConfigs` request.
message ListUptimeCheckConfigsRequest {
  // Required. The
  // [project](https://cloud.google.com/monitoring/api/v3#project_name) whose
  // Uptime check configurations are listed. The format is:
  //
  //     projects/[PROJECT_ID_OR_NUMBER]
  string parent = 1 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      child_type: "monitoring.googleapis.com/UptimeCheckConfig"
    }
  ];

  // If provided, this field specifies the criteria that must be met by
  // uptime checks to be included in the response.
  //
  // For more details, see [Filtering
  // syntax](https://cloud.google.com/monitoring/api/v3/sorting-and-filtering#filter_syntax).
  string filter = 2;

  // The maximum number of results to return in a single response. The server
  // may further constrain the maximum number of results returned in a single
  // page. If the page_size is <=0, the server will decide the number of results
  // to be returned.
  int32 page_size = 3;

  // If this field is not empty then it must contain the `nextPageToken` value
  // returned by a previous call to this method.  Using this field causes the
  // method to return more results from the previous method call.
  string page_token = 4;
}

// The protocol for the `ListUptimeCheckConfigs` response.
message ListUptimeCheckConfigsResponse {
  // The returned Uptime check configurations.
  repeated UptimeCheckConfig uptime_check_configs = 1;

  // This field represents the pagination token to retrieve the next page of
  // results. If the value is empty, it means no further results for the
  // request. To retrieve the next page of results, the value of the
  // next_page_token is passed to the subsequent List method call (in the
  // request message's page_token field).
  string next_page_token = 2;

  // The total number of Uptime check configurations for the project,
  // irrespective of any pagination.
  int32 total_size = 3;
}

// The protocol for the `GetUptimeCheckConfig` request.
message GetUptimeCheckConfigRequest {
  // Required. The Uptime check configuration to retrieve. The format is:
  //
  //     projects/[PROJECT_ID_OR_NUMBER]/uptimeCheckConfigs/[UPTIME_CHECK_ID]
  string name = 1 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      type: "monitoring.googleapis.com/UptimeCheckConfig"
    }
  ];
}

// The protocol for the `CreateUptimeCheckConfig` request.
message CreateUptimeCheckConfigRequest {
  // Required. The
  // [project](https://cloud.google.com/monitoring/api/v3#project_name) in which
  // to create the Uptime check. The format is:
  //
  //     projects/[PROJECT_ID_OR_NUMBER]
  string parent = 1 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      child_type: "monitoring.googleapis.com/UptimeCheckConfig"
    }
  ];

  // Required. The new Uptime check configuration.
  UptimeCheckConfig uptime_check_config = 2
      [(google.api.field_behavior) = REQUIRED];
}

// The protocol for the `UpdateUptimeCheckConfig` request.
message UpdateUptimeCheckConfigRequest {
  // Optional. If present, only the listed fields in the current Uptime check
  // configuration are updated with values from the new configuration. If this
  // field is empty, then the current configuration is completely replaced with
  // the new configuration.
  google.protobuf.FieldMask update_mask = 2;

  // Required. If an `updateMask` has been specified, this field gives
  // the values for the set of fields mentioned in the `updateMask`. If an
  // `updateMask` has not been given, this Uptime check configuration replaces
  // the current configuration. If a field is mentioned in `updateMask` but
  // the corresponding field is omitted in this partial Uptime check
  // configuration, it has the effect of deleting/clearing the field from the
  // configuration on the server.
  //
  // The following fields can be updated: `display_name`,
  // `http_check`, `tcp_check`, `timeout`, `content_matchers`, and
  // `selected_regions`.
  UptimeCheckConfig uptime_check_config = 3
      [(google.api.field_behavior) = REQUIRED];
}

// The protocol for the `DeleteUptimeCheckConfig` request.
message DeleteUptimeCheckConfigRequest {
  // Required. The Uptime check configuration to delete. The format is:
  //
  //     projects/[PROJECT_ID_OR_NUMBER]/uptimeCheckConfigs/[UPTIME_CHECK_ID]
  string name = 1 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      type: "monitoring.googleapis.com/UptimeCheckConfig"
    }
  ];
}

// The protocol for the `ListUptimeCheckIps` request.
message ListUptimeCheckIpsRequest {
  // The maximum number of results to return in a single response. The server
  // may further constrain the maximum number of results returned in a single
  // page. If the page_size is <=0, the server will decide the number of results
  // to be returned.
  // NOTE: this field is not yet implemented
  int32 page_size = 2;

  // If this field is not empty then it must contain the `nextPageToken` value
  // returned by a previous call to this method.  Using this field causes the
  // method to return more results from the previous method call.
  // NOTE: this field is not yet implemented
  string page_token = 3;
}

// The protocol for the `ListUptimeCheckIps` response.
message ListUptimeCheckIpsResponse {
  // The returned list of IP addresses (including region and location) that the
  // checkers run from.
  repeated UptimeCheckIp uptime_check_ips = 1;

  // This field represents the pagination token to retrieve the next page of
  // results. If the value is empty, it means no further results for the
  // request. To retrieve the next page of results, the value of the
  // next_page_token is passed to the subsequent List method call (in the
  // request message's page_token field).
  // NOTE: this field is not yet implemented
  string next_page_token = 2;
}
