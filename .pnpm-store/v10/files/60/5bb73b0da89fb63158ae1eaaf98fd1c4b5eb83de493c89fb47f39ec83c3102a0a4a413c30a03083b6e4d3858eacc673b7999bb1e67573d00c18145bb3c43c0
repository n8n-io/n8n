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

import "google/api/field_behavior.proto";
import "google/api/resource.proto";
import "google/protobuf/timestamp.proto";
import "google/protobuf/wrappers.proto";

option csharp_namespace = "Google.Cloud.CloudQuotas.V1";
option go_package = "cloud.google.com/go/cloudquotas/apiv1/cloudquotaspb;cloudquotaspb";
option java_multiple_files = true;
option java_outer_classname = "ResourcesProto";
option java_package = "com.google.api.cloudquotas.v1";
option php_namespace = "Google\\Cloud\\CloudQuotas\\V1";
option ruby_package = "Google::Cloud::CloudQuotas::V1";

// Enumerations of quota safety checks.
enum QuotaSafetyCheck {
  // Unspecified quota safety check.
  QUOTA_SAFETY_CHECK_UNSPECIFIED = 0;

  // Validates that a quota mutation would not cause the consumer's effective
  // limit to be lower than the consumer's quota usage.
  QUOTA_DECREASE_BELOW_USAGE = 1;

  // Validates that a quota mutation would not cause the consumer's effective
  // limit to decrease by more than 10 percent.
  QUOTA_DECREASE_PERCENTAGE_TOO_HIGH = 2;
}

// QuotaInfo represents information about a particular quota for a given
// project, folder or organization.
message QuotaInfo {
  option (google.api.resource) = {
    type: "cloudquotas.googleapis.com/QuotaInfo"
    pattern: "projects/{project}/locations/{location}/services/{service}/quotaInfos/{quota_info}"
    pattern: "folders/{folder}/locations/{location}/services/{service}/quotaInfos/{quota_info}"
    pattern: "organizations/{organization}/locations/{location}/services/{service}/quotaInfos/{quota_info}"
  };

  // The enumeration of the types of a cloud resource container.
  enum ContainerType {
    // Unspecified container type.
    CONTAINER_TYPE_UNSPECIFIED = 0;

    // consumer project
    PROJECT = 1;

    // folder
    FOLDER = 2;

    // organization
    ORGANIZATION = 3;
  }

  // Resource name of this QuotaInfo.
  // The ID component following "locations/" must be "global".
  // Example:
  // `projects/123/locations/global/services/compute.googleapis.com/quotaInfos/CpusPerProjectPerRegion`
  string name = 1;

  // The id of the quota, which is unquie within the service.
  // Example: `CpusPerProjectPerRegion`
  string quota_id = 2;

  // The metric of the quota. It specifies the resources consumption the quota
  // is defined for.
  // Example: `compute.googleapis.com/cpus`
  string metric = 3;

  // The name of the service in which the quota is defined.
  // Example: `compute.googleapis.com`
  string service = 4;

  // Whether this is a precise quota. A precise quota is tracked with absolute
  // precision. In contrast, an imprecise quota is not tracked with precision.
  bool is_precise = 5;

  // The reset time interval for the quota. Refresh interval applies to rate
  // quota only.
  // Example: "minute" for per minute, "day" for per day, or "10 seconds" for
  // every 10 seconds.
  string refresh_interval = 6;

  // The container type of the QuotaInfo.
  ContainerType container_type = 7;

  // The dimensions the quota is defined on.
  repeated string dimensions = 8;

  // The display name of the quota metric
  string metric_display_name = 9;

  // The display name of the quota.
  string quota_display_name = 10;

  // The unit in which the metric value is reported, e.g., "MByte".
  string metric_unit = 11;

  // Whether it is eligible to request a higher quota value for this quota.
  QuotaIncreaseEligibility quota_increase_eligibility = 12;

  // Whether the quota value is fixed or adjustable
  bool is_fixed = 13;

  // The collection of dimensions info ordered by their dimensions from more
  // specific ones to less specific ones.
  repeated DimensionsInfo dimensions_infos = 14;

  // Whether the quota is a concurrent quota. Concurrent quotas are enforced
  // on the total number of concurrent operations in flight at any given time.
  bool is_concurrent = 15;

  // URI to the page where the user can request more quotas for the cloud
  // service, such as
  // https://docs.google.com/spreadsheet/viewform?formkey=abc123&entry_0={email}&entry_1={id}.
  // Google Developers Console UI replace {email} with the current
  // user's e-mail, {id} with the current project number, or organization ID
  // with "organizations/" prefix. For example,
  // https://docs.google.com/spreadsheet/viewform?formkey=abc123&entry_0=johndoe@gmail.com&entry_1=25463754,
  // or
  // https://docs.google.com/spreadsheet/viewform?formkey=abc123&entry_0=johndoe@gmail.com&entry_1=organizations/26474422.
  string service_request_quota_uri = 17;
}

