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

import "google/api/auth.proto";
import "google/api/documentation.proto";
import "google/api/endpoint.proto";
import "google/api/monitored_resource.proto";
import "google/api/monitoring.proto";
import "google/api/quota.proto";
import "google/api/usage.proto";
import "google/protobuf/api.proto";

option csharp_namespace = "Google.Api.ServiceUsage.V1Beta1";
option go_package = "google.golang.org/genproto/googleapis/api/serviceusage/v1beta1;serviceusage";
option java_multiple_files = true;
option java_outer_classname = "ResourcesProto";
option java_package = "com.google.api.serviceusage.v1beta1";
option php_namespace = "Google\\Api\\ServiceUsage\\V1beta1";
option ruby_package = "Google::Api::ServiceUsage::V1beta1";

// A service that is available for use by the consumer.
message Service {
  // The resource name of the consumer and service.
  //
  // A valid name would be:
  // - `projects/123/services/serviceusage.googleapis.com`
  string name = 1;

  // The resource name of the consumer.
  //
  // A valid name would be:
  // - `projects/123`
  string parent = 5;

  // The service configuration of the available service.
  // Some fields may be filtered out of the configuration in responses to
  // the `ListServices` method. These fields are present only in responses to
  // the `GetService` method.
  ServiceConfig config = 2;

  // Whether or not the service has been enabled for use by the consumer.
  State state = 4;
}

// Whether or not a service has been enabled for use by a consumer.
enum State {
  // The default value, which indicates that the enabled state of the service
  // is unspecified or not meaningful. Currently, all consumers other than
  // projects (such as folders and organizations) are always in this state.
  STATE_UNSPECIFIED = 0;

  // The service cannot be used by this consumer. It has either been explicitly
  // disabled, or has never been enabled.
  DISABLED = 1;

  // The service has been explicitly enabled for use by this consumer.
  ENABLED = 2;
}

// The configuration of the service.
message ServiceConfig {
  // The DNS address at which this service is available.
  //
  // An example DNS address would be:
  // `calendar.googleapis.com`.
  string name = 1;

  // The product title for this service.
  string title = 2;

  // A list of API interfaces exported by this service. Contains only the names,
  // versions, and method names of the interfaces.
  repeated google.protobuf.Api apis = 3;

  // Additional API documentation. Contains only the summary and the
  // documentation URL.
  google.api.Documentation documentation = 6;

  // Quota configuration.
  google.api.Quota quota = 10;

  // Auth configuration. Contains only the OAuth rules.
  google.api.Authentication authentication = 11;

  // Configuration controlling usage of this service.
  google.api.Usage usage = 15;

  // Configuration for network endpoints. Contains only the names and aliases
  // of the endpoints.
  repeated google.api.Endpoint endpoints = 18;

  // Defines the monitored resources used by this service. This is required
  // by the [Service.monitoring][google.api.Service.monitoring] and
  // [Service.logging][google.api.Service.logging] configurations.
  repeated google.api.MonitoredResourceDescriptor monitored_resources = 25;

  // Monitoring configuration.
  // This should not include the 'producer_destinations' field.
  google.api.Monitoring monitoring = 28;
}

// The operation metadata returned for the batchend services operation.
message OperationMetadata {
  // The full name of the resources that this operation is directly
  // associated with.
  repeated string resource_names = 2;
}

// Consumer quota settings for a quota metric.
message ConsumerQuotaMetric {
  // The resource name of the quota settings on this metric for this consumer.
  //
  // An example name would be:
  // `projects/123/services/compute.googleapis.com/consumerQuotaMetrics/compute.googleapis.com%2Fcpus`
  //
  // The resource name is intended to be opaque and should not be parsed for
  // its component strings, since its representation could change in the future.
  string name = 1;

  // The name of the metric.
  //
  // An example name would be:
  // `compute.googleapis.com/cpus`
  string metric = 4;

  // The display name of the metric.
  //
  // An example name would be:
  // `CPUs`
  string display_name = 2;

  // The consumer quota for each quota limit defined on the metric.
  repeated ConsumerQuotaLimit consumer_quota_limits = 3;

  // The quota limits targeting the descendant containers of the
  // consumer in request.
  //
  // If the consumer in request is of type `organizations`
  // or `folders`, the field will list per-project limits in the metric; if the
  // consumer in request is of type `project`, the field will be empty.
  //
  // The `quota_buckets` field of each descendant consumer quota limit will not
  // be populated.
  repeated ConsumerQuotaLimit descendant_consumer_quota_limits = 6;

  // The units in which the metric value is reported.
  string unit = 5;
}

