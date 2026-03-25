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

package google.api.cloudquotas.v1;

import "google/api/annotations.proto";
import "google/api/client.proto";
import "google/api/cloudquotas/v1/resources.proto";
import "google/api/field_behavior.proto";
import "google/api/resource.proto";
import "google/protobuf/field_mask.proto";

option csharp_namespace = "Google.Cloud.CloudQuotas.V1";
option go_package = "cloud.google.com/go/cloudquotas/apiv1/cloudquotaspb;cloudquotaspb";
option java_multiple_files = true;
option java_outer_classname = "CloudquotasProto";
option java_package = "com.google.api.cloudquotas.v1";
option php_namespace = "Google\\Cloud\\CloudQuotas\\V1";
option ruby_package = "Google::Cloud::CloudQuotas::V1";
option (google.api.resource_definition) = {
  type: "cloudquotas.googleapis.com/Service"
  pattern: "projects/{project}/locations/{location}/services/{service}"
  pattern: "folders/{folder}/locations/{location}/services/{service}"
  pattern: "organizations/{organization}/locations/{location}/services/{service}"
};
option (google.api.resource_definition) = {
  type: "cloudquotas.googleapis.com/Location"
  pattern: "projects/{project}/locations/{location}"
  pattern: "folders/{folder}/locations/{location}"
  pattern: "organizations/{organization}/locations/{location}"
};

// The Cloud Quotas API is an infrastructure service for Google Cloud that lets
// service consumers list and manage their resource usage limits.
//
// - List/Get the metadata and current status of the quotas for a service.
// - Create/Update quota preferencess that declare the preferred quota values.
// - Check the status of a quota preference request.
// - List/Get pending and historical quota preference.
service CloudQuotas {
  option (google.api.default_host) = "cloudquotas.googleapis.com";
  option (google.api.oauth_scopes) =
      "https://www.googleapis.com/auth/cloud-platform";

  // Lists QuotaInfos of all quotas for a given project, folder or organization.
  rpc ListQuotaInfos(ListQuotaInfosRequest) returns (ListQuotaInfosResponse) {
    option (google.api.http) = {
      get: "/v1/{parent=projects/*/locations/*/services/*}/quotaInfos"
      additional_bindings {
        get: "/v1/{parent=organizations/*/locations/*/services/*}/quotaInfos"
      }
      additional_bindings {
        get: "/v1/{parent=folders/*/locations/*/services/*}/quotaInfos"
      }
    };
    option (google.api.method_signature) = "parent";
  }

  // Retrieve the QuotaInfo of a quota for a project, folder or organization.
  rpc GetQuotaInfo(GetQuotaInfoRequest) returns (QuotaInfo) {
    option (google.api.http) = {
      get: "/v1/{name=projects/*/locations/*/services/*/quotaInfos/*}"
      additional_bindings {
        get: "/v1/{name=organizations/*/locations/*/services/*/quotaInfos/*}"
      }
      additional_bindings {
        get: "/v1/{name=folders/*/locations/*/services/*/quotaInfos/*}"
      }
    };
    option (google.api.method_signature) = "name";
  }

  // Lists QuotaPreferences in a given project, folder or organization.
  rpc ListQuotaPreferences(ListQuotaPreferencesRequest)
      returns (ListQuotaPreferencesResponse) {
    option (google.api.http) = {
      get: "/v1/{parent=projects/*/locations/*}/quotaPreferences"
      additional_bindings {
        get: "/v1/{parent=folders/*/locations/*}/quotaPreferences"
      }
      additional_bindings {
        get: "/v1/{parent=organizations/*/locations/*}/quotaPreferences"
      }
    };
    option (google.api.method_signature) = "parent";
  }

  // Gets details of a single QuotaPreference.
  rpc GetQuotaPreference(GetQuotaPreferenceRequest) returns (QuotaPreference) {
    option (google.api.http) = {
      get: "/v1/{name=projects/*/locations/*/quotaPreferences/*}"
      additional_bindings {
        get: "/v1/{name=organizations/*/locations/*/quotaPreferences/*}"
      }
      additional_bindings {
        get: "/v1/{name=folders/*/locations/*/quotaPreferences/*}"
      }
    };
    option (google.api.method_signature) = "name";
  }

  // Creates a new QuotaPreference that declares the desired value for a quota.
  rpc CreateQuotaPreference(CreateQuotaPreferenceRequest)
      returns (QuotaPreference) {
    option (google.api.http) = {
      post: "/v1/{parent=projects/*/locations/*}/quotaPreferences"
      body: "quota_preference"
      additional_bindings {
        post: "/v1/{parent=folders/*/locations/*}/quotaPreferences"
        body: "quota_preference"
      }
      additional_bindings {
        post: "/v1/{parent=organizations/*/locations/*}/quotaPreferences"
        body: "quota_preference"
      }
    };
    option (google.api.method_signature) =
        "parent,quota_preference,quota_preference_id";
    option (google.api.method_signature) = "parent,quota_preference";
  }

  // Updates the parameters of a single QuotaPreference. It can updates the
  // config in any states, not just the ones pending approval.
  rpc UpdateQuotaPreference(UpdateQuotaPreferenceRequest)
      returns (QuotaPreference) {
    option (google.api.http) = {
      patch: "/v1/{quota_preference.name=projects/*/locations/*/quotaPreferences/*}"
      body: "quota_preference"
      additional_bindings {
        patch: "/v1/{quota_preference.name=folders/*/locations/*/quotaPreferences/*}"
        body: "quota_preference"
      }
      additional_bindings {
        patch: "/v1/{quota_preference.name=organizations/*/locations/*/quotaPreferences/*}"
        body: "quota_preference"
      }
    };
    option (google.api.method_signature) = "quota_preference,update_mask";
  }
}