// Eligibility information regarding requesting increase adjustment of a quota.
message QuotaIncreaseEligibility {
  // The enumeration of reasons when it is ineligible to request increase
  // adjustment.
  enum IneligibilityReason {
    // Default value when is_eligible is true.
    INELIGIBILITY_REASON_UNSPECIFIED = 0;

    // The container is not linked with a valid billing account.
    NO_VALID_BILLING_ACCOUNT = 1;

    // Other reasons.
    OTHER = 2;
  }

  // Whether a higher quota value can be requested for the quota.
  bool is_eligible = 1;

  // The reason of why it is ineligible to request increased value of the quota.
  // If the is_eligible field is true, it defaults to
  // INELIGIBILITY_REASON_UNSPECIFIED.
  IneligibilityReason ineligibility_reason = 2;
}

// QuotaPreference represents the preferred quota configuration specified for
// a project, folder or organization. There is only one QuotaPreference
// resource for a quota value targeting a unique set of dimensions.
message QuotaPreference {
  option (google.api.resource) = {
    type: "cloudquotas.googleapis.com/QuotaPreference"
    pattern: "projects/{project}/locations/{location}/quotaPreferences/{quota_preference}"
    pattern: "folders/{folder}/locations/{location}/quotaPreferences/{quota_preference}"
    pattern: "organizations/{organization}/locations/{location}/quotaPreferences/{quota_preference}"
  };

  // Required except in the CREATE requests.
  // The resource name of the quota preference.
  // The ID component following "locations/" must be "global".
  // Example:
  // `projects/123/locations/global/quotaPreferences/my-config-for-us-east1`
  string name = 1;

  // Immutable. The dimensions that this quota preference applies to. The key of
  // the map entry is the name of a dimension, such as "region", "zone",
  // "network_id", and the value of the map entry is the dimension value.
  //
  // If a dimension is missing from the map of dimensions, the quota preference
  // applies to all the dimension values except for those that have other quota
  // preferences configured for the specific value.
  //
  // NOTE: QuotaPreferences can only be applied across all values of "user" and
  // "resource" dimension. Do not set values for "user" or "resource" in the
  // dimension map.
  //
  // Example: {"provider", "Foo Inc"} where "provider" is a service specific
  // dimension.
  map<string, string> dimensions = 2 [(google.api.field_behavior) = IMMUTABLE];

  // Required. Preferred quota configuration.
  QuotaConfig quota_config = 3 [(google.api.field_behavior) = REQUIRED];

  // Optional. The current etag of the quota preference. If an etag is provided
  // on update and does not match the current server's etag of the quota
  // preference, the request will be blocked and an ABORTED error will be
  // returned. See https://google.aip.dev/134#etags for more details on etags.
  string etag = 4 [(google.api.field_behavior) = OPTIONAL];

  // Output only. Create time stamp
  google.protobuf.Timestamp create_time = 5
      [(google.api.field_behavior) = OUTPUT_ONLY];

  // Output only. Update time stamp
  google.protobuf.Timestamp update_time = 6
      [(google.api.field_behavior) = OUTPUT_ONLY];

  // Required. The name of the service to which the quota preference is applied.
  string service = 7 [(google.api.field_behavior) = REQUIRED];

  // Required. The id of the quota to which the quota preference is applied. A
  // quota name is unique in the service. Example: `CpusPerProjectPerRegion`
  string quota_id = 8 [(google.api.field_behavior) = REQUIRED];

  // Output only. Is the quota preference pending Google Cloud approval and
  // fulfillment.
  bool reconciling = 10 [(google.api.field_behavior) = OUTPUT_ONLY];

  // The reason / justification for this quota preference.
  string justification = 11;

  // Required. Input only. An email address that can be used for quota related
  // communication between the Google Cloud and the user in case the Google
  // Cloud needs further information to make a decision on whether the user
  // preferred quota can be granted.
  //
  // The Google account for the email address must have quota update permission
  // for the project, folder or organization this quota preference is for.
  string contact_email = 12 [
    (google.api.field_behavior) = INPUT_ONLY,
    (google.api.field_behavior) = REQUIRED
  ];
}