// Consumer quota settings for a quota limit.
message ConsumerQuotaLimit {
  // The resource name of the quota limit.
  //
  // An example name would be:
  // `projects/123/services/compute.googleapis.com/consumerQuotaMetrics/compute.googleapis.com%2Fcpus/limits/%2Fproject%2Fregion`
  //
  // The resource name is intended to be opaque and should not be parsed for
  // its component strings, since its representation could change in the future.
  string name = 1;

  // The name of the parent metric of this limit.
  //
  // An example name would be:
  // `compute.googleapis.com/cpus`
  string metric = 8;

  // The limit unit.
  //
  // An example unit would be
  // `1/{project}/{region}`
  // Note that `{project}` and `{region}` are not placeholders in this example;
  // the literal characters `{` and `}` occur in the string.
  string unit = 2;

  // Whether this limit is precise or imprecise.
  bool is_precise = 3;

  // Whether admin overrides are allowed on this limit
  bool allows_admin_overrides = 7;

  // Summary of the enforced quota buckets, organized by quota dimension,
  // ordered from least specific to most specific (for example, the global
  // default bucket, with no quota dimensions, will always appear first).
  repeated QuotaBucket quota_buckets = 9;

  // List of all supported locations.
  // This field is present only if the limit has a {region} or {zone} dimension.
  repeated string supported_locations = 11;
}

// Selected view of quota. Can be used to request more detailed quota
// information when retrieving quota metrics and limits.
enum QuotaView {
  // No quota view specified. Requests that do not specify a quota view will
  // typically default to the BASIC view.
  QUOTA_VIEW_UNSPECIFIED = 0;

  // Only buckets with overrides are shown in the response.
  BASIC = 1;

  // Include per-location buckets even if they do not have overrides.
  // When the view is FULL, and a limit has regional or zonal quota, the limit
  // will include buckets for all regions or zones that could support
  // overrides, even if none are currently present. In some cases this will
  // cause the response to become very large; callers that do not need this
  // extra information should use the BASIC view instead.
  FULL = 2;
}

// A quota bucket is a quota provisioning unit for a specific set of dimensions.
message QuotaBucket {
  // The effective limit of this quota bucket. Equal to default_limit if there
  // are no overrides.
  int64 effective_limit = 1;

  // The default limit of this quota bucket, as specified by the service
  // configuration.
  int64 default_limit = 2;

  // Producer override on this quota bucket.
  QuotaOverride producer_override = 3;

  // Consumer override on this quota bucket.
  QuotaOverride consumer_override = 4;

  // Admin override on this quota bucket.
  QuotaOverride admin_override = 5;

  // Producer policy inherited from the closet ancestor of the current consumer.
  ProducerQuotaPolicy producer_quota_policy = 7;

  // The dimensions of this quota bucket.
  //
  // If this map is empty, this is the global bucket, which is the default quota
  // value applied to all requests that do not have a more specific override.
  //
  // If this map is nonempty, the default limit, effective limit, and quota
  // overrides apply only to requests that have the dimensions given in the map.
  //
  // For example, if the map has key `region` and value `us-east-1`, then the
  // specified effective limit is only effective in that region, and the
  // specified overrides apply only in that region.
  map<string, string> dimensions = 6;
}

// A quota override
message QuotaOverride {
  // The resource name of the override.
  // This name is generated by the server when the override is created.
  //
  // Example names would be:
  // `projects/123/services/compute.googleapis.com/consumerQuotaMetrics/compute.googleapis.com%2Fcpus/limits/%2Fproject%2Fregion/adminOverrides/4a3f2c1d`
  // `projects/123/services/compute.googleapis.com/consumerQuotaMetrics/compute.googleapis.com%2Fcpus/limits/%2Fproject%2Fregion/consumerOverrides/4a3f2c1d`
  //
  // The resource name is intended to be opaque and should not be parsed for
  // its component strings, since its representation could change in the future.
  string name = 1;

  // The overriding quota limit value.
  // Can be any nonnegative integer, or -1 (unlimited quota).
  int64 override_value = 2;

  // If this map is nonempty, then this override applies only to specific values
  // for dimensions defined in the limit unit.
  //
  // For example, an override on a limit with the unit `1/{project}/{region}`
  // could contain an entry with the key `region` and the value `us-east-1`;
  // the override is only applied to quota consumed in that region.
  //
  // This map has the following restrictions:
  //
  // *   Keys that are not defined in the limit's unit are not valid keys.
  //     Any string appearing in `{brackets}` in the unit (besides `{project}`
  //     or
  //     `{user}`) is a defined key.
  // *   `project` is not a valid key; the project is already specified in
  //     the parent resource name.
  // *   `user` is not a valid key; the API does not support quota overrides
  //     that apply only to a specific user.
  // *   If `region` appears as a key, its value must be a valid Cloud region.
  // *   If `zone` appears as a key, its value must be a valid Cloud zone.
  // *   If any valid key other than `region` or `zone` appears in the map, then
  //     all valid keys other than `region` or `zone` must also appear in the
  //     map.
  map<string, string> dimensions = 3;

  // The name of the metric to which this override applies.
  //
  // An example name would be:
  // `compute.googleapis.com/cpus`
  string metric = 4;

  // The limit unit of the limit to which this override applies.
  //
  // An example unit would be:
  // `1/{project}/{region}`
  // Note that `{project}` and `{region}` are not placeholders in this example;
  // the literal characters `{` and `}` occur in the string.
  string unit = 5;

  // The resource name of the ancestor that requested the override. For example:
  // `organizations/12345` or `folders/67890`.
  // Used by admin overrides only.
  string admin_override_ancestor = 6;
}

