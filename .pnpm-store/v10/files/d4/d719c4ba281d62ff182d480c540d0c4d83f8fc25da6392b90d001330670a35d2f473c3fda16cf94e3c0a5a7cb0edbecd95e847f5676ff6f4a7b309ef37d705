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

import "google/api/auth.proto";
import "google/api/documentation.proto";
import "google/api/endpoint.proto";
import "google/api/monitored_resource.proto";
import "google/api/monitoring.proto";
import "google/api/quota.proto";
import "google/api/resource.proto";
import "google/api/usage.proto";
import "google/protobuf/api.proto";

option csharp_namespace = "Google.Cloud.ServiceUsage.V1";
option go_package = "cloud.google.com/go/serviceusage/apiv1/serviceusagepb;serviceusagepb";
option java_multiple_files = true;
option java_outer_classname = "ResourcesProto";
option java_package = "com.google.api.serviceusage.v1";
option php_namespace = "Google\\Cloud\\ServiceUsage\\V1";
option ruby_package = "Google::Cloud::ServiceUsage::V1";

// A service that is available for use by the consumer.
message Service {
  option (google.api.resource) = {
    type: "serviceusage.googleapis.com/Service"
    pattern: "projects/{project}/services/{service}"
    pattern: "folders/{folder}/services/{service}"
    pattern: "organizations/{organization}/services/{service}"
  };

  // The resource name of the consumer and service.
  //
  // A valid name would be:
  // - projects/123/services/serviceusage.googleapis.com
  string name = 1;

  // The resource name of the consumer.
  //
  // A valid name would be:
  // - projects/123
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