// The preferred quota configuration.
message QuotaConfig {
  // The enumeration of the origins of quota preference requests.
  enum Origin {
    // The unspecified value.
    ORIGIN_UNSPECIFIED = 0;

    // Created through Cloud Console.
    CLOUD_CONSOLE = 1;

    // Generated by automatic quota adjustment.
    AUTO_ADJUSTER = 2;
  }

  // Required. The preferred value. Must be greater than or equal to -1. If set
  // to -1, it means the value is "unlimited".
  int64 preferred_value = 1 [(google.api.field_behavior) = REQUIRED];

  // Output only. Optional details about the state of this quota preference.
  string state_detail = 2 [(google.api.field_behavior) = OUTPUT_ONLY];

  // Output only. Granted quota value.
  google.protobuf.Int64Value granted_value = 3
      [(google.api.field_behavior) = OUTPUT_ONLY];

  // Output only. The trace id that the Google Cloud uses to provision the
  // requested quota. This trace id may be used by the client to contact Cloud
  // support to track the state of a quota preference request. The trace id is
  // only produced for increase requests and is unique for each request. The
  // quota decrease requests do not have a trace id.
  string trace_id = 4 [(google.api.field_behavior) = OUTPUT_ONLY];

  // Optional. The annotations map for clients to store small amounts of
  // arbitrary data. Do not put PII or other sensitive information here. See
  // https://google.aip.dev/128#annotations
  map<string, string> annotations = 5 [(google.api.field_behavior) = OPTIONAL];

  // Output only. The origin of the quota preference request.
  Origin request_origin = 6 [(google.api.field_behavior) = OUTPUT_ONLY];
}

// The detailed quota information such as effective quota value for a
// combination of dimensions.
message DimensionsInfo {
  // The map of dimensions for this dimensions info. The key of a map entry
  // is "region", "zone" or the name of a service specific dimension, and the
  // value of a map entry is the value of the dimension.  If a dimension does
  // not appear in the map of dimensions, the dimensions info applies to all
  // the dimension values except for those that have another DimenisonInfo
  // instance configured for the specific value.
  // Example: {"provider" : "Foo Inc"} where "provider" is a service specific
  // dimension of a quota.
  map<string, string> dimensions = 1;

  // Quota details for the specified dimensions.
  QuotaDetails details = 2;

  // The applicable regions or zones of this dimensions info. The field will be
  // set to ['global'] for quotas that are not per region or per zone.
  // Otherwise, it will be set to the list of locations this dimension info is
  // applicable to.
  repeated string applicable_locations = 3;
}

// The quota details for a map of dimensions.
message QuotaDetails {
  // The value currently in effect and being enforced.
  int64 value = 1;
}