// Import data embedded in the request message
message OverrideInlineSource {
  // The overrides to create.
  // Each override must have a value for 'metric' and 'unit', to specify
  // which metric and which limit the override should be applied to.
  // The 'name' field of the override does not need to be set; it is ignored.
  repeated QuotaOverride overrides = 1;
}

// Enumerations of quota safety checks.
enum QuotaSafetyCheck {
  // Unspecified quota safety check.
  QUOTA_SAFETY_CHECK_UNSPECIFIED = 0;

  // Validates that a quota mutation would not cause the consumer's effective
  // limit to be lower than the consumer's quota usage.
  LIMIT_DECREASE_BELOW_USAGE = 1;

  // Validates that a quota mutation would not cause the consumer's effective
  // limit to decrease by more than 10 percent.
  LIMIT_DECREASE_PERCENTAGE_TOO_HIGH = 2;
}

// Quota policy created by service producer.
message ProducerQuotaPolicy {
  // The resource name of the policy.
  // This name is generated by the server when the policy is created.
  //
  // Example names would be:
  // `organizations/123/services/compute.googleapis.com/consumerQuotaMetrics/compute.googleapis.com%2Fcpus/limits/%2Fproject%2Fregion/producerQuotaPolicies/4a3f2c1d`
  string name = 1;

  // The quota policy value.
  // Can be any nonnegative integer, or -1 (unlimited quota).
  int64 policy_value = 2;

  //
  // If this map is nonempty, then this policy applies only to specific values
  // for dimensions defined in the limit unit.
  //
  // For example, a policy on a limit with the unit `1/{project}/{region}`
  // could contain an entry with the key `region` and the value `us-east-1`;
  // the policy is only applied to quota consumed in that region.
  //
  // This map has the following restrictions:
  //
  // *   Keys that are not defined in the limit's unit are not valid keys.
  //     Any string appearing in {brackets} in the unit (besides {project} or
  //     {user}) is a defined key.
  // *   `project` is not a valid key; the project is already specified in
  //     the parent resource name.
  // *   `user` is not a valid key; the API does not support quota policies
  //     that apply only to a specific user.
  // *   If `region` appears as a key, its value must be a valid Cloud region.
  // *   If `zone` appears as a key, its value must be a valid Cloud zone.
  // *   If any valid key other than `region` or `zone` appears in the map, then
  //     all valid keys other than `region` or `zone` must also appear in the
  //     map.
  map<string, string> dimensions = 3;

  // The name of the metric to which this policy applies.
  //
  // An example name would be:
  // `compute.googleapis.com/cpus`
  string metric = 4;

  // The limit unit of the limit to which this policy applies.
  //
  // An example unit would be:
  // `1/{project}/{region}`
  // Note that `{project}` and `{region}` are not placeholders in this example;
  // the literal characters `{` and `}` occur in the string.
  string unit = 5;

  // The cloud resource container at which the quota policy is created. The
  // format is `{container_type}/{container_number}`
  string container = 6;
}

// Quota policy created by quota administrator.
message AdminQuotaPolicy {
  // The resource name of the policy.
  // This name is generated by the server when the policy is created.
  //
  // Example names would be:
  // `organizations/123/services/compute.googleapis.com/consumerQuotaMetrics/compute.googleapis.com%2Fcpus/limits/%2Fproject%2Fregion/adminQuotaPolicies/4a3f2c1d`
  string name = 1;

  // The quota policy value.
  // Can be any nonnegative integer, or -1 (unlimited quota).
  int64 policy_value = 2;

  //
  // If this map is nonempty, then this policy applies only to specific values
  // for dimensions defined in the limit unit.
  //
  // For example, a policy on a limit with the unit `1/{project}/{region}`
  // could contain an entry with the key `region` and the value `us-east-1`;
  // the policy is only applied to quota consumed in that region.
  //
  // This map has the following restrictions:
  //
  // *   If `region` appears as a key, its value must be a valid Cloud region.
  // *   If `zone` appears as a key, its value must be a valid Cloud zone.
  // *   Keys other than `region` or `zone` are not valid.
  map<string, string> dimensions = 3;

  // The name of the metric to which this policy applies.
  //
  // An example name would be:
  // `compute.googleapis.com/cpus`
  string metric = 4;

  // The limit unit of the limit to which this policy applies.
  //
  // An example unit would be:
  // `1/{project}/{region}`
  // Note that `{project}` and `{region}` are not placeholders in this example;
  // the literal characters `{` and `}` occur in the string.
  string unit = 5;

  // The cloud resource container at which the quota policy is created. The
  // format is `{container_type}/{container_number}`
  string container = 6;
}

// Service identity for a service. This is the identity that service producer
// should use to access consumer resources.
message ServiceIdentity {
  // The email address of the service account that a service producer would use
  // to access consumer resources.
  string email = 1;

  // The unique and stable id of the service account.
  // https://cloud.google.com/iam/reference/rest/v1/projects.serviceAccounts#ServiceAccount
  string unique_id = 2;
}