// Message for requesting list of QuotaInfos
message ListQuotaInfosRequest {
  // Required. Parent value of QuotaInfo resources.
  // Listing across different resource containers (such as 'projects/-') is not
  // allowed.
  //
  // Example names:
  // `projects/123/locations/global/services/compute.googleapis.com`
  // `folders/234/locations/global/services/compute.googleapis.com`
  // `organizations/345/locations/global/services/compute.googleapis.com`
  string parent = 1 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      child_type: "cloudquotas.googleapis.com/QuotaInfo"
    }
  ];

  // Optional. Requested page size. Server may return fewer items than
  // requested. If unspecified, server will pick an appropriate default.
  int32 page_size = 2 [(google.api.field_behavior) = OPTIONAL];

  // Optional. A token identifying a page of results the server should return.
  string page_token = 3 [(google.api.field_behavior) = OPTIONAL];
}

// Message for response to listing QuotaInfos
message ListQuotaInfosResponse {
  // The list of QuotaInfo
  repeated QuotaInfo quota_infos = 1;

  // A token, which can be sent as `page_token` to retrieve the next page.
  // If this field is omitted, there are no subsequent pages.
  string next_page_token = 2;
}

// Message for getting a QuotaInfo
message GetQuotaInfoRequest {
  // Required. The resource name of the quota info.
  //
  // An example name:
  // `projects/123/locations/global/services/compute.googleapis.com/quotaInfos/CpusPerProjectPerRegion`
  string name = 1 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      type: "cloudquotas.googleapis.com/QuotaInfo"
    }
  ];
}

// Message for requesting list of QuotaPreferences
message ListQuotaPreferencesRequest {
  // Required. Parent value of QuotaPreference resources.
  // Listing across different resource containers (such as 'projects/-') is not
  // allowed.
  //
  // When the value starts with 'folders' or 'organizations', it lists the
  // QuotaPreferences for org quotas in the container. It does not list the
  // QuotaPreferences in the descendant projects of the container.
  //
  // Example parents:
  // `projects/123/locations/global`
  string parent = 1 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      child_type: "cloudquotas.googleapis.com/QuotaPreference"
    }
  ];

  // Optional. Requested page size. Server may return fewer items than
  // requested. If unspecified, server will pick an appropriate default.
  int32 page_size = 2 [(google.api.field_behavior) = OPTIONAL];

  // Optional. A token identifying a page of results the server should return.
  string page_token = 3 [(google.api.field_behavior) = OPTIONAL];

  // Optional. Filter result QuotaPreferences by their state, type,
  // create/update time range.
  //
  // Example filters:
  // `reconciling=true AND request_type=CLOUD_CONSOLE`,
  // `reconciling=true OR creation_time>2022-12-03T10:30:00`
  string filter = 4 [(google.api.field_behavior) = OPTIONAL];

  // Optional. How to order of the results. By default, the results are ordered
  // by create time.
  //
  // Example orders:
  // `quota_id`,
  // `service, create_time`
  string order_by = 5 [(google.api.field_behavior) = OPTIONAL];
}

// Message for response to listing QuotaPreferences
message ListQuotaPreferencesResponse {
  // The list of QuotaPreference
  repeated QuotaPreference quota_preferences = 1;

  // A token, which can be sent as `page_token` to retrieve the next page.
  // If this field is omitted, there are no subsequent pages.
  string next_page_token = 2;

  // Locations that could not be reached.
  repeated string unreachable = 3;
}

// Message for getting a QuotaPreference
message GetQuotaPreferenceRequest {
  // Required. Name of the resource
  //
  // Example name:
  // `projects/123/locations/global/quota_preferences/my-config-for-us-east1`
  string name = 1 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      type: "cloudquotas.googleapis.com/QuotaPreference"
    }
  ];
}

// Message for creating a QuotaPreference
message CreateQuotaPreferenceRequest {
  // Required. Value for parent.
  //
  // Example:
  // `projects/123/locations/global`
  string parent = 1 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      child_type: "cloudquotas.googleapis.com/QuotaPreference"
    }
  ];

  // Optional. Id of the requesting object, must be unique under its parent.
  // If client does not set this field, the service will generate one.
  string quota_preference_id = 2 [(google.api.field_behavior) = OPTIONAL];

  // Required. The resource being created
  QuotaPreference quota_preference = 3 [(google.api.field_behavior) = REQUIRED];

  // The list of quota safety checks to be ignored.
  repeated QuotaSafetyCheck ignore_safety_checks = 4;
}

// Message for updating a QuotaPreference
message UpdateQuotaPreferenceRequest {
  // Optional. Field mask is used to specify the fields to be overwritten in the
  // QuotaPreference resource by the update.
  // The fields specified in the update_mask are relative to the resource, not
  // the full request. A field will be overwritten if it is in the mask. If the
  // user does not provide a mask then all fields will be overwritten.
  google.protobuf.FieldMask update_mask = 1
      [(google.api.field_behavior) = OPTIONAL];

  // Required. The resource being updated
  QuotaPreference quota_preference = 2 [(google.api.field_behavior) = REQUIRED];

  // Optional. If set to true, and the quota preference is not found, a new one
  // will be created. In this situation, `update_mask` is ignored.
  bool allow_missing = 3 [(google.api.field_behavior) = OPTIONAL];

  // Optional. If set to true, validate the request, but do not actually update.
  // Note that a request being valid does not mean that the request is
  // guaranteed to be fulfilled.
  bool validate_only = 4 [(google.api.field_behavior) = OPTIONAL];

  // The list of quota safety checks to be ignored.
  repeated QuotaSafetyCheck ignore_safety_checks = 5;
}
