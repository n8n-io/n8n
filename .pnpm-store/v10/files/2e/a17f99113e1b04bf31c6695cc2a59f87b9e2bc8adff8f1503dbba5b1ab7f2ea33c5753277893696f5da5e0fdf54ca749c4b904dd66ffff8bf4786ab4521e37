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

package google.api;

import "google/api/auth.proto";
import "google/api/backend.proto";
import "google/api/billing.proto";
import "google/api/client.proto";
import "google/api/context.proto";
import "google/api/control.proto";
import "google/api/documentation.proto";
import "google/api/endpoint.proto";
import "google/api/http.proto";
import "google/api/log.proto";
import "google/api/logging.proto";
import "google/api/metric.proto";
import "google/api/monitored_resource.proto";
import "google/api/monitoring.proto";
import "google/api/quota.proto";
import "google/api/source_info.proto";
import "google/api/system_parameter.proto";
import "google/api/usage.proto";
import "google/protobuf/api.proto";
import "google/protobuf/type.proto";
import "google/protobuf/wrappers.proto";

option go_package = "google.golang.org/genproto/googleapis/api/serviceconfig;serviceconfig";
option java_multiple_files = true;
option java_outer_classname = "ServiceProto";
option java_package = "com.google.api";
option objc_class_prefix = "GAPI";

// `Service` is the root object of Google API service configuration (service
// config). It describes the basic information about a logical service,
// such as the service name and the user-facing title, and delegates other
// aspects to sub-sections. Each sub-section is either a proto message or a
// repeated proto message that configures a specific aspect, such as auth.
// For more information, see each proto message definition.
//
// Example:
//
//     type: google.api.Service
//     name: calendar.googleapis.com
//     title: Google Calendar API
//     apis:
//     - name: google.calendar.v3.Calendar
//
//     visibility:
//       rules:
//       - selector: "google.calendar.v3.*"
//         restriction: PREVIEW
//     backend:
//       rules:
//       - selector: "google.calendar.v3.*"
//         address: calendar.example.com
//
//     authentication:
//       providers:
//       - id: google_calendar_auth
//         jwks_uri: https://www.googleapis.com/oauth2/v1/certs
//         issuer: https://securetoken.google.com
//       rules:
//       - selector: "*"
//         requirements:
//           provider_id: google_calendar_auth
message Service {
  // The service name, which is a DNS-like logical identifier for the
  // service, such as `calendar.googleapis.com`. The service name
  // typically goes through DNS verification to make sure the owner
  // of the service also owns the DNS name.
  string name = 1;

  // The product title for this service, it is the name displayed in Google
  // Cloud Console.
  string title = 2;

  // The Google project that owns this service.
  string producer_project_id = 22;

  // A unique ID for a specific instance of this message, typically assigned
  // by the client for tracking purpose. Must be no longer than 63 characters
  // and only lower case letters, digits, '.', '_' and '-' are allowed. If
  // empty, the server may choose to generate one instead.
  string id = 33;

  // A list of API interfaces exported by this service. Only the `name` field
  // of the [google.protobuf.Api][google.protobuf.Api] needs to be provided by
  // the configuration author, as the remaining fields will be derived from the
  // IDL during the normalization process. It is an error to specify an API
  // interface here which cannot be resolved against the associated IDL files.
  repeated google.protobuf.Api apis = 3;

  // A list of all proto message types included in this API service.
  // Types referenced directly or indirectly by the `apis` are automatically
  // included.  Messages which are not referenced but shall be included, such as
  // types used by the `google.protobuf.Any` type, should be listed here by
  // name by the configuration author. Example:
  //
  //     types:
  //     - name: google.protobuf.Int32
  repeated google.protobuf.Type types = 4;

  // A list of all enum types included in this API service.  Enums referenced
  // directly or indirectly by the `apis` are automatically included.  Enums
  // which are not referenced but shall be included should be listed here by
  // name by the configuration author. Example:
  //
  //     enums:
  //     - name: google.someapi.v1.SomeEnum
  repeated google.protobuf.Enum enums = 5;

  // Additional API documentation.
  Documentation documentation = 6;

  // API backend configuration.
  Backend backend = 8;

  // HTTP configuration.
  Http http = 9;

  // Quota configuration.
  Quota quota = 10;

  // Auth configuration.
  Authentication authentication = 11;

  // Context configuration.
  Context context = 12;

  // Configuration controlling usage of this service.
  Usage usage = 15;

  // Configuration for network endpoints.  If this is empty, then an endpoint
  // with the same name as the service is automatically generated to service all
  // defined APIs.
  repeated Endpoint endpoints = 18;

  // Configuration for the service control plane.
  Control control = 21;

  // Defines the logs used by this service.
  repeated LogDescriptor logs = 23;

  // Defines the metrics used by this service.
  repeated MetricDescriptor metrics = 24;

  // Defines the monitored resources used by this service. This is required
  // by the [Service.monitoring][google.api.Service.monitoring] and
  // [Service.logging][google.api.Service.logging] configurations.
  repeated MonitoredResourceDescriptor monitored_resources = 25;

  // Billing configuration.
  Billing billing = 26;

  // Logging configuration.
  Logging logging = 27;

  // Monitoring configuration.
  Monitoring monitoring = 28;

  // System parameter configuration.
  SystemParameters system_parameters = 29;

  // Output only. The source information for this configuration if available.
  SourceInfo source_info = 37;

  // Settings for [Google Cloud Client
  // libraries](https://cloud.google.com/apis/docs/cloud-client-libraries)
  // generated from APIs defined as protocol buffers.
  Publishing publishing = 45;

  // Obsolete. Do not use.
  //
  // This field has no semantic meaning. The service config compiler always
  // sets this field to `3`.
  google.protobuf.UInt32Value config_version = 20;
}
